import { useState, useCallback } from "react";
import { getGlobalChats, createNewChat } from "~/lib/chatStore";
import type { ChatCategory } from "~/lib/types";

export function useGlobalChats() {
  const [chats, setChats] = useState<ChatCategory[]>(getGlobalChats);

  const addNewChat = useCallback((title?: string) => {
    const newId = createNewChat(title ?? "");
    // Update local state
    setChats([...getGlobalChats()]);
    return newId;
  }, []);

  return { chats, addNewChat };
}