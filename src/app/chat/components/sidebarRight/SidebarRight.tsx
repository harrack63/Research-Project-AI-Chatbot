// app/chat/components/sidebarRight/SidebarRight.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getGlobalChats } from "~/lib/chatStore";
import type { ChatImage } from "~/lib/types";
import { X } from "lucide-react";
import Image from "next/image";
import ImageModal from "./ImageModel";

type SidebarRightProps = {
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
};

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

  const images = (() => {
    if (!chatId) return [];
    const chats = getGlobalChats();
    const chat = chats.flatMap((c) => c.chats).find((c) => c.id === chatId);
    return chat?.images || [];
  })();

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

  const columns = width >= 800 ? 2 : 1;
  const showDragHandle = !isOpen && chatId;

  return (
    <>
      {/* Drag handle when sidebar is closed */}
      {showDragHandle && (
        <div
          className="fixed right-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-blue-500/50 transition-all cursor-col-resize z-30 group"
          onMouseDown={(e) => {
            e.preventDefault();
            onToggle();
          }}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-slate-600 rounded-l group-hover:bg-blue-500 transition-colors">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 flex flex-col justify-center gap-1 pl-0.5">
              <div className="w-0.5 h-1 bg-slate-400 group-hover:bg-white rounded" />
              <div className="w-0.5 h-1 bg-slate-400 group-hover:bg-white rounded" />
              <div className="w-0.5 h-1 bg-slate-400 group-hover:bg-white rounded" />
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="h-screen bg-slate-900 border-l border-slate-800 flex flex-col relative"
          style={{ width: `${width}px` }}
        >
          {/* Resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors z-10"
            onMouseDown={handleMouseDown}
          />

          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Patient data</h2>
            <button
              onClick={onToggle}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {images.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-500 text-sm">No images for this chat</p>
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
                    className="group relative overflow-hidden rounded-lg border border-slate-700 hover:border-blue-500 transition-all"
                  >
                    <Image
                      src={image.url}
                      alt={image.title}
                      width={400}
                      height={400}
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <div>
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