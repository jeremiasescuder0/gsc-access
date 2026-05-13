"use client";

import { useChat } from "@ai-sdk/react";
import { Send, Sparkles, RotateCcw, AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function friendlyError(message: string): { title: string; detail: string } {
  if (/quota|free_tier|rate.?limit|exceeded/i.test(message)) {
    const retryMatch = message.match(/retry in ([\d.]+)s/i);
    const retry = retryMatch ? ` Reintentá en ~${Math.ceil(parseFloat(retryMatch[1]))}s.` : "";
    return {
      title: "Cuota de Gemini agotada",
      detail:
        "La API key de Gemini está en free tier (límite de 20 requests/día en gemini-2.5-flash). Agregá créditos en Google AI Studio para uso continuo." +
        retry,
    };
  }
  if (/503|service unavailable|high demand/i.test(message)) {
    return {
      title: "Gemini sobrecargado",
      detail: "El modelo está experimentando alta demanda. Reintentá en unos segundos.",
    };
  }
  if (/429|too many requests/i.test(message)) {
    return {
      title: "Demasiadas requests",
      detail: "Esperá unos segundos antes de volver a preguntar.",
    };
  }
  return {
    title: "Error del modelo",
    detail: message.length > 200 ? message.slice(0, 200) + "…" : message,
  };
}

type Props = {
  accountId?: string;
  campaignId?: string;
  siteUrl?: string;
  contextLabel: string;
  suggestions?: string[];
};

export default function ChatPanel({
  accountId,
  campaignId,
  siteUrl,
  contextLabel,
  suggestions = [],
}: Props) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
    append,
    error,
    reload,
  } = useChat({
    api: "/api/chat",
    body: { accountId, campaignId, siteUrl },
  });

  const isLoading = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <div>
            <div className="text-sm font-medium text-text">Chat con Gemini</div>
            <div className="text-xs text-muted">{contextLabel}</div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-muted hover:text-text transition"
            title="Limpiar conversación"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px]">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Preguntá lo que quieras sobre la data cargada. El modelo ya tiene contexto de{" "}
              {siteUrl
                ? "este sitio (queries, páginas, oportunidades, comparativas MoM/YoY)"
                : campaignId
                ? "esta campaña (ad groups, keywords, ads, ubicaciones, search terms)"
                : accountId
                ? "esta cuenta"
                : "todas las cuentas del portfolio"}
              .
            </p>
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted uppercase tracking-wide">Sugerencias</div>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => append({ role: "user", content: s })}
                    className="block w-full text-left text-sm px-3 py-2 rounded border border-border hover:border-accent hover:text-accent transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`text-sm ${
                m.role === "user"
                  ? "ml-8 bg-bg border border-border rounded-lg px-3 py-2"
                  : "mr-4"
              }`}
            >
              {m.role === "assistant" && (
                <div className="text-xs text-accent mb-1 font-medium">Gemini</div>
              )}
              {m.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 my-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 my-1">{children}</ol>,
                    li: ({ children }) => <li className="text-sm">{children}</li>,
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
                    h2: ({ children }) => <h2 className="text-sm font-semibold text-text mt-2 mb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-medium text-text mt-2 mb-1">{children}</h3>,
                    code: ({ children }) => <code className="bg-bg px-1 rounded text-xs text-accent">{children}</code>,
                  }}
                >
                  {m.content}
                </ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
              )}
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="text-sm text-muted">Gemini está pensando…</div>
        )}
        {error &&
          (() => {
            const e = friendlyError(error.message);
            return (
              <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-danger">{e.title}</div>
                    <div className="text-muted mt-1 text-xs leading-relaxed">{e.detail}</div>
                    <button
                      onClick={() => reload()}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Reintentar
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-3 flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Preguntá algo sobre la cuenta…"
          className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-text placeholder-muted focus:outline-none focus:border-accent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-3 py-2 rounded bg-accent text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-600 transition flex items-center gap-1"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
