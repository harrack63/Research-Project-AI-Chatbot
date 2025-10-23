export type Chat = {
  id: string;
  label: string;
  chatname: string;
  date: Date;
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