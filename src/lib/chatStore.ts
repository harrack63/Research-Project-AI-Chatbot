import type { ChatCategory } from "~/lib/types";

let globalChats: ChatCategory[] = [];

export function setGlobalChats(chats: ChatCategory[]) {
  globalChats = chats;
}

export function getGlobalChats() {
  return globalChats;
}

export function createNewChat(chatId: string, title: string = "New Chat"): void {
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
}