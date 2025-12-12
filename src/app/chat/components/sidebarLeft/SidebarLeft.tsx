// app/chat/components/sidebarLeft/SidebarLeft.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from ;
import { useKeyboardShortcut } from "~/hooks/useKeyboardShortcut";
import type { ChatCategory } from "~/lib/types";
import { getGlobalChats, setGlobalChats, loadChats, deleteChat } from "~/lib/chatStore";
import CollapsedSidebar from "./collapsedSidebar";
import SearchModal from "./searchModel";
import CategorySection from "./categorySection";
import DeleteModal from "./deleteModel";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

type SidebarLeftProps = {
  isOpen: boolean;
  onToggle: () => void;
};

type DeletePromptState = {
  isOpen: boolean;
  chatId: string | null;
  chatname: string;
};

function getCategoryFromDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 1) return "Today";
  if (diffDays < 2) return "Yesterday";
  if (diffDays < 7) return "Last 7 Days";
  return "Older";
}

function initializeChats() {
  loadChats();
  const loadedChats = getGlobalChats();
  return loadedChats;
}

function initializePinnedIds(chats: ChatCategory[]): Set<string> {
  const pinnedSection = chats.find((c) => c.label === "Pinned");
  return new Set(pinnedSection?.chats.map((c) => c.id) || []);
}

