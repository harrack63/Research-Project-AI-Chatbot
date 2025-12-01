import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '~/lib/types';

type ChatMessageProps = {
  message: Message;
  isStreaming?: boolean;
  isLoading?: boolean;
};

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end w-full">
        <div className="bg-blue-600 rounded-lg px-4 py-2 max-w-lg">
          <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed" style={{ color: '#ffffffcc' }}>
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start w-full">
      {/* prose-invert makes it dark-mode compatible, prose-sm sizes it correctly */}
      <div className="prose prose-invert prose-sm max-w-2xl leading-relaxed break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom renderer to attach the cursor to the very last text node
            p: ({ children }) => (
              <p className="mb-2 last:mb-0">
                {children}
                {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-slate-400 animate-pulse align-middle" />}
              </p>
            )
          }}
        >
          {message.content || ""}
        </ReactMarkdown>
        {/* Fallback cursor if content is empty (just starting) */}

        {isStreaming && message.content.length > 0 && (
          <span className="inline-block w-2 h-4 ml-1 align-middle bg-slate-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}