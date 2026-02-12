"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatCategory } from "~/lib/types";
import Link from "next/link";

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  chats: ChatCategory[];
};

export default function SearchModal({
  isOpen,
  onClose,
  chats,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const filteredChats = chats
    .flatMap((category) =>
      category.chats.map((chat) => ({
        ...chat,
        category: category.label,
      }))
    )
    .filter((chat) =>
      chat.chatname.toLowerCase().includes(query.toLowerCase())
    );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-background bg-opacity-30 flex items-start justify-center pt-32 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 bg-opacity-30 rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl animate-scale-in origin-top overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="relative bg-slate-800 p-4">
          <svg
            className="absolute left-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type to search chats..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-800 text-white placeholder-slate-400 pl-12 pr-4 py-3 text-lg focus:outline-none"
          />
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredChats.length > 0 ? (
            <div className="divide-y divide-slate-700">
              {filteredChats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chat?id=${chat.id}`} // Link to chat by ID, not by /[id] because I dont have that page. DO NOT CHANGE.
                  onClick={onClose}
                  className="block hover:bg-slate-800 transitin-colors border-b border-slate-700 last:border-b-0"
                >
                  <div className="px-6 py-4">
                    <p className="text-base font-medium text-white hover:text-blue-300 transition-colors">
                      {chat.chatname}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {chat.category}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-slate-400 text-sm">No chats found</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-in {
           from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}