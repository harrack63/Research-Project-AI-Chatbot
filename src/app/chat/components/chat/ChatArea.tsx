// components/ChatArea.tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "~/hooks/useChat";
import ChatMessage from "./ChatMessage";
import { useKeyboardShortcut } from "~/hooks/useKeyboardShortcut";
import TextareaAutosize from 'react-textarea-autosize';
import { useAuth } from "~/lib/auth";
import { UploadButton } from "~/utils/uploadthing";
import { ingestUploadedDocument } from "~/utils/utils";
import { toast, Toaster } from "sonner";

const SCROLL_THRESHOLD = 3000;

export default function ChatArea({ chatId }: { chatId?: string }) {
  const { user } = useAuth();
  const userId = user?.id || "";

  const {
    messages,
    isLoading,
    sendMessage,
    stopResponse,
    retryFromUserMessage,
    editUserMessage,
    copyMessage,
  } = useChat(userId, chatId);

  const [input, setInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [dotPosition, setDotPosition] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Animate loading dots
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDotPosition((prev) => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const uiLocked = isLoading || editingMessageId !== null || isUploading;

  const findPrevUserIdForAssistant = useCallback(
    (assistantId: string): string | null => {
      const idx = messages.findIndex((m) => m.id === assistantId);
      if (idx === -1) return null;
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i]?.role === "user") return messages[i]!.id;
      }
      return null;
    },
    [messages]
  );

  const handleEdit = useCallback(
    async (messageId: string, newText: string) => {
      setEditingMessageId(messageId);
      try {
        await editUserMessage(messageId, newText);
      } finally {
        setEditingMessageId(null);
      }
    },
    [editUserMessage]
  );

  const handleSend = async () => {
    if (uiLocked) return;
    if (input.trim()) {
      await sendMessage(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (uiLocked) {
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
      <Toaster position="top-right" theme="dark" richColors />
      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 top-4 overflow-y-auto overflow-x-hidden"
      >
        {/* Messages wrapper */}
        <div className="flex flex-col min-h-full px-6 pt-12 pb-80">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-500">
              <p className="text-sm">Start a conversation...</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl mx-auto w-full">
              {messages.map((message) => (
                <ChatMessage 
                  key={message.id}
                  message={message}
                  uiLocked={uiLocked}
                  onCopy={uiLocked ? undefined : copyMessage}
                  onEdit={
                    message.role === "user"
                      ? async (newText) => {
                          // lock UI while editing submit occurs
                          await handleEdit(message.id, newText);
                        }
                      : undefined
                  }
                  onRetry={
                    message.role === "assistant"
                      ? () => {
                          if (uiLocked) return;
                          const prevUserId =
                            findPrevUserIdForAssistant(message.id);
                          if (!prevUserId) return;
                          return retryFromUserMessage(prevUserId);
                        }
                      : undefined
                  }
                />
              ))}
               {isLoading &&
                // Find the latest assistant message (placeholder added by useChat)
                (() => {
                  const lastAssistant = [...messages]
                    .reverse()
                    .find((m) => m.role === "assistant");
                  // Show dots only while waiting for the first token
                  return !!lastAssistant && lastAssistant.content.length === 0;
                })() && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full bg-slate-400
            ${i <= dotPosition ? "opacity-100" : "opacity-30"}
            transition-opacity duration-300`}
                      />
                    ))}
                  </div>
                </div>
              )}
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
          <div className="flex items-end">
            <UploadButton
              endpoint="documentUploader"
              disabled={isUploading || !userId}
              onBeforeUploadBegin={(files) => {
                const allowedExtensions = [".pdf", ".docx", ".txt"];
                const filtered = files.filter((file) => {
                  const lower = file.name.toLowerCase();
                  return allowedExtensions.some((ext) => lower.endsWith(ext));
                });

                if (filtered.length !== files.length) {
                  toast.error("Only PDF, DOCX, and TXT files are supported.");
                }

                if (!userId) {
                  toast.error("Please sign in to upload documents.");
                  return [];
                }

                if (filtered.length > 0) {
                  setIsUploading(true);
                }

                return filtered;
              }}
              onClientUploadComplete={async (res) => {
                const uploaded = res?.[0];
                const fileUrl = uploaded?.serverData?.fileUrl ?? uploaded?.url;
                const fileName = uploaded?.serverData?.fileName ?? uploaded?.name;
                const fileType = uploaded?.serverData?.fileType ?? uploaded?.customId ?? "";

                if (!fileUrl || !fileName) {
                  toast.error("Upload failed. Please try again.");
                  setIsUploading(false);
                  return;
                }

                const toastId = toast.loading("Indexing document...");
                const result = await ingestUploadedDocument(
                  fileUrl,
                  fileName,
                  fileType || "",
                  userId
                );

                if (!result.ok) {
                  toast.error(result.detail || "Failed to index document.", { id: toastId });
                } else {
                  toast.success(
                    `Document indexed (${result.chunks_indexed ?? 0} chunks).`,
                    { id: toastId }
                  );
                }

                setIsUploading(false);
              }}
              onUploadError={(error) => {
                toast.error(error.message || "Upload failed.");
                setIsUploading(false);
              }}
              appearance={{
                button:
                  "inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 shadow-sm hover:border-slate-500 hover:text-white transition-colors",
                allowedContent: "hidden",
              }}
              content={{
                button: isUploading ? "Uploading..." : "Upload",
              }}
            />
          </div>
          <TextareaAutosize
            ref={textareaRef} // Keep the ref for keyboard shortcuts
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your prompt to the bot..."
            minRows={3}
            maxRows={12} // Limits growth so it doesn't cover the whole screen
            disabled={uiLocked}
            className="flex-1 bg-linear-to-b from-slate-900 to-slate-950 border border-slate-950 text-white placeholder-zinc-500 rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:border-blue-900 resize-none overflow-hidden"
          />
          <button
            onClick={() => (isLoading ? stopResponse() : handleSend())}
            disabled={(uiLocked && !isLoading) || (!isLoading && !input.trim())}
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
