// src/app/chat/components/chat/ChatMessage.tsx
"use client";

import React, { memo, useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message, SourceReference } from "~/lib/types";
import rehypeHighlight from "rehype-highlight";
import {
  BookOpen,
  Check,
  Copy,
  Database,
  FileText,
  MessageSquareText,
  Pencil,
  RotateCcw,
  Terminal,
  X,
} from "lucide-react";

type ChatMessageProps = {
  message: Message;
  onCopy?: (text: string) => void | Promise<void>;
  onRetry?: () => void | Promise<void>;
  onEdit?: (newText: string) => void | Promise<void>;
  uiLocked?: boolean;
};

const ChatMessage = memo(function ChatMessage({
  message,
  onCopy,
  onRetry,
  onEdit,
  uiLocked = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [busy, setBusy] = useState(false);

  if (isUser) {
    return (
      <UserBubble
        message={message}
        onCopy={onCopy}
        onEdit={onEdit}
        uiLocked={uiLocked}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        draft={draft}
        setDraft={setDraft}
        busy={busy}
        setBusy={setBusy}
      />
    );
  }

  // Assistant message
  return (
    <div
      className="flex justify-start w-full relative group
      prose-th:border prose-th:border-slate-700 prose-th:p-2 prose-th:bg-slate-800 
      prose-td:border prose-td:border-slate-700 prose-td:p-2"
    >
      {/* Assistant actions (Retry lives here) */}
      {onRetry && (
        <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700 rounded-md px-1.5 py-1 shadow">
            <button
              type="button"
              onClick={onRetry}
              disabled={uiLocked}
              className="p-1 rounded hover:bg-slate-800 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Retry"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* prose-invert makes it dark-mode compatible, prose-sm sizes it correctly */}
      <div
        className="prose prose-invert prose-sm max-w-none leading-7 text-slate-200
        prose-headings:font-bold prose-headings:text-blue-300 prose-headings:mb-2 prose-headings:mt-6
        prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
        prose-code:text-blue-200 prose-code:bg-slate-800 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700
        prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-400
        [&>ul]:list-disc [&>ul]:list-outside [&>ul]:pl-5 [&>ul]:my-2
        [&>ol]:list-decimal [&>ol]:list-outside [&>ol]:pl-5 [&>ol]:my-2
        [&>li]:my-1 prose-hr:my-8 prose-hr:border-slate-700"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
            hr: () => <hr className="my-4 border-t border-slate-700" />,
            table: ({ children }) => (
              <div className="my-6 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900/50">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-700">
                    {children}
                  </table>
                </div>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-slate-800/80">{children}</thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-slate-700 bg-transparent">
                {children}
              </tbody>
            ),
            tr: ({ children }) => (
              <tr className="transition-colors hover:bg-slate-800/50">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-r border-slate-700 last:border-r-0">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 text-sm text-slate-300 border-r border-slate-700 last:border-r-0 align-top">
                {children}
              </td>
            ),
          }}
        >
          {message.content || ""}
        </ReactMarkdown>
        <ReferenceList references={message.references} />
      </div>
    </div>
  );
});

type UserBubbleProps = {
  message: Message;
  onCopy?: (text: string) => void | Promise<void>;
  onEdit?: (newText: string) => void | Promise<void>;
  uiLocked: boolean;

  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  draft: string;
  setDraft: (v: string) => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
};

function referenceLabel(sourceType: string): string {
  switch (sourceType) {
    case "chat_history":
      return "Previous chat";
    case "medical_kb":
      return "Medical knowledge base";
    case "diabetes_recipe":
      return "Recipe database";
    case "user_upload":
      return "Uploaded document";
    default:
      return sourceType.replace(/_/g, " ");
  }
}

function ReferenceIcon({ sourceType }: { sourceType: string }) {
  if (sourceType === "chat_history") {
    return <MessageSquareText className="h-3.5 w-3.5" />;
  }
  if (sourceType === "user_upload") {
    return <FileText className="h-3.5 w-3.5" />;
  }
  if (sourceType === "medical_kb" || sourceType === "diabetes_recipe") {
    return <BookOpen className="h-3.5 w-3.5" />;
  }
  return <Database className="h-3.5 w-3.5" />;
}

