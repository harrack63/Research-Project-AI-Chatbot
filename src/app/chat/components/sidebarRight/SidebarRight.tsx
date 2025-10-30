// app/chat/components/sidebarRight/SidebarRight.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getGlobalChats } from "~/lib/chatStore";
import type { ChatImage } from "~/lib/types";
import { ChevronRight, ChevronLeft } from "lucide-react";
import Image from "next/image";
import ImageModal from "./ImageModel";

type SidebarRightProps = {
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
};

function loadImagesForChat(chatId: string | undefined): ChatImage[] {
  if (!chatId) return [];
  const chats = getGlobalChats();
  const chat = chats.flatMap((c) => c.chats).find((c) => c.id === chatId);
  return chat?.images || [];
}

export default function SidebarRight({
  isOpen,
  onToggle,
  width,
  onWidthChange,
}: SidebarRightProps) {
  const [selectedImage, setSelectedImage] = useState<ChatImage | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const params = useParams();
  const chatId = params?.id as string | undefined;

  // Initialize images with lazy initializer
  const [images, setImages] = useState<ChatImage[]>(() =>
    loadImagesForChat(chatId)
  );

  // Update images when chatId changes
  useEffect(() => {
    setImages(loadImagesForChat(chatId));
  }, [chatId]);

  // Listen for global chat updates (when new images are added via backend)
  useEffect(() => {
    const handleChatsUpdate = () => {
      setImages(loadImagesForChat(chatId));
    };

    window.addEventListener("chats-updated", handleChatsUpdate);
    return () => window.removeEventListener("chats-updated", handleChatsUpdate);
  }, [chatId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth * 0.6;
      const minWidth = 300;
      onWidthChange(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  const columns = width >= 600 ? 2 : 1;
  const showDragHandle = !isOpen && chatId;

  return (
    <>
      {/* Drag handle when sidebar is closed */}
      {showDragHandle && (
        <div className="fixed right-2 top-4 z-40">
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggle();
            }}
            className="bg-blue-600 hover:bg-blue-500 transition-all p-1.5 rounded-md shadow-md flex items-center justify-center"
            title="Expand sidebar"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {isOpen && (
        <div
          className={`h-screen bg-slate-900 border-l border-slate-800 flex flex-col relative transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ width: `${width}px` }}
        >
          {/* Collapse button - top right */}
          <div className="absolute right-2 top-4 z-40">
            <button
              onClick={onToggle}
              className="bg-slate-800 text-white p-1.5 rounded-md shadow hover:bg-slate-700 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Drag resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/60 transition-colors z-10"
            onMouseDown={handleMouseDown}
          />

          {/* Drag handle for resizing */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/60 transition-colors z-10"
            onMouseDown={handleMouseDown}
          />

          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Patient data</h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {images.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-500 text-sm">
                  No images for this chat
                </p>
              </div>
            ) : (
              <div
                className={`grid gap-4 ${
                  columns === 2 ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {images.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(image)}
                    className="group relative overflow-hidden rounded-lg border border-slate-700 hover:border-blue-500 transition-all aspect-square"
                  >
                    <Image
                      src={image.url}
                      alt={image.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <div className="w-full text-center">
                        <p className="text-white text-sm font-medium">
                          {image.title}
                        </p>
                        <p className="text-slate-300 text-xs line-clamp-2 mt-1">
                          {image.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
}
