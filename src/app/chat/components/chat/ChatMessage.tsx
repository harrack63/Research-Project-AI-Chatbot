// src/app/chat/components/chat/ChatMessage.tsx
"use client";

import React, { memo, useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message, SourceReference } from "~/lib/types";
import rehypeHighlight from "rehype-highlight";
import {
  BookOpen,
  Check,
  Copy,
  Database,
  ExternalLink,
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
  const referencesById = useMemo(
    () => buildReferenceMap(message.references),
    [message.references]
  );
  const renderWithInlineReferences = useCallback(
    (children: React.ReactNode) =>
      renderInlineReferences(children, referencesById),
    [referencesById]
  );

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
            p: ({ children }) => (
              <p className="mb-2 last:mb-0">
                {renderWithInlineReferences(children)}
              </p>
            ),
            pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
            hr: () => <hr className="my-4 border-t border-slate-700" />,
            li: ({ children }) => (
              <li className="my-1">{renderWithInlineReferences(children)}</li>
            ),
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
                {renderWithInlineReferences(children)}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 text-sm text-slate-300 border-r border-slate-700 last:border-r-0 align-top">
                {renderWithInlineReferences(children)}
              </td>
            ),
          }}
        >
          {message.content || ""}
        </ReactMarkdown>
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

function buildReferenceMap(references?: SourceReference[]) {
  const map = new Map<string, SourceReference>();
  references?.forEach((reference) => {
    if (reference.id) map.set(reference.id.toUpperCase(), reference);
  });
  return map;
}

function renderInlineReferences(
  node: React.ReactNode,
  referencesById: Map<string, SourceReference>
): React.ReactNode {
  if (!referencesById.size) return node;

  return React.Children.map(node, (child) => {
    if (typeof child === "string") {
      return replaceReferenceMarkers(child, referencesById);
    }

    if (!React.isValidElement(child)) return child;
    if (child.type === "code" || child.type === "pre") return child;

    const props = child.props as { children?: React.ReactNode };
    if (!props.children) return child;

    return React.cloneElement(child, {
      children: renderInlineReferences(props.children, referencesById),
    } as Partial<typeof props>);
  });
}

function replaceReferenceMarkers(
  text: string,
  referencesById: Map<string, SourceReference>
): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const markerPattern = /\[(R\d+)\]/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markerPattern.exec(text)) !== null) {
    const [marker, rawId] = match;
    const id = rawId.toUpperCase();
    const reference = referencesById.get(id);

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    parts.push(
      reference ? (
        <InlineReference
          key={`${id}-${match.index}`}
          reference={reference}
        />
      ) : (
        marker
      )
    );

    lastIndex = match.index + marker.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
}

function InlineReference({ reference }: { reference: SourceReference }) {
  const title = readableTitle(reference);
  const description = readableDescription(reference);
  const url = referenceUrl(reference);
  const label = description ? `${title}: ${description}` : title;
  const className =
    "not-prose inline rounded-sm border border-blue-400/30 bg-blue-500/10 px-1.5 py-0.5 text-sm font-medium leading-6 text-blue-100 break-words transition-colors";

  const content = (
    <>
      <span className="mr-1 inline-flex align-[-0.15em]">
        <ReferenceIcon sourceType={reference.source_type} />
      </span>
      <span className="align-baseline">{label}</span>
      {url && (
        <ExternalLink className="ml-1 inline h-3 w-3 align-[-0.1em]" />
      )}
    </>
  );

  if (!url) {
    return (
      <span title={`${referenceLabel(reference.source_type)}: ${label}`} className={className}>
        {content}
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`${referenceLabel(reference.source_type)}: ${label}`}
      className={`${className} hover:border-blue-300/60 hover:bg-blue-500/20 hover:text-blue-50`}
    >
      {content}
    </a>
  );
}

function readableTitle(reference: SourceReference): string {
  const title = cleanReferenceText(reference.title);
  return title || referenceLabel(reference.source_type);
}

function readableDescription(reference: SourceReference): string {
  const snippet = cleanReferenceText(reference.snippet);
  if (!snippet) return "";

  const sentenceMatch = snippet.match(/^.{40,}?[.!?](?=\s|$)/);
  const sentence = sentenceMatch?.[0] ?? snippet;
  return truncate(sentence, 140);
}

function cleanReferenceText(value?: string | null): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function referenceUrl(reference: SourceReference): string | null {
  if (typeof reference.url === "string" && reference.url.trim()) {
    return reference.url.trim();
  }

  const metadataUrl = reference.metadata?.url;
  if (typeof metadataUrl === "string" && metadataUrl.trim()) {
    return metadataUrl.trim();
  }

  return null;
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