export default function SidebarLeft({ isOpen, onToggle }: SidebarLeftProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const activeChatId = searchParams.get("id") ?? "";
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    Pinned: true,
    Today: true,
    Yesterday: true,
    "Last 7 Days": true,
  });
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<DeletePromptState>({
    isOpen: false,
    chatId: null,
    chatname: "",
  });
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [chats, setChats] = useState(() => initializeChats());
  const [pinnedChatIds, setPinnedChatIds] = useState(() => 
    initializePinnedIds(getGlobalChats())
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync chats to localStorage
  useEffect(() => {
    if (isLoaded) {
      setGlobalChats(chats);
    }
  }, [chats, isLoaded]);

  useEffect(() => {
    const handleChatsUpdate = () => {
      const updated = getGlobalChats();
      setChats([...updated]);
    };

    window.addEventListener("chats-updated", handleChatsUpdate);
    return () => window.removeEventListener("chats-updated", handleChatsUpdate);
  }, []);

  const stableToggle = useCallback(() => {
    onToggle();
  }, [onToggle]);

  const handleNewChat = useCallback(() => {
    router.push("/chat");
  }, [router]);

  useKeyboardShortcut("j", stableToggle);
  useKeyboardShortcut("k", handleNewChat);
  useKeyboardShortcut("/", () => {
    if (isOpen) {
      const searchInput = document.querySelector(
        'input[placeholder="Search your threads..."]'
      ) as HTMLInputElement;
      searchInput?.focus();
    } else {
      setShowSearchModal(true);
    }
  });

  const filteredChats = useMemo(() => {
    return chats
      .map((category) => ({
        ...category,
        chats: category.chats.filter((chat) =>
          chat.chatname.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((category) => category.chats.length > 0);
  }, [searchQuery, chats]);

  const toggleCategory = (label: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleDeleteClick = (
    e: React.MouseEvent,
    chatId: string,
    chatname: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      handleConfirmDelete(chatId);
    } else {
      setDeletePrompt({
        isOpen: true,
        chatId,
        chatname,
      });
    }
  };

  const handleConfirmDelete = (chatId: string) => {
    deleteChat(chatId);

    setChats((prevChats) =>
      prevChats
        .map((category) => ({
          ...category,
          chats: category.chats.filter((chat) => chat.id !== chatId),
        }))
        .filter((category) => category.chats.length > 0)
    );
    setPinnedChatIds((prev) => {
      const updated = new Set(prev);
      updated.delete(chatId);
      return updated;
    });
    setDeletePrompt({ isOpen: false, chatId: null, chatname: "" });

    if (activeChatId === chatId) {
      router.push("/chat");
    }
  };

  const handlePin = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const isPinned = pinnedChatIds.has(chatId);
    const chat = chats.flatMap((c) => c.chats).find((c) => c.id === chatId);

    if (!chat) return;

    setChats((prevChats) => {
      const newChats = prevChats.map((c) => ({
        ...c,
        chats: c.chats.filter((ch) => ch.id !== chatId),
      }));

      if (isPinned) {
        const newCategory = getCategoryFromDate(chat.date);
        let targetCategory = newChats.find((c) => c.label === newCategory);

        if (!targetCategory) {
          targetCategory = { label: newCategory, chats: [] };
          newChats.push(targetCategory);
        }

        targetCategory.chats.push({
          ...chat,
          label: newCategory,
        });
      } else {
        const pinnedSection = newChats.find((c) => c.label === "Pinned");
        if (pinnedSection) {
          pinnedSection.chats.push({
            ...chat,
            label: "Pinned",
          });
        }
      }

      return newChats.filter((c) => c.chats.length > 0);
    });

    setPinnedChatIds((prev) => {
      const updated = new Set(prev);
      if (isPinned) {
        updated.delete(chatId);
      } else {
        updated.add(chatId);
      }
      return updated;
    });
  };

  const userInitials =
    user && user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.firstName
        ? user.firstName[0].toUpperCase()
        : "U";

  const userName = user?.firstName || "User";

  if (!isOpen) {
    return (
      <>
        <CollapsedSidebar
          onToggle={stableToggle}
          onSearch={() => setShowSearchModal(true)}
        />
        <SearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          chats={chats}
        />
      </>
    );
  }

  return (
    <>
      <aside className="h-screen bg-linear-to-b from-slate-900 to-slate-950 text-white flex flex-col border-r border-slate-800 w-64 z-40">
        {/* Header */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2 mt-1 ml-1">
          <div className="flex-1 flex items-center gap-2 justify-center">
            <Image
              src="/favicon.ico"
              alt="Healthbot"
              width={24}
              height={24}
              className="rounded"
            />
            <h1 className="text-sm font-bold text-white">Healthbot</h1>
          </div>
          <button
            onClick={stableToggle}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors shrink-0"
            title="Toggle sidebar (Ctrl+J)"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 py-2">
          <button
            onClick={handleNewChat}
            className="w-full py-1.5 px-3 bg-linear-to-r from-blue-600 to-emerald-600 hover:opacity-90 text-white font-semibold rounded text-xs transition-all duration-200 border border-blue-500"
          >
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <svg
              className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-500"
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
              type="text"
              placeholder="Search your threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 text-white placeholder-slate-500 rounded pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2.5">
          {filteredChats.map((category) => (
            <CategorySection
              key={category.label}
              label={category.label}
              chats={category.chats}
              isExpanded={expandedCategories[category.label]}
              onToggle={() => toggleCategory(category.label)}
              activeChatId={activeChatId}
              hoveredChatId={hoveredChatId}
              onHoverChat={setHoveredChatId}
              pinnedChatIds={pinnedChatIds}
              loadingChatId={null}
              onPin={handlePin}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>

        {/* Footer - User Profile */}
        <div className="border-t border-slate-800 p-3 shrink-0">
          <Link
            href="/settings"
            className="flex items-center gap-3 w-full px-2 py-2 rounded hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-slate-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-white">
                {userInitials}
              </span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-medium text-white">{userName}</p>
            </div>
          </Link>
        </div>
      </aside>

      <DeleteModal
        isOpen={deletePrompt.isOpen}
        chatname={deletePrompt.chatname}
        onConfirm={() => {
          if (deletePrompt.chatId) {
            handleConfirmDelete(deletePrompt.chatId);
          }
        }}
        onCancel={() =>
          setDeletePrompt({ isOpen: false, chatId: null, chatname: "" })
        }
      />

      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        chats={chats}
      />
    </>
  );
}