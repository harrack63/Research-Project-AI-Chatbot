// hooks/useChat.ts
import { useState, useCallback, useEffect } from 'react';
import type { Message } from '~/lib/types';
import { useRouter } from 'next/navigation';
import { generateUniqueChatId } from '~/lib/chatUtils';
import { createNewChat } from '~/lib/chatStore';

export function useChat(currentChatId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInput, setPendingInput] = useState<string>('');
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

  const processMessage = useCallback(
    async (userInput: string) => {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userInput,
        timestamp: new Date(),
      };
      addMessage(userMessage);

      setIsLoading(true);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      addMessage(assistantMessage);

      try {
        const response = "Hi, I'm your classic chat bot"; // Get actual response from here, (j function call to take care of the shit)
        for (let i = 0; i < response.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          updateLastMessage(response.substring(0, i + 1));
        }
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, updateLastMessage]
  );

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      if (!currentChatId) {
        const userId = "user-temp";
        const newChatId = generateUniqueChatId(userId);
        createNewChat(newChatId, "New Chat");
        setPendingInput(userInput);
        router.push(`/chat/${newChatId}`);
        return;
      }

      await processMessage(userInput);
    },
    [currentChatId, router, processMessage]
  );

  // Process pending message after navigation
  useEffect(() => {
    if (currentChatId && pendingInput) {
      const input = pendingInput;
      setPendingInput('');
      processMessage(input);
    }
  }, [currentChatId, pendingInput, processMessage]);

  return { messages, isLoading, sendMessage };
}