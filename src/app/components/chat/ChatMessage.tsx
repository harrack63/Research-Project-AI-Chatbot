import type { Message } from '~/lib/types';

type ChatMessageProps = {
  message: Message;
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-blue-600 rounded-lg px-4 py-2 max-w-xs lg:max-w-md">
          <p className="text-sm whitespace-pre-wrap wrap-break-words" style={{ color: '#ffffffcc' }}>
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant message - no background
  return (
    <div className="flex justify-start">
      <p
        className="text-sm whitespace-pre-wrap wrap-break-words max-w-xs lg:max-w-md"
        style={{ color: '#ffffffcc' }}
      >
        {message.content}
        {message.role === 'assistant' && message.content && !message.content.endsWith('|') && (
          <span className="inline-block w-2 h-4 ml-1 bg-slate-400 animate-pulse" />
        )}
      </p>
    </div>
  );
}