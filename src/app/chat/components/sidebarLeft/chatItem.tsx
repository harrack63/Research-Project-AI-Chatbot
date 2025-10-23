
import { Loader } from 'lucide-react';

type ChatItemProps = {
  id: string;
  chatname: string;
  isActive: boolean;
  isHovered: boolean;
  isPinned: boolean;
  isLoading?: boolean;
  onHover: (id: string | null) => void;
  onPin: (e: React.MouseEvent, chatId: string, category: string) => void;
  onDelete: (
    e: React.MouseEvent,
    chatId: string,
    chatname: string
  ) => void;
  category: string;
  onClick: () => void;
};

export default function ChatItem({
  id,
  chatname,
  isActive,
  isHovered,
  isPinned,
  isLoading,
  onHover,
  onPin,
  onDelete,
  category,
  onClick,
}: ChatItemProps) {
  return (
    <div
      className="relative group"
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        onClick={onClick}
        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-all duration-200 pr-20 truncate ${
          isActive
            ? "bg-slate-700 text-white"
            : "text-slate-300 hover:bg-slate-800"
        }`}
        title={chatname}
      >
        <p className="truncate font-medium text-sm">{chatname}</p>
      </button>
      
      {isLoading && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Loader className="w-3 h-3 animate-spin text-blue-400" />
        </div>
      )}

      {isHovered && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
          <button
            onClick={(e) => onPin(e, id, category)}
            className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
            title={isPinned ? "Unpin chat" : "Pin chat"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
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
          </button>
          <button
            onClick={(e) => onDelete(e, id, chatname)}
            className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
            title="Delete chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}