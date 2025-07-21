import React from "react";
import ReactMarkdown from "react-markdown";

type ChatMessageProps = {
  role: string;
  content: string;
};

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
  return (
    <div className={role === "user" ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          (role === "user"
            ? "bg-blue-600 text-white rounded-br-2xl rounded-tl-2xl rounded-bl-md"
            : "bg-gray-100 text-gray-900 rounded-bl-2xl rounded-tr-2xl rounded-br-md") +
          " px-4 py-2 max-w-[75%] text-base shadow"
        }
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
};

export default ChatMessage; 