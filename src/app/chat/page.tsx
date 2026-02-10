// src/app/chat/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SidebarLeft from "~/app/chat/components/sidebarLeft/SidebarLeft";
import SidebarRight from "~/app/chat/components/sidebarRight/SidebarRight";
import ChatArea from "~/app/chat/components/chat/ChatArea";
import { useKeyboardShortcut } from "~/hooks/useKeyboardShortcut";
import { chatHasMessages, createNewChat, getGlobalChats, loadChats, syncChatsWithServer } from "~/lib/chatStore";
import type { Message } from "~/lib/types";

import { Loader2 } from "lucide-react";
import AuthGate from "~/app/components/AuthGate";

function ChatContent() {
  const recoverChatFromMessages = useCallback((missingChatId: string) => {
    try {
      const stored = localStorage.getItem(`healthbot_messages_${missingChatId}`);
      if (!stored) return false;
      const parsed = JSON.parse(stored) as Message[];
      if (!Array.isArray(parsed) || parsed.length === 0) return false;

      const firstUser = parsed.find((msg) => msg.role === "user");
      const title =
        firstUser?.content?.substring(0, 50).split("\n")[0] ||
        "Recovered Chat";

      createNewChat(missingChatId, title);
      return true;
    } catch {
      return false;
    }
  }, []);

  const [showLeft, setShowLeft] = useState(() => {
    try {
      const savedState = localStorage.getItem("sidebarLeftOpen");
      return savedState !== null ? savedState === "true" : true;
    } catch {
      return true;
    }
  });
  const [showRight, setShowRight] = useState(() => {
    try {
      const savedState = localStorage.getItem("sidebarRightOpen");
      return savedState !== null ? savedState === "true" : true;
    } catch {
      return true;
    }
  });
  const [rightWidth, setRightWidth] = useState(400);
  const [chatsLoaded, setChatsLoaded] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const chatId = searchParams.get("id") || "";

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
      try {
        localStorage.setItem("sidebarRightOpen", String(newValue));
      } catch {}
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

  // Validate chat exists
  useEffect(() => {
    if (!chatId) return;
    if (!chatsLoaded && !chatHasMessages(chatId)) return;
    loadChats();
    const chats = getGlobalChats();
    const chatExists = chats
      .flatMap((c) => c.chats)
      .some((c) => c.id === chatId);

    if (!chatExists) {
      const recovered = recoverChatFromMessages(chatId);
      if (!recovered) {
        router.replace(`/chat`);
      }
    }
  }, [chatId, chatsLoaded, recoverChatFromMessages, router]);

  // Load chats
  useEffect(() => {
    loadChats();
    void syncChatsWithServer().finally(() => {
      setChatsLoaded(true);
    });
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
        <ChatArea chatId={chatId} />
      </main>

      <SidebarRight
        isOpen={showRight}
        onToggle={toggleRight}
        width={rightWidth}
        onWidthChange={handleRightWidthChange}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGate>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen bg-blue-950">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        }
      >
        <ChatContent />
      </Suspense>
    </AuthGate>
  );
}