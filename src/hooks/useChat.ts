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

export function useChat(userId: string, currentChatId?: string) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [images, setImages] = useState<ChatImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const messagesRef = useRef<Message[]>([]);

  const inFlightChatIdRef = useRef<string | undefined>(undefined);
  const inFlightUserMsgIdRef = useRef<string | null>(null);

  const setMessagesWithRef = useCallback(
    (updater: Message[] | ((prev: Message[]) => Message[])) => {
      setMessages((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        messagesRef.current = next;
        return next;
      });
    },
    [],
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
          })),
        ),
      );
    } catch (error) {
      console.error("Failed to save messages:", error);
    }
  }, []);

  // Wrapper to persist messages for the in-flight chat if no chatId given
  const persistIfPossible = useCallback(
    (maybeChatId: string | undefined, msgs: Message[]) => {
      const chatId = maybeChatId ?? inFlightChatIdRef.current;
      if (!chatId) return;
      persistMessages(chatId, msgs);
    },
    [persistMessages]
  );

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

  // Load messages from localStorage on mount
  useEffect(() => {
    if (!currentChatId) {
      setMessagesWithRef([]);
      return;
    }

    setMessagesWithRef(loadMessages(currentChatId));
  }, [currentChatId, loadMessages, setMessagesWithRef]);

  const addMessage = useCallback(
    (message: Message) => {
      setMessagesWithRef((prev) => [...prev, message]);
    },
    [setMessagesWithRef],
  );

  const updateLastMessage = useCallback(
    (content: string | ((prev: string) => string)) => {
      setMessagesWithRef((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          const lastMsg = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...lastMsg,
            content:
              typeof content === "function"
                ? content(lastMsg.content)
                : content,
          };
        }
        return updated;
      });
    },
    [setMessagesWithRef],
  );

  const processOutgoing = useCallback(
    async (outgoingMessages: Message[]) => {
      if (!userId) {
        console.error("Attempted to send message without User ID.");
        return;
      }

      setIsLoading(true);
      const ac = new AbortController();
      abortControllerRef.current = ac;

      // capture which chat and which user-msg started the stream
      inFlightChatIdRef.current = currentChatId;
      const lastUser = [...outgoingMessages].reverse().find((m) => m.role === "user");
      inFlightUserMsgIdRef.current = lastUser?.id ?? null;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      addMessage(assistantMessage);

      try {
        await sendChatMessageStream(
          outgoingMessages,
          userId,
          (token: string): void => {
            updateLastMessage((prev) => prev + token);
          },
          (newImages: ChatImage[]): void => {
            if (newImages && newImages.length > 0) {
              setImages((prev) => [...prev, ...newImages]);
            }
          },
          ac.signal,
        );

        if (!ac.signal.aborted) {
          persistIfPossible(currentChatId, messagesRef.current);
        }
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "AbortError") {
          console.error("Error sending message:", error);
          updateLastMessage("There was an error contacting the server.");
          // persist error message too
          persistIfPossible(currentChatId, messagesRef.current);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
        inFlightUserMsgIdRef.current = null;
      }
    },
    [addMessage, currentChatId, persistIfPossible, updateLastMessage, userId],
  );

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      if (!userId) {
        console.error("Attempted to send message without User ID.");
        return;
      }

      if (!currentChatId) {
        // Create new chat and route
        const newChatId = generateUniqueChatId(userId);
        const title = userInput.substring(0, 50).split("\n")[0] || "New Chat";
        createNewChat(newChatId, title);

        window.dispatchEvent(new CustomEvent("chats-updated"));

        setPendingFirstMessage(newChatId, userInput);

        router.push(`/chat?id=${encodeURIComponent(newChatId)}`);
        return;
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userInput,
        timestamp: new Date(),
      };

      const assistantMessage: Message = {
        id: `assistant-${Date.now() + 1}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      // Append to existing thread (do NOT replace whole state)
      const nextMessages = [
        ...messagesRef.current,
        userMessage,
        assistantMessage,
      ];
      setMessagesWithRef(nextMessages);

      // Persist immediately so reload/clicking thread always shows it
      persistMessages(currentChatId, nextMessages);

      // Stream with full context so backend sees the conversation so far.
      // (If you want "last N" only, slice here.)
      processOutgoing([...messagesRef.current, userMessage]);
    },
    [
      currentChatId,
      persistMessages,
      processOutgoing,
      router,
      setMessagesWithRef,
      userId,
    ],
  );

  const stopResponse = () => {
    abortControllerRef.current?.abort();
  };

  useEffect(() => {
    if (!currentChatId) return;
    if (!userId) return;
    if (messages.length > 0) return;

    const pending = popPendingFirstMessage(currentChatId);
    if (!pending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: pending,
      timestamp: new Date(),
    };

    const assistantMessage: Message = {
      id: `assistant-${Date.now() + 1}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    // Render immediately so "Start a conversation..." disappears
    const initial = [userMessage, assistantMessage];
    setMessagesWithRef(initial);

    // Persist immediately so clicking sidebar always loads the first message
    persistMessages(currentChatId, initial);

    // Stream (use the outgoing array the backend expects)
    processOutgoing([userMessage]);
  }, [currentChatId, messages.length, persistMessages, processOutgoing, setMessagesWithRef, userId]);

  const retryFromUserMessage = useCallback(
    async (userMessageId: string) => {
      if (!currentChatId) return;
      if (isLoading) return;

      const idx = messagesRef.current.findIndex((m) => m.id === userMessageId);
      if (idx === -1) return;
      if (messagesRef.current[idx].role !== "user") return;

      // Keep everything up to and including this user message
      const prefix = messagesRef.current.slice(0, idx + 1);

      // Add fresh assistant placeholder
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      const next = [...prefix, assistantMessage];
      setMessagesWithRef(next);
      persistMessages(currentChatId, next);

      // Stream from this point with context = prefix (no assistant)
      await processOutgoing(prefix);
    },
    [currentChatId, isLoading, persistMessages, processOutgoing, setMessagesWithRef]
  );

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

      // Replace content, drop everything after it, then re-run
      const updatedUser: Message = { ...target, content: trimmed, timestamp: new Date() };
      const prefix = [...messagesRef.current.slice(0, idx), updatedUser];

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      const next = [...prefix, assistantMessage];
      setMessagesWithRef(next);
      persistMessages(currentChatId, next);

      await processOutgoing(prefix);
    },
    [currentChatId, isLoading, persistMessages, processOutgoing, setMessagesWithRef]
  );

  const copyMessage = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
    }
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
