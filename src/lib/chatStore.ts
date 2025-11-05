// lib/chatStore.ts
import type { ChatCategory, ChatImage } from "~/lib/types";

const STORAGE_KEY = "healthbot_chats";

let globalChats: ChatCategory[] = [];

export function loadChats(): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      globalChats = JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load chats:", error);
    globalChats = [];
  }
}

export function saveChats(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalChats));
  } catch (error) {
    console.error("Failed to save chats:", error);
  }
}

export function setGlobalChats(chats: ChatCategory[]): void {
  globalChats = chats;
  saveChats();
}

export function getGlobalChats(): ChatCategory[] {
  if (globalChats.length === 0) {
    loadChats();
  }
  return globalChats;
}

export function createNewChat(
  chatId: string,
  title: string = "New Chat"
): void {
  const today = "Today";
  const todayCategory = globalChats.find((c) => c.label === today);

  if (todayCategory) {
    todayCategory.chats.unshift({
      id: chatId,
      label: today,
      chatname: title,
      date: new Date(),
    });
  } else {
    globalChats.unshift({
      label: today,
      chats: [
        {
          id: chatId,
          label: today,
          chatname: title,
          date: new Date(),
        },
      ],
    });
  }
  saveChats();
}

export function deleteChat(chatId: string): void {
  const chats = getGlobalChats();

  // Remove from categories
  const updated = chats
    .map((category) => ({
      ...category,
      chats: category.chats.filter((chat) => chat.id !== chatId),
    }))
    .filter((category) => category.chats.length > 0);

  setGlobalChats(updated);

  // ✅ Clear messages from localStorage
  const messagesKey = `${STORAGE_KEY}${chatId}`;
  try {
    localStorage.removeItem(messagesKey);
  } catch (error) {
    console.error(`Failed to delete messages for chat ${chatId}:`, error);
  }
}

export function updateChatImages(
  chatId: string | undefined,
  newImages: ChatImage[]
): void {
  if (!chatId) return;

  globalChats = globalChats.map((category) => ({
    ...category,
    chats: category.chats.map((chat) => {
      if (chat.id === chatId) {
        return {
          ...chat,
          images: [...(chat.images || []), ...newImages],
        };
      }
      return chat;
    }),
  }));
  saveChats();
}
