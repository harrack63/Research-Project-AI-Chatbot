import React from "react";

type ChatInputProps = {
  input: string;
  setInput: (val: string) => void;
  loading: boolean;
  sendMessage: (e: React.FormEvent) => void;
};

const ChatInput: React.FC<ChatInputProps> = ({ input, setInput, loading, sendMessage }) => (
  <form
    onSubmit={sendMessage}
    className="absolute bottom-0 left-0 w-full flex gap-2 bg-white/95 border-t px-4 py-3"
    style={{ boxShadow: "0 -2px 8px 0 rgba(0, 0, 0, 0.48)" }}
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
);

export default ChatInput; 