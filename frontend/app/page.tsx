"use client";

import { useState, useRef, useEffect } from "react";
import ChatList from "./components/ChatList";
import ChatInput from "./components/ChatInput";
import Navbar from "./components/Navbar";
import LoginModal from "./components/LoginModal";
import { handleSendMessage } from "./utils";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
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
      setShowLoginModal(true);
      return;
    }
    const currentInput = input; // Store the current input
    setInput(""); // Clear input immediately
    await handleSendMessage(messages, currentInput, setMessages, setLoading);
  }

  const handleLogin = (username: string, password: string) => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setMessages([{ role: "assistant", content: "Hi! How can I help you today?" }]);
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
      <Navbar 
        isLoggedIn={isLoggedIn}
        onLoginClick={() => setShowLoginModal(true)}
        onLogoutClick={handleLogout}
      />
      
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

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}