function ReferenceList({ references }: { references?: SourceReference[] }) {
  if (!references?.length) return null;

  return (
    <div className="not-prose mt-5 border-t border-slate-700/80 pt-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
        <BookOpen className="h-3.5 w-3.5" />
        References
      </div>
      <div className="space-y-2">
        {references.map((reference) => (
          <div
            key={`${reference.id}-${reference.title}`}
            className="rounded-md border border-slate-700 bg-slate-900/45 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-sm border border-slate-600 px-1.5 py-0.5 font-mono text-slate-300">
                {reference.id}
              </span>
              <span className="inline-flex items-center gap-1">
                <ReferenceIcon sourceType={reference.source_type} />
                {referenceLabel(reference.source_type)}
              </span>
              {typeof reference.score === "number" && (
                <span>score {reference.score.toFixed(3)}</span>
              )}
            </div>
            <div className="mt-1 text-sm font-medium text-slate-200 break-words">
              {reference.title}
            </div>
            <p className="mt-1 max-h-24 overflow-hidden text-xs leading-5 text-slate-400 break-words">
              {reference.snippet}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserBubble({
  message,
  onCopy,
  onEdit,
  uiLocked,
  isEditing,
  setIsEditing,
  draft,
  setDraft,
  busy,
  setBusy,
}: UserBubbleProps) {
  const doCopy = useCallback(() => {
    onCopy?.(message.content);
  }, [message.content, onCopy]);

  const startEdit = useCallback(() => {
    if (!onEdit) return;
    setDraft(message.content);
    setIsEditing(true);
  }, [message.content, onEdit, setDraft, setIsEditing]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setDraft(message.content);
  }, [message.content, setDraft, setIsEditing]);

  const saveEdit = useCallback(async () => {
    if (!onEdit) return;
    const next = draft.trim();
    if (!next) return;
    setBusy(true);
    try {
      await onEdit(next);
      setIsEditing(false);
    } finally {
      setBusy(false);
    }
  }, [draft, onEdit, setBusy, setIsEditing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        saveEdit();
      }
    },
    [cancelEdit, saveEdit]
  );

  return (
    <div className="flex justify-end w-full group">
      <div className="relative bg-blue-600 rounded-lg px-4 py-2 max-w-lg w-full sm:w-auto">
        {/* Actions */}
        <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700 rounded-md px-1.5 py-1 shadow">
            <button
              type="button"
              onClick={doCopy}
              disabled={uiLocked || isEditing || busy}
              className="p-1 rounded hover:bg-slate-800 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Copy message"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={startEdit}
                disabled={uiLocked || busy}
                className="p-1 rounded hover:bg-slate-800 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Edit message"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {!isEditing ? (
          <p
            className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed"
            style={{ color: "#ffffffcc" }}
          >
            {message.content}
          </p>
        ) : (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              disabled={busy}
              className="w-full bg-blue-700/40 border border-blue-300/30 rounded-md p-2 text-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-900/40 border border-slate-700 text-slate-200 hover:bg-slate-900/60 disabled:opacity-50"
                title="Cancel (Esc)"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={busy || !draft.trim()}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                title="Save (Enter)"
              >
                <Check className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  let language = "text";
  let codeContent = "";

  if (React.isValidElement(children)) {
    const childProps = children.props as {
      className?: string;
      children?: React.ReactNode;
    };
    const className = (childProps.className as string) || "";
    const match = /language-(\w+)/.exec(className);
    if (match) {
      language = match[1];
    }
    const raw = childProps.children ?? "";
    codeContent = String(raw).replace(/\n$/, "");
  }

  return (
    <div className="not-prose my-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-sm group">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">
            {language}
          </span>
        </div>
        <CopyButton content={codeContent} />
      </div>

      {/* Code Area */}
      <div className="p-4 overflow-x-auto">
        <pre className="bg-transparent! p-0! m-0! border-0! font-mono text-sm leading-relaxed">
          {children}
        </pre>
      </div>
    </div>
  );
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
      title="Copy code"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export default ChatMessage;
