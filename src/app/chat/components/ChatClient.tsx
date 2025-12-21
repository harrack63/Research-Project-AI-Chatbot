"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SidebarLeft from "~/app/chat/components/sidebarLeft/SidebarLeft";
import SidebarRight from "~/app/chat/components/sidebarRight/SidebarRight";
import ChatArea from "~/app/chat/components/chat/ChatArea";
import { useKeyboardShortcut } from "~/hooks/useKeyboardShortcut";
import { getGlobalChats, loadChats } from "~/lib/chatStore";

export default function ChatClient() {
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(false);
  const [hasImages, setHasImages] = useState(false);
  const [firstResponseReceived, setFirstResponseReceived] = useState(false);
  const [rightWidth, setRightWidth] = useState(400);

  // CLIENT ONLY hooks / APIs
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatId = searchParams.get("id") || "";

  const toggleLeft = () => {
    setShowLeft((p) => {
      const newState = !p;
      try {
        localStorage.setItem("sidebarLeftOpen", String(newState));
      } catch {}
      return newState;
    });
  };

  const toggleRight = () => {
    setShowRight((p) => {
      const newValue = !p;
      if (newValue) {
        const availableSpace = window.innerWidth - rightWidth;
        const minSpaceNeeded = 768;
        if (availableSpace < minSpaceNeeded) {
          setShowLeft(false);
        }
      } else {
        setShowLeft(true);
      }
      return newValue;
    });
  };

  const handleRightWidthChange = useCallback(
    (newWidth: number) => {
      setRightWidth(newWidth);
      const mainWidth = window.innerWidth - newWidth;
      const minSpaceNeeded = 768;
      if (mainWidth < 768 && showRight) {
        setShowLeft(false);
      } else if (mainWidth >= minSpaceNeeded && !showLeft) {
        setShowLeft(true);
      }
    },
    [showLeft, showRight]
  );

  useKeyboardShortcut("l", toggleRight);

  // Validate chat exists (client-only)
  useEffect(() => {
    if (!chatId) return;

    const chats = getGlobalChats();
    const chatExists = chats
      .flatMap((c) => c.chats)
      .some((c) => c.id === chatId);

    if (!chatExists) {
      router.replace(`/chat`);
    }
  }, [chatId, router]);

  // Check for images (client-only)
  useEffect(() => {
    if (!chatId) return;

    const checkImages = () => {
      const chats = getGlobalChats();
      const chat = chats.flatMap((c) => c.chats).find((c) => c.id === chatId);
      const imagesExist = (chat?.images || []).length > 0;
      setHasImages(imagesExist);

      if (imagesExist && firstResponseReceived && !showRight) {
        setShowRight(true);
      }
    };

    checkImages();
    const interval = setInterval(checkImages, 500);
    return () => clearInterval(interval);
  }, [chatId, firstResponseReceived, showRight]);

  // Load sidebar state
  useEffect(() => {
    try {
      const savedState = localStorage.getItem("sidebarLeftOpen");
      if (savedState !== null) {
        setShowLeft(savedState === "true");
      }
    } catch {}
  }, []);

  // Load chats
  useEffect(() => {
    loadChats();
  }, []);

  return (
    <div className="flex min-h-screen bg-blue-950">
      <div
        className={`transition-all duration-300 ${showLeft ? "w-64" : "w-0"
          } overflow-hidden`}
      >
        <SidebarLeft isOpen={showLeft} onToggle={toggleLeft} />
      </div>

      <main className="flex-1 flex flex-col relative min-w-0">
        <ChatArea key={chatId} chatId={chatId} />
      </main>

      {hasImages && (
        <SidebarRight
          isOpen={showRight}
          onToggle={toggleRight}
          width={rightWidth}
          onWidthChange={handleRightWidthChange}
        />
      )}
    </div>
  );
}