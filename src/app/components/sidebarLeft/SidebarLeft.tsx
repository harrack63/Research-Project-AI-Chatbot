"use client";

import { useCallback, useMemo, useState } from "react";
import { useKeyboardShortcut } from "~/hooks/useKeyboardShortcut";
import type { ChatCategory } from "~/lib/types";
import CollapsedSidebar from "./collapsedSidebar";
import SearchModal from "./searchModel";
import CategorySection from "./categorySection";
import DeleteModal from "./deleteModel";

type SidebarLeftProps = {
  isOpen: boolean;
  onToggle: () => void;
};

const mockChats: ChatCategory[] = [
  {
    label: "Pinned",
    chats: [
      {
        id: "1",
        label: "Pinned",
        chatname: "NextJS + FastAPI - RA",
        date: new Date(),
      },
      {
        id: "2",
        label: "Pinned",
        chatname: "Bioinformatics analysis - RA",
        date: new Date(),
      },
    ],
  },
  {
    label: "Today",
    chats: [
      {
        id: "5",
        label: "Today",
        chatname: "NextJS + FastAPI - RA",
        date: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    ],
  },
  {
    label: "Yesterday",
    chats: [
      {
        id: "6",
        label: "Yesterday",
        chatname: "R script for finalizing gene cou ...",
        date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ],
  },
  {
    label: "Last 7 Days",
    chats: [
      {
        id: "7",
        label: "Last 7 Days",
        chatname: "Drift Hello World App - $200 f ...",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ],
  },
];

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

export default function SidebarLeft({ isOpen, onToggle }: SidebarLeftProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
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
  const [chats, setChats] = useState<ChatCategory[]>(mockChats);
  const [pinnedChatIds, setPinnedChatIds] = useState<Set<string>>(
    new Set(mockChats[0].chats.map((c) => c.id))
  );

  const stableToggle = useCallback(() => {
    onToggle();
  }, [onToggle]);

  useKeyboardShortcut("j", stableToggle);
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
  };

  const handlePin = (
    e: React.MouseEvent,
    chatId: string,
    category: string
  ) => {
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
        // Unpin: move to category based on date
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
        // Pin: move to Pinned section
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

  if (!isOpen) {
    return (
      <>
        <CollapsedSidebar
          onToggle={stableToggle}
          onNewChat={() => console.log("New chat")}
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
          <div className="text-center flex-1">
            <h1 className="text-xs font-bold text-white leading-tight">
              Logo
            </h1>
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
          <button className="w-full py-1.5 px-3 bg-linear-to-r from-blue-600 to-emerald-600 hover:opacity-90 text-white font-semibold rounded text-xs transition-all duration-200 border border-blue-500">
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
              onPin={handlePin}
              onDelete={handleDeleteClick}
              onSelectChat={setActiveChatId}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-2 shrink-0">
          <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-slate-800 transition-colors text-xs text-slate-400">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
            <span className="text-xs">Pro</span>
          </button>
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