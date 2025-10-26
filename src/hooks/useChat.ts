// hooks/useChat.ts
import { useState, useCallback, useEffect, useRef } from "react";
import type { Message } from "~/lib/types";
import { useRouter } from "next/navigation";
import { generateUniqueChatId } from "~/lib/chatUtils";
import { createNewChat } from "~/lib/chatStore";
import { z } from 'zod';
import { sendChatMessage } from "~/utils/utils";

export function useChat(currentChatId?: string) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateLastMessage = useCallback((content: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content,
        };
      }
      return updated;
    });
  }, []);

  // Process Message Schemas
  const MessageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  });

  const ChatResponseSchema = z.object({
    messages: z.array(MessageSchema).optional(),
  });

  const processMessage = useCallback(
    async (userInput: string) => {
      setIsLoading(true);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      addMessage(assistantMessage);

      try {
        const chatResponse = await sendChatMessage([
          ...messages,
          { role: 'user', content: userInput },
        ]);

        // Validate response with Zod
        const validatedResponse = ChatResponseSchema.parse(chatResponse);
        const lastMessage = validatedResponse.messages?.[
          validatedResponse.messages.length - 1
        ];

        if (lastMessage && lastMessage.role === 'assistant') {
          updateLastMessage(lastMessage.content);
        } else {
          updateLastMessage('Sorry, something went wrong with the message.');
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('Invalid response format:', error);
          updateLastMessage(
            'There was an error processing the response.'
          );
        } else {
          console.error('Error sending message:', error);
          updateLastMessage('There was an error contacting the server.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [ChatResponseSchema, addMessage, messages, updateLastMessage]
  );

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

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

  // Handle first message from URL params
  useEffect(() => {
    if (!currentChatId) return;

    const params = new URLSearchParams(window.location.search);
    const firstMessage = params.get("firstMessage");

    if (firstMessage && messages.length === 0) {
      // Clear the URL param
      window.history.replaceState({}, "", `/chat/${currentChatId}`);

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: firstMessage,
        timestamp: new Date(),
      };
      setMessages([userMessage]);

      // Process bot response
      processMessage(firstMessage);
    }
  }, [currentChatId, messages.length, processMessage]);

  return { messages, isLoading, sendMessage, stopResponse };
}
