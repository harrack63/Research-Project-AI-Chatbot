"use client";
import { useCallback, useState } from "react";
import SidebarLeft from "~/app/chat/components/sidebarLeft/SidebarLeft";
import SidebarRight from "~/app/chat/components/sidebarRight/SidebarRight";
import ChatArea from "~/app/chat/components/chat/ChatArea";
import { useParams } from "next/navigation";
import { useKeyboardShortcut } from "~/hooks/useKeyboardShortcut";

export default function HomePage() {
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(false);
  const [rightWidth, setRightWidth] = useState(400);

  const toggleLeft = () => setShowLeft((p) => !p);
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
      <SidebarRight
        isOpen={showRight}
        onToggle={toggleRight}
        width={rightWidth}
        onWidthChange={handleRightWidthChange}
      />
    </div>
  );
}
