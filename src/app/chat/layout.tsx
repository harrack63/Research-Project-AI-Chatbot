"use client";
import { useCallback, useEffect, useState } from "react";
import SidebarLeft from "~/app/chat/components/sidebarLeft/SidebarLeft";
import SidebarRight from "~/app/chat/components/sidebarRight/SidebarRight";
import ChatArea from "~/app/chat/components/chat/ChatArea";
import { useParams, useRouter } from "next/navigation";
import { useKeyboardShortcut } from "~/hooks/useKeyboardShortcut";
import { getGlobalChats, loadChats } from "~/lib/chatStore";

export default function HomePage() {
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(false);
  const [hasImages, setHasImages] = useState(false);
  const [firstResponseReceived, setFirstResponseReceived] = useState(false);
  const [rightWidth, setRightWidth] = useState(400);

  const toggleLeft = () => {
    setShowLeft((p) => {
      const newState = !p;
      localStorage.setItem("sidebarLeftOpen", String(newState));
      return newState;
    });
  };
  const toggleRight = () => {
    setShowRight((p) => {
      const newValue = !p;
      if (newValue) {
        // Only auto-collapse if there's not enough space
        const availableSpace = window.innerWidth - rightWidth;
        const minSpaceNeeded = 768; // chat area + sidebar width
        if (availableSpace < minSpaceNeeded) {
          setShowLeft(false);
        }
      } else {
        // When closing right sidebar, re-open left if there's space
        setShowLeft(true);
      }
      return newValue;
    });
  };

  const params = useParams();
  const router = useRouter();
  const chatId = (params?.id as string) || "";

  const handleRightWidthChange = useCallback(
    (newWidth: number) => {
      setRightWidth(newWidth);

      // Check if we need to auto-collapse left sidebar
      const mainWidth = window.innerWidth - newWidth;
      const minSpaceNeeded = 768;
      if (mainWidth < 768 && showRight) {
        setShowLeft(false);
      } else if (mainWidth >= minSpaceNeeded && !showLeft) {
        // Only auto-expand if there's enough space (256px = sidebar width)
        setShowLeft(true);
      }
    },
    [showLeft, showRight]
  );

  useKeyboardShortcut("l", toggleRight);

  useEffect(() => {
    if (!chatId) return;

    const chats = getGlobalChats();
    const chatExists = chats
      .flatMap((c) => c.chats)
      .some((c) => c.id === chatId);

    if (!chatExists) {
      router.replace("/chat");
    }
  }, [chatId, router]);

  useEffect(() => {
    if (!chatId) return;

    const checkImages = () => {
      const chats = getGlobalChats();
      const chat = chats.flatMap((c) => c.chats).find((c) => c.id === chatId);
      const imagesExist = (chat?.images || []).length > 0;
      setHasImages(imagesExist);

      // Auto-show right sidebar if images exist and first
      // response received
      if (imagesExist && firstResponseReceived && !showRight) {
        setShowRight(true);
      }
    };

    checkImages();
    const interval = setInterval(checkImages, 500);
    return () => clearInterval(interval);
  }, [chatId, firstResponseReceived, showRight]);

  useEffect(() => {
    const savedState = localStorage.getItem("sidebarLeftOpen");
    if (savedState !== null) {
      setShowLeft(savedState === "true");
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, []);

  
  return (
    <div className="flex min-h-screen bg-blue-950">
      {/* Left sidebar - proper width transition */}
      <div
        className={`transition-all duration-300 ${
          showLeft ? "w-64" : "w-0"
        } overflow-hidden`}
      >
        <SidebarLeft isOpen={showLeft} onToggle={toggleLeft} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <ChatArea key={chatId} />
      </main>

      {/* Right sidebar */}
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
