import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '~/lib/types';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy, Terminal } from 'lucide-react';
import { useState } from 'react';

type ChatMessageProps = {
  message: Message;
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (message.role === 'assistant') {
    console.log("Raw Model Output:", JSON.stringify(message.content));
  }

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
    <div className="flex justify-start w-full 
      prose-th:border prose-th:border-slate-700 prose-th:p-2 prose-th:bg-slate-800 
      prose-td:border prose-td:border-slate-700 prose-td:p-2">
      {/* prose-invert makes it dark-mode compatible, prose-sm sizes it correctly */}
      <div className="prose prose-invert prose-sm max-w-none leading-7 text-slate-200
        prose-headings:font-bold prose-headings:text-blue-300 prose-headings:mb-2 prose-headings:mt-6
        prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
        prose-code:text-blue-200 prose-code:bg-slate-800 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700
        prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-400
        [&>ul]:list-disc [&>ul]:list-outside [&>ul]:pl-5 [&>ul]:my-2
        [&>ol]:list-decimal [&>ol]:list-outside [&>ol]:pl-5 [&>ol]:my-2
        [&>li]:my-1 prose-hr:my-8 prose-hr:border-slate-700">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Custom renderer to attach the cursor to the very last text node
            p: ({ children }) => (
              <p className="mb-2 last:mb-0">
                {children}
              </p>
            ),
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
                <thead className="bg-slate-800/80">
                  {children}
                </thead>
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
              )
          }}
        >
          {message.content || ""}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  // Extract the language from the code element's className if possible
  let language = "text";
  let codeContent = "";

  if (React.isValidElement(children)) {
    const childProps = children.props as { className?: string; children?: React.ReactNode };
    // rehype-highlight usually adds 'hljs language-xyz'
    const className = (childProps.className as string) || "";
    const match = /language-(\w+)/.exec(className);
    if (match) {
      language = match[1];
    }
    // Get raw text content for the copy button
    const raw = childProps.children ?? "";
    codeContent = String(raw).replace(/\n$/, "");
  }

  return (
    <div className="not-prose my-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-sm group">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm">
        <div className="flex items-center gap-2">
           {/* Tiny icon based on logic could go here, defaulting to Terminal */}
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

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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