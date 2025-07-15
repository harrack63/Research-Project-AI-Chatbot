"use client";

import { useState, useRef, useEffect } from "react";

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
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });
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
      <div className="flex flex-col w-full max-w-xl h-[80vh] bg-white/90 rounded-xl shadow-xl border relative overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4" style={{ marginBottom: 72 }}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={
                  (m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-2xl rounded-tl-2xl rounded-bl-md"
                    : "bg-gray-100 text-gray-900 rounded-bl-2xl rounded-tr-2xl rounded-br-md") +
                  " px-4 py-2 max-w-[75%] text-base shadow"
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        {/* Input area fixed at bottom */}
        <form
          onSubmit={sendMessage}
          className="absolute bottom-0 left-0 w-full flex gap-2 bg-white/95 border-t px-4 py-3"
          style={{ boxShadow: "0 -2px 8px 0 rgba(0,0,0,0.03)" }}
        >
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            required
            autoFocus
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 transition"
            disabled={loading || !input.trim()}
          >
            {loading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
