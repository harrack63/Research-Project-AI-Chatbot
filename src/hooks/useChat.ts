import { useState, useCallback } from 'react';
import type { Message } from '~/lib/types';
import { useRouter } from 'next/navigation';
import { generateUniqueChatId } from '~/lib/chatUtils';
import { createNewChat, getGlobalChats } from '~/lib/chatStore';

export function useChat(currentChatId?: string) {
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

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      if (!currentChatId) {
        const userId = "user-temp"; // TODO: Replace with actual user ID from auth
        const newChatId = generateUniqueChatId(userId);
        createNewChat(newChatId, "New Chat");
        router.push(`/chat/${newChatId}`);
        return;
      }

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userInput,
        timestamp: new Date(),
      };
      addMessage(userMessage);

      setIsLoading(true);

      // Add empty assistant message for streaming
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      addMessage(assistantMessage);

      try {
        // Simulate streaming from backend (replace with real WebSocket/API call)
        const response =
          "Hi, I'm your classic chat bot";

        // Stream the response character by character
        for (let i = 0; i < response.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 10)); // 30ms per char for demo
          updateLastMessage(response.substring(0, i + 1));
        }
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, updateLastMessage, currentChatId, router]
  );

  return { messages, isLoading, sendMessage };
}