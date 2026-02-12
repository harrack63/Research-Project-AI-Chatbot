// lib/chatStore.ts
import type { ChatCategory, ChatImage } from "~/lib/types";
import { fetchChats, saveChatsToServer } from "~/lib/api";

const STORAGE_KEY = "healthbot_chats";
const MESSAGES_STORAGE_KEY = "healthbot_messages_";
const STORAGE_META_KEY = "healthbot_chats_meta";

let globalChats: ChatCategory[] = [];

type ChatsMeta = {
  updatedAt: string;
};

function normalizeChats(chats: ChatCategory[]): ChatCategory[] {
  return chats.map((category) => ({
    ...category,
    chats: category.chats.map((chat) => ({
      ...chat,
      date: chat.date instanceof Date ? chat.date : new Date(chat.date),
    })),
  }));
}

function readMeta(): ChatsMeta | null {
  try {
    const raw = localStorage.getItem(STORAGE_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChatsMeta;
  } catch {
    return null;
  }
}

function writeMeta(updatedAt: string): void {
  try {
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify({ updatedAt }));
  } catch {
    // ignore storage errors
  }
}

function getLocalUpdatedAtMs(): number {
  if (typeof window === "undefined") return 0;
  const meta = readMeta();
  if (!meta?.updatedAt) return 0;
  const parsed = Date.parse(meta.updatedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function saveChatsWithMeta(updatedAt?: string, skipServer?: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalChats));
    const nextUpdatedAt = updatedAt ?? new Date().toISOString();
    writeMeta(nextUpdatedAt);
    if (!skipServer) {
      void saveChatsToServer(globalChats, nextUpdatedAt);
    }
  } catch (error) {
    console.error("Failed to save chats:", error);
  }
}

function setGlobalChatsFromServer(chats: ChatCategory[], updatedAt?: string): void {
  globalChats = normalizeChats(chats);
  saveChatsWithMeta(updatedAt, true);
  window.dispatchEvent(new CustomEvent("chats-updated"));
}

export function loadChats(): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ChatCategory[];
      globalChats = normalizeChats(parsed);
    }
  } catch (error) {
    console.error("Failed to load chats:", error);
    globalChats = [];
  }
}

export function saveChats(): void {
  saveChatsWithMeta();
}

export function setGlobalChats(chats: ChatCategory[]): void {
  globalChats = chats;
  saveChats();
}

export async function syncChatsWithServer(): Promise<void> {
  if (typeof window === "undefined") return;

  loadChats();
  const localUpdatedAtMs = getLocalUpdatedAtMs();
  const localHasChats = globalChats.length > 0;

  const res = await fetchChats();
  if (!res.ok) return;

  const serverChats = Array.isArray(res.chats) ? (res.chats as ChatCategory[]) : [];
  const serverHasChats = serverChats.length > 0;
  const serverUpdatedAtMs = res.updated_at ? Date.parse(res.updated_at) : 0;
  const safeServerUpdatedAtMs = Number.isNaN(serverUpdatedAtMs) ? 0 : serverUpdatedAtMs;

  if (serverHasChats && (!localHasChats || safeServerUpdatedAtMs > localUpdatedAtMs)) {
    setGlobalChatsFromServer(serverChats, res.updated_at ?? new Date().toISOString());
    return;
  }

  if (localHasChats && (!serverHasChats || localUpdatedAtMs > safeServerUpdatedAtMs)) {
    const updatedAt = localUpdatedAtMs
      ? new Date(localUpdatedAtMs).toISOString()
      : new Date().toISOString();
    await saveChatsToServer(globalChats, updatedAt);
  }
}

export async function backendChatsAreNewerThanLocal(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const localUpdatedAtMs = getLocalUpdatedAtMs();
  const res = await fetchChats();
  if (!res.ok) return false;

  const serverHasChats = Array.isArray(res.chats) && res.chats.length > 0;
  if (!serverHasChats) return false;

  const serverUpdatedAtMs = res.updated_at ? Date.parse(res.updated_at) : 0;
  const safeServerUpdatedAtMs = Number.isNaN(serverUpdatedAtMs) ? 0 : serverUpdatedAtMs;
  return safeServerUpdatedAtMs > localUpdatedAtMs;
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
  const messagesKey = `${MESSAGES_STORAGE_KEY}${chatId}`;
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

export function chatHasMessages(chatId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(`${MESSAGES_STORAGE_KEY}${chatId}`);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}
