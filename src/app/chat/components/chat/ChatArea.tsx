"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "~/hooks/useChat";
import ChatMessage from "./ChatMessage";
import { useKeyboardShortcut } from "~/hooks/useKeyboardShortcut";
import { useParams } from "next/navigation";


const SCROLL_THRESHOLD = 3000;

type ChatAreaProps = {
  onFirstResponse?: () => void;
};

export default function ChatArea({ onFirstResponse }: ChatAreaProps) {
  const params = useParams();
  const chatId = params?.id as string | undefined;
  const { messages, isLoading, sendMessage, stopResponse } = useChat(chatId);
  const [input, setInput] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.some((m) => m.role === "assistant") && onFirstResponse) {
      onFirstResponse();
    }
  }, [messages, onFirstResponse]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      setShowScrollButton(distanceFromBottom > SCROLL_THRESHOLD);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  useKeyboardShortcut("arrowdown", scrollToBottom);
  useKeyboardShortcut(".", () => {
    textareaRef.current?.focus();
  });

  const handleSend = async () => {
    if (input.trim()) {
      await sendMessage(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isLoading) {
     e.preventDefault();
     return;
   }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col relative bg-linear-to-b bg-slate-800 overflow-hidden">
      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 top-4 overflow-y-auto overflow-x-hidden"
      >
        {/* Messages wrapper - centered with max width */}
        <div className="flex flex-col min-h-full px-6 pt-12 pb-80">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-500">
              <p className="text-sm">Start a conversation...</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl mx-auto w-full">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 left-1/2 transform -translate-x-1/2 z-20 bg-slate-700 hover:bg-slate-600 text-white rounded-full px-2 py-1 text-xs flex items-center gap-1 transition-colors"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          <span>Jump to bottom</span>
        </button>
      )}

      {/* Fixed input area at bottom */}
      <div className="absolute bottom-0 left-0 right-0 pt-8 pb-6 px-6 z-10">
        <div className="flex gap-3 max-w-2xl mx-auto relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your prompt to the bot..."
            rows={3}
            disabled={isLoading}
            className="flex-1 bg-linear-to-b from-slate-900 to-slate-950 border border-slate-950 text-white placeholder-zinc-500 rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:border-blue-900 resize-none"
          />
          <button
            onClick={() => (isLoading ? stopResponse() : handleSend())}
            disabled={!isLoading && !input.trim()}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isLoading ? (
             <svg
               xmlns="http://www.w3.org/2000/svg"
               width="24"
               height="24"
               viewBox="0 0 24 24"
               fill="currentColor"
               className="lucide lucide-square"
             >
               <rect x="3" y="3" width="18" height="18" rx="2" />
             </svg>
           ) : (
             <svg
               xmlns="http://www.w3.org/2000/svg"
               width="24"
               height="24"
               viewBox="0 0 24 24"
               fill="none"
               stroke="currentColor"
               strokeWidth="2"
               strokeLinecap="round"
               strokeLinejoin="round"
               className="lucide lucide-arrow-up"
             >
               <path d="m5 12 7-7 7 7" />
               <path d="M12 19V5" />
             </svg>
           )}
          </button>
        </div>
      </div>
    </div>
  );
}