"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Preview del artículo con tipografía de blog (distinta de components/Markdown.tsx, que está
// pensado para respuestas de chat: texto chico, H2 en mayúsculas). react-markdown escapa el
// contenido por default — no se usa dangerouslySetInnerHTML.
export function ArticlePreview({ markdown }: { markdown: string }) {
  return (
    <article className="max-w-none text-[15px] leading-7 text-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-text mb-5 leading-tight">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-text mt-8 mb-3 leading-snug">{children}</h2>
          ),
          h3: ({ children }) => <h3 className="text-base font-semibold text-text mt-6 mb-2">{children}</h3>,
          p: ({ children }) => <p className="mb-4">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1.5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent pl-4 my-4 text-muted italic">{children}</blockquote>
          ),
          hr: () => <hr className="my-6 border-border" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
