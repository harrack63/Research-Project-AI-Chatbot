// hooks/useChat.ts
import { useState, useCallback, useEffect, useRef } from "react";
import type { ChatImage, Message } from "~/lib/types";
import { useRouter } from "next/navigation";
import { generateUniqueChatId } from "~/lib/chatUtils";
import { createNewChat } from "~/lib/chatStore";
import { sendChatMessageStream } from "~/utils/utils";

const MESSAGES_STORAGE_KEY = "healthbot_messages_";

export function useChat(userId: string, currentChatId?: string) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [images, setImages] = useState<ChatImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Load messages from localStorage on mount
  useEffect(() => {
    if (!currentChatId) {
      setMessages([]);
      return;
    }

    try {
      const stored = localStorage.getItem(
        `${MESSAGES_STORAGE_KEY}${currentChatId}`
      );
      if (stored) {
        const parsedMessages = JSON.parse(stored).map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(parsedMessages);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
    }
  }, [currentChatId]);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateLastMessage = useCallback(
    (content: string | ((prev: string) => string)) => {
      setMessages((prev) => {
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
    []
  );

  const processMessage = useCallback(
    async (userInput: string) => {
      if (!userId) {
        console.error("Attempted to send message without User ID.");
        return; 
      }

      setIsLoading(true);
      const ac = new AbortController();
      abortControllerRef.current = ac;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      addMessage(assistantMessage);

      try {
        await sendChatMessageStream(
          [
            ...messages,
            {
              role: "user",
              content: userInput,
              id: `user-${Date.now()}`,
              timestamp: new Date(),
            },
          ] as Message[],
          userId,
          (token: string): void => {
            updateLastMessage((prev) => prev + token);
          },
          (newImages: ChatImage[]): void => {
            if (newImages && newImages.length > 0) {
              setImages((prev) => [...prev, ...newImages]);
            }
          },
          ac.signal
        );

        if (currentChatId && !ac.signal.aborted) {
          try {
            setMessages((prev) => {
              localStorage.setItem(
                `${MESSAGES_STORAGE_KEY}${currentChatId}`,
                JSON.stringify(
                  prev.map((msg) => ({
                    ...msg,
                    timestamp: msg.timestamp.toISOString(),
                  }))
                )
              );
              return prev;
            });
          } catch (error) {
            console.error("Failed to save messages:", error);
          }
        }
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "AbortError") {
          console.error("Error sending message:", error);
          updateLastMessage("There was an error contacting the server.");
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [addMessage, currentChatId, messages, updateLastMessage]
  );

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      if (!userId) {
        console.error("Attempted to send message without User ID.");
        return; 
      }

      if (!currentChatId) {
        // Create new chat
        const userId = "user-temp";
        const newChatId = generateUniqueChatId(userId);
        const title = userInput.substring(0, 50).split("\n")[0] || "New Chat";
        createNewChat(newChatId, title);

        // Force sidebar update
        window.dispatchEvent(new CustomEvent("chats-updated"));

        // Navigate with state
        router.push(
          `/chat/${newChatId}?firstMessage=${encodeURIComponent(userInput)}`
        );
        return;
      }

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userInput,
        timestamp: new Date(),
      };
      addMessage(userMessage);

      // Process bot response
      await processMessage(userInput);
    },
    [currentChatId, router, processMessage, addMessage]
  );

  const stopResponse = () => {
    abortControllerRef.current?.abort();
  };

  useEffect(() => {
    if (!currentChatId) return;

    const params = new URLSearchParams(window.location.search);
    const firstMessage = params.get("firstMessage");

    if (firstMessage && messages.length === 0) {
      // Clear the URL param
      window.history.replaceState({}, "", `${process.env.NEXT_PUBLIC_CLERK_BASE_PATH || "healthChatbot"}/chat/${currentChatId}`);
      
      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: firstMessage,
        timestamp: new Date(),
      };
      setMessages([userMessage]);

      // Process bot response
      processMessage(firstMessage); // Send raw message, backend handles context
    }
  }, [currentChatId, messages.length, processMessage]);

  return { messages, images, isLoading, sendMessage, stopResponse };
}
