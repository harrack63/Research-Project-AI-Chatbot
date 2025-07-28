"use client";

import { useState, useRef, useEffect } from "react";
import ChatList from "./components/ChatList";
import ChatInput from "./components/ChatInput";
import { handleSendMessage } from "./utils";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const currentInput = input; // Store the current input
    setInput(""); // Clear input immediately
    await handleSendMessage(messages, currentInput, setMessages, setLoading);
  }

  return (
    <div className="font-sans min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex flex-col items-center justify-center w-full">
      <div className="flex flex-col w-full max-w-[80vw] h-[80vh] bg-white/90 rounded-xl shadow-xl border relative overflow-hidden">
        {/* Chat area */}
        <ChatList messages={messages} chatEndRef={chatEndRef} loading={loading} />
        {/* Input area fixed at bottom */}
        <ChatInput
          input={input}
          setInput={setInput}
          loading={loading}
          sendMessage={sendMessage}
        />
      </div>
    </div>
  );
}
