"use client";

import { useState, useRef, useEffect } from "react";
import ChatList from "./components/ChatList";
import ChatInput from "./components/ChatInput";

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
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      console.log("Sending message to backend");
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });
      console.log("Response from backend", res);
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      const updatedMessages = data.messages || [];
      setMessages(updatedMessages);
    } catch (err) {
      setMessages([
        ...messages,
        { role: "user", content: input },
        { role: "assistant", content: "Sorry, there was an error." },
      ]);
    } finally {
      setLoading(false);
    }
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
