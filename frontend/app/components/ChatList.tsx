import React from "react";
import ChatMessage from "./ChatMessage";

type Message = {
  role: string;
  content: string;
};

type ChatListProps = {
  messages: Message[];
  chatEndRef: React.RefObject<HTMLDivElement>;
  loading: boolean;
};

const ChatList: React.FC<ChatListProps> = ({ messages, chatEndRef, loading }) => (
  <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4" style={{ marginBottom: 72 }}>
    {messages.map((m, i) => (
      <ChatMessage key={i} role={m.role} content={m.content} />
    ))}
    {loading && (
      <div className="flex items-center space-x-2 py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500" />
        <span className="text-gray-500">Thinking...</span>
      </div>
    )}
    <div ref={chatEndRef} />
  </div>
);

export default ChatList; 