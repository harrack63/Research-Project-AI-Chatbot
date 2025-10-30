export type Chat = {
  id: string;
  label: string;
  chatname: string;
  date: Date;
  images?: ChatImage[];
};

export type ChatImage = {
  id: string;
  url: string;
  title: string;
  description: string;
};

export type ChatCategory = {
  label: string;
  chats: Chat[];
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export type ChatResponse = {
  messages: Message[];
  images: ChatImage[];
};