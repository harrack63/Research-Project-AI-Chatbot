// src/app/chat/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SidebarLeft from "~/app/chat/components/sidebarLeft/SidebarLeft";
import SidebarRight from "~/app/chat/components/sidebarRight/SidebarRight";
import ChatArea from "~/app/chat/components/chat/ChatArea";
import { useKeyboardShortcut } from "~/hooks/useKeyboardShortcut";
import { useAuth } from "~/lib/auth";
import {
  backendChatsAreNewerThanLocal,
  chatHasMessages,
  createNewChat,
  getGlobalChats,
  loadChats,
  syncChatsWithServer,
} from "~/lib/chatStore";
import type { Message } from "~/lib/types";
import { Loader2 } from "lucide-react";
import AuthGate from "~/app/components/AuthGate";
import { toast } from "sonner";
import { fetchUserPreferences } from "~/lib/api";
import { getCachedPreferencesUpdatedAtMs } from "~/lib/userPreferencesStore";
import { initSessionTimeout } from "~/lib/sessionTimeout";

function ChatContent() {
  const outOfSyncToastShownRef = useRef(false);
  const { user, signOut } = useAuth();

  const recoverChatFromMessages = useCallback((missingChatId: string) => {
    try {
      const stored = localStorage.getItem(`healthbot_messages_${missingChatId}`);
      if (!stored) return false;
      const parsed = JSON.parse(stored) as Message[];
      if (!Array.isArray(parsed) || parsed.length === 0) return false;
      const firstUser = parsed.find((msg) => msg.role === "user");
      const title = firstUser?.content?.substring(0, 50).split("\n")[0] || "Recovered Chat";
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
      try { localStorage.setItem("sidebarRightOpen", String(newValue)); } catch {}
      if (newValue) {
        const availableSpace = window.innerWidth - rightWidth;
        if (availableSpace < 768) setShowLeft(false);
      } else {
        setShowLeft(true);
      }
      return newValue;
    });
  };

  const handleRightWidthChange = useCallback((newWidth: number) => {
    setRightWidth(newWidth);
    const mainWidth = window.innerWidth - newWidth;
    if (mainWidth < 768 && showRight) setShowLeft(false);
    else if (mainWidth >= 768 && !showLeft) setShowLeft(true);
  }, [showLeft, showRight]);

  useKeyboardShortcut("l", toggleRight);

  useEffect(() => {
    const cleanup = initSessionTimeout(
      () => {
        signOut();
        toast.error("You have been signed out due to inactivity.");
      },
      () => {
        toast.warning("Your session will expire in 30 seconds due to inactivity.", {
          id: "session-warn",
          duration: 30000,
        });
      }
    );
    return cleanup;
  }, [signOut]);

  useEffect(() => {
    if (!chatsLoaded || !user?.id || !chatId) return;
    let cancelled = false;
    const validate = async () => {
      loadChats();
      const chats = getGlobalChats();
      const chatExists = chats.flatMap((c) => c.chats).some((c) => c.id === chatId);
      if (chatExists) return;
      if (!chatHasMessages(chatId)) {
        router.replace("/chat");
        return;
      }
      const backendPreferencesAreNewerThanLocal = async () => {
        const localUpdatedAtMs = getCachedPreferencesUpdatedAtMs(user.id);
        const res = await fetchUserPreferences();
        if (!res.ok || !res.preferences) return false;
        const raw = res.preferences.updated_at;
        const ms = raw ? Date.parse(String(raw)) : 0;
        return (Number.isNaN(ms) ? 0 : ms) > localUpdatedAtMs;
      };
      const [chatsNewer, prefsNewer] = await Promise.all([
        backendChatsAreNewerThanLocal(),
        backendPreferencesAreNewerThanLocal(),
      ]);
      if (cancelled) return;
      if (!chatsNewer && !prefsNewer) {
        const recovered = recoverChatFromMessages(chatId);
        if (!recovered) router.replace("/chat");
        return;
      }
      if (!outOfSyncToastShownRef.current) {
        outOfSyncToastShownRef.current = true;
        toast("Your chats are out of date", {
          id: "backend-out-of-sync",
          description: "Newer backend data was found. Refresh to sync.",
          duration: Infinity,
          action: {
            label: "Refresh",
            onClick: () => void syncChatsWithServer().then(() => window.location.reload()),
          },
        });
      }
    };
    void validate();
    return () => { cancelled = true; };
  }, [chatId, chatsLoaded, recoverChatFromMessages, router, user?.id]);

  useEffect(() => {
    loadChats();
    void syncChatsWithServer().finally(() => setChatsLoaded(true));
  }, []);

  useEffect(() => {
    if (!chatsLoaded) return;
    let cancelled = false;
    const checkBackendUpdates = async () => {
      if (cancelled || outOfSyncToastShownRef.current) return;
      const backendIsNewer = await backendChatsAreNewerThanLocal();
      if (!backendIsNewer || cancelled || outOfSyncToastShownRef.current) return;
      outOfSyncToastShownRef.current = true;
      toast("Your chats are out of date", {
        id: "backend-out-of-sync",
        description: "Newer chats were found on the backend.",
        duration: Infinity,
        action: {
          label: "Refresh",
          onClick: () => void syncChatsWithServer().then(() => window.location.reload()),
        },
      });
    };
    void checkBackendUpdates();
    const intervalId = window.setInterval(() => void checkBackendUpdates(), 45000);
    return () => { cancelled = true; window.clearInterval(intervalId); };
  }, [chatsLoaded, user?.id]);

  return (
    <div className="flex min-h-screen bg-blue-950">
      <div className={`transition-all duration-300 ${showLeft ? "w-64" : "w-0"} overflow-hidden`}>
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
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-blue-950"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>}>
        <ChatContent />
      </Suspense>
    </AuthGate>
  );
}
