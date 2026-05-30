import { useRouter } from 'next/navigation';

type CollapsedSidebarProps = {
  onToggle: () => void;
  onSearch: () => void;
};

export default function CollapsedSidebar({
  onToggle,
  onSearch,
}: CollapsedSidebarProps) {
  const router = useRouter();

  return (
    <div className="fixed left-4 top-4 bg-slate-900 border border-slate-800 rounded-lg flex gap-1 p-1.5 z-40 shadow-lg">
      <button
        onClick={onToggle}
        className="p-1.5 hover:bg-slate-800 rounded transition-colors"
        title="Toggle sidebar (Ctrl+J)"
      >
        <svg
          className="w-4 h-4 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      <button
        onClick={onSearch}
        className="p-1.5 hover:bg-slate-800 rounded transition-colors text-white"
        title="Search (Ctrl+/)"
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
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>

      <button
        onClick={() => router.push(`/chat`)}
        className="p-1.5 hover:bg-slate-800 rounded transition-colors text-white"
        title="New Chat"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  );
}
