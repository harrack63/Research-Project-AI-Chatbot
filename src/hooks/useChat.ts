// src/hooks/useChat.ts
import { useState, useCallback, useEffect, useRef } from "react";
import type { ChatImage, Message } from "~/lib/types";
import { useRouter } from "next/navigation";
import { generateUniqueChatId } from "~/lib/chatUtils";
import { createNewChat } from "~/lib/chatStore";
import { sendChatMessageStream } from "~/utils/utils";
import {
  popPendingFirstMessage,
  setPendingFirstMessage,
} from "~/lib/pendingFirstMessage";

const MESSAGES_STORAGE_KEY = "healthbot_messages_";

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useChat(userId: string, currentChatId?: string) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [images, setImages] = useState<ChatImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const messagesRef = useRef<Message[]>([]);
  const inFlightChatIdRef = useRef<string | undefined>(undefined);
  const persistTimerRef = useRef<number | null>(null);

  const setMessagesWithRef = useCallback(
    (updater: Message[] | ((prev: Message[]) => Message[])) => {
      setMessages((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        messagesRef.current = next;
        return next;
      });
    },
    []
  );

  const persistMessages = useCallback((chatId: string, msgs: Message[]) => {
    try {
      localStorage.setItem(
        `${MESSAGES_STORAGE_KEY}${chatId}`,
        JSON.stringify(
          msgs.map((msg) => ({
            ...msg,
            timestamp:
              msg.timestamp instanceof Date
                ? msg.timestamp.toISOString()
                : new Date(msg.timestamp).toISOString(),
          }))
        )
      );
    } catch (error) {
      console.error("Failed to save messages:", error);
    }
  }, []);

  const loadMessages = useCallback((chatId: string): Message[] => {
    try {
      const stored = localStorage.getItem(`${MESSAGES_STORAGE_KEY}${chatId}`);
      if (!stored) return [];
      return JSON.parse(stored).map((msg: Message) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    } catch (error) {
      console.error("Failed to load messages:", error);
      return [];
    }
  }, []);

  const persistIfPossible = useCallback(
    (maybeChatId: string | undefined, msgs: Message[]) => {
      const chatId = maybeChatId ?? inFlightChatIdRef.current;
      if (!chatId) return;
      persistMessages(chatId, msgs);
    },
    [persistMessages]
  );

  const schedulePersist = useCallback(() => {
    if (typeof window === "undefined") return;
    const chatId = currentChatId ?? inFlightChatIdRef.current;
    if (!chatId) return;
    if (persistTimerRef.current !== null) return;

    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      persistMessages(chatId, messagesRef.current);
    }, 500);
  }, [currentChatId, persistMessages]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, []);

  // Load messages for chatId
  useEffect(() => {
    if (!currentChatId) {
      setMessagesWithRef([]);
      return;
    }
    setMessagesWithRef(loadMessages(currentChatId));
  }, [currentChatId, loadMessages, setMessagesWithRef]);

  const updateAssistantById = useCallback(
    (assistantId: string, append: string) => {
      setMessagesWithRef((prev) => {
        const next = prev.map((m) => {
          if (m.id !== assistantId) return m;
          return { ...m, content: m.content + append };
        });
        return next;
      });
      schedulePersist();
    },
    [schedulePersist, setMessagesWithRef]
  );

  const processOutgoing = useCallback(
    async (outgoingMessages: Message[], assistantId: string) => {
      if (!userId) return;

      setIsLoading(true);
      const ac = new AbortController();
      abortControllerRef.current = ac;

      // capture chat for persistence even if route changes mid-stream
      inFlightChatIdRef.current = currentChatId;

      try {
        await sendChatMessageStream(
          outgoingMessages,
          userId,
          (token: string) => updateAssistantById(assistantId, token),
          (newImages: ChatImage[]) => {
            if (newImages && newImages.length > 0) {
              setImages((prev) => [...prev, ...newImages]);
            }
          },
          ac.signal
        );

        if (!ac.signal.aborted) {
          persistIfPossible(currentChatId, messagesRef.current);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          persistIfPossible(currentChatId, messagesRef.current);
        } else {
          console.error("Error sending message:", error);
          // write error into that assistant bubble
          setMessagesWithRef((prev) => {
            const next = prev.map((m) => {
              if (m.id !== assistantId) return m;
              return {
                ...m,
                content: "There was an error contacting the server.",
              };
            });
            return next;
          });
          persistIfPossible(currentChatId, messagesRef.current);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      currentChatId,
      persistIfPossible,
      setMessagesWithRef,
      updateAssistantById,
      userId,
    ]
  );

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;
      if (!userId) return;

      // Creating a new chat: store pending message and navigate
      if (!currentChatId) {
        const newChatId = generateUniqueChatId(userId);
        const title = userInput.substring(0, 50).split("\n")[0] || "New Chat";
        createNewChat(newChatId, title);
        window.dispatchEvent(new CustomEvent("chats-updated"));
        setPendingFirstMessage(newChatId, userInput);
        router.push(`/chat?id=${encodeURIComponent(newChatId)}`);
        return;
      }

      const userMessage: Message = {
        id: uid("user"),
        role: "user",
        content: userInput,
        timestamp: new Date(),
      };

      const assistantId = uid("assistant");
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      const next = [...messagesRef.current, userMessage, assistantMessage];
      setMessagesWithRef(next);
      persistMessages(currentChatId, next);

      await processOutgoing([...messagesRef.current, userMessage], assistantId);
    },
    [
      currentChatId,
      persistMessages,
      processOutgoing,
      router,
      setMessagesWithRef,
      userId,
    ]
  );

  const stopResponse = () => {
    abortControllerRef.current?.abort();
  };

  // Handle pending-first-message after navigation to new chat
  useEffect(() => {
    if (!currentChatId) return;
    if (!userId) return;
    if (messagesRef.current.length > 0) return;

    const pending = popPendingFirstMessage(currentChatId);
    if (!pending) return;

    const userMessage: Message = {
      id: uid("user"),
      role: "user",
      content: pending,
      timestamp: new Date(),
    };

    const assistantId = uid("assistant");
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    const initial = [userMessage, assistantMessage];
    setMessagesWithRef(initial);
    persistMessages(currentChatId, initial);

    processOutgoing([userMessage], assistantId);
  }, [currentChatId, persistMessages, processOutgoing, setMessagesWithRef, userId]);

  // Retry from a specific user message id
  const retryFromUserMessage = useCallback(
    async (userMessageId: string) => {
      if (!currentChatId) return;
      if (isLoading) return;

      const idx = messagesRef.current.findIndex((m) => m.id === userMessageId);
      if (idx === -1) return;
      if (messagesRef.current[idx].role !== "user") return;

      const prefix = messagesRef.current.slice(0, idx + 1);

      const assistantId = uid("assistant");
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      const next = [...prefix, assistantMessage];
      setMessagesWithRef(next);
      persistMessages(currentChatId, next);

      await processOutgoing(prefix, assistantId);
    },
    [currentChatId, isLoading, persistMessages, processOutgoing, setMessagesWithRef]
  );

  // Edit a user message and re-run from that point
  const editUserMessage = useCallback(
    async (userMessageId: string, newContent: string) => {
      if (!currentChatId) return;
      if (isLoading) return;
      const trimmed = newContent.trim();
      if (!trimmed) return;

      const idx = messagesRef.current.findIndex((m) => m.id === userMessageId);
      if (idx === -1) return;
      const target = messagesRef.current[idx];
      if (target.role !== "user") return;

      const updatedUser: Message = {
        ...target,
        content: trimmed,
        timestamp: new Date(),
      };

      const prefix = [...messagesRef.current.slice(0, idx), updatedUser];

      const assistantId = uid("assistant");
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      const next = [...prefix, assistantMessage];
      setMessagesWithRef(next);
      persistMessages(currentChatId, next);

      await processOutgoing(prefix, assistantId);
    },
    [currentChatId, isLoading, persistMessages, processOutgoing, setMessagesWithRef]
  );

  const copyMessage = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
  }, []);

  return {
    messages,
    images,
    isLoading,
    sendMessage,
    stopResponse,
    retryFromUserMessage,
    editUserMessage,
    copyMessage,
  };
}