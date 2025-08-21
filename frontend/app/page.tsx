"use client";

import { useState, useRef, useEffect } from "react";
import ChatList from "./components/ChatList";
import ChatInput from "./components/ChatInput";
import Navbar from "./components/Navbar";
import AuthComponent from "./components/AuthComponent";
import { handleSendMessage } from "./utils";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      return; // AuthComponent will handle showing login modal
    }
    const currentInput = input; // Store the current input
    setInput(""); // Clear input immediately
    await handleSendMessage(messages, currentInput, setMessages, setLoading);
  }

  const handleAuthStateChange = (loggedIn: boolean, user?: any) => {
    setIsLoggedIn(loggedIn);
    setUserData(user || null);
    
    if (!loggedIn) {
      // Reset chat when user logs out
      setMessages([{ role: "assistant", content: "Hi! How can I help you today?" }]);
    }
  };

  if (!isClient) {
    return (
      <div className="font-sans min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex flex-col">
      <div className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Health Chatbot</h1>
        <AuthComponent onAuthStateChange={handleAuthStateChange} />
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col w-full max-w-[80vw] h-[80vh] bg-white/90 rounded-xl shadow-xl border relative overflow-hidden">
          {/* Chat area */}
          <ChatList messages={messages} chatEndRef={chatEndRef} loading={loading} />
          {/* Input area fixed at bottom */}
          <ChatInput
            input={input}
            setInput={setInput}
            loading={loading}
            sendMessage={sendMessage}
            disabled={!isLoggedIn}
            placeholder={!isLoggedIn ? "Please login to start chatting..." : "Type your message..."}
          />
        </div>
      </div>
    </div>
  );
}
