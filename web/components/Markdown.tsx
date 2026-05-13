"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
        h1: ({ children }) => (
          <h1 className="text-base font-semibold text-text mt-4 mb-2 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-semibold text-text mt-4 mb-2 first:mt-0 uppercase tracking-wide">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-text mt-3 mb-1.5 first:mt-0">{children}</h3>
        ),
        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children, ...props }) => {
          const isInline = !("data-language" in props);
          return isInline ? (
            <code className="px-1 py-0.5 rounded bg-bg border border-border text-accent text-xs">
              {children}
            </code>
          ) : (
            <code className="block p-3 rounded bg-bg border border-border text-xs overflow-x-auto">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="mb-3 last:mb-0">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-accent pl-3 my-3 text-muted italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-border" />,
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto">
            <table className="w-full text-xs border border-border">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-bg">{children}</thead>,
        th: ({ children }) => (
          <th className="px-2 py-1.5 text-left font-medium border-b border-border">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-2 py-1.5 border-b border-border last:border-0">{children}</td>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {children}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
