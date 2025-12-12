import ChatItem from "./chatItem";
import type { Chat } from "~/lib/types";
import { useRouter } from 'next/navigation';
import { basePath } from "~/lib/global_vars";

type CategorySectionProps = {
  label: string;
  chats: Chat[];
  isExpanded: boolean;
  onToggle: () => void;
  activeChatId: string | null;
  hoveredChatId: string | null;
  onHoverChat: (id: string | null) => void;
  pinnedChatIds: Set<string>;
  loadingChatId: string | null;
  onPin: (e: React.MouseEvent, chatId: string, category: string) => void;
  onDelete: (
    e: React.MouseEvent,
    chatId: string,
    chatname: string
  ) => void;
};

export default function CategorySection({
  label,
  chats,
  isExpanded,
  onToggle,
  activeChatId,
  hoveredChatId,
  onHoverChat,
  pinnedChatIds,
  loadingChatId,
  onPin,
  onDelete,
}: CategorySectionProps) {
  const router = useRouter();

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-300 transition-colors"
      >
        <span className="flex items-center gap-2">
          {label === "Pinned" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 17v5" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
            </svg>
          )}
          {label}
        </span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${
            isExpanded ? "" : "rotate-180"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-0.5 mt-1">
          {chats.map((chat) => (
            <ChatItem
              key={chat.id}
              id={chat.id}
              chatname={chat.chatname}
              isActive={activeChatId === chat.id}
              isHovered={hoveredChatId === chat.id}
              isPinned={pinnedChatIds.has(chat.id)}
              isLoading={loadingChatId === chat.id}
              onHover={onHoverChat}
              onPin={onPin}
              onDelete={onDelete}
              category={label}
              onClick={() => router.push(`/chat?id=${chat.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}