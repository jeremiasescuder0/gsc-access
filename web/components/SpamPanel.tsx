"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck, Loader2, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

type SpamResult = {
  severity?: "none" | "low" | "medium" | "high";
  summary?: string;
  spamCategories?: string[];
  estimatedCrawlWaste?: string;
  robotsTxtRules?: string | null;
  htaccessRules?: string | null;
  additionalRecommendations?: string[];
  spamQueries?: { query: string; impressions: number; clicks: number; position: number }[];
  suspiciousPages?: { page: string; impressions: number; clicks: number }[];
  softFourOhFourPages?: { page: string; impressions: number }[];
  analysis?: string;
  error?: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  none: "border-success/40 bg-success/5",
  low: "border-warning/40 bg-warning/5",
  medium: "border-orange-500/40 bg-orange-500/5",
  high: "border-danger/40 bg-danger/5",
};

const SEVERITY_LABEL: Record<string, string> = {
  none: "Sin problemas",
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted uppercase tracking-wide">{label}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-xs text-muted hover:text-accent transition"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="text-xs bg-bg border border-border rounded p-3 overflow-x-auto text-text whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

export function SpamPanel({ siteUrl }: { siteUrl: string }) {
  const [result, setResult] = useState<SpamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQueries, setShowQueries] = useState(false);
  const [showPages, setShowPages] = useState(false);

  async function runCheck() {
    setLoading(true);
    setResult(null);
    try {
      const encoded = encodeURIComponent(siteUrl);
      const res = await fetch(`/api/organic/${encoded}/spam`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }

  const severity = result?.severity ?? "none";
  const borderClass = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.none;
  const spamCount = (result?.spamQueries?.length ?? 0) + (result?.suspiciousPages?.length ?? 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" />
          Detección de spam
        </h2>
        <button
          onClick={runCheck}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analizando…
            </>
          ) : (
            "Revisar spam"
          )}
        </button>
      </div>

      {result && !result.error && (
        <div className={`rounded-lg border p-4 space-y-4 ${borderClass}`}>
          <div className="flex items-start gap-3">
            {severity === "none" ? (
              <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text">
                  Severidad: {SEVERITY_LABEL[severity] ?? severity}
                </span>
                {result.estimatedCrawlWaste && (
                  <span className="text-xs text-muted">· Crawl budget perdido: {result.estimatedCrawlWaste}</span>
                )}
              </div>
              <p className="text-sm text-muted">{result.summary ?? result.analysis}</p>

              {result.spamCategories && result.spamCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {result.spamCategories.map((c) => (
                    <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {spamCount > 0 && (
            <div className="space-y-2">
              {(result.spamQueries?.length ?? 0) > 0 && (
                <button
                  onClick={() => setShowQueries((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition w-full text-left"
                >
                  {showQueries ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {result.spamQueries!.length} queries sospechosas en GSC
                </button>
              )}
              {showQueries && result.spamQueries && (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-bg">
                        <th className="text-left p-2 text-muted font-medium">Query</th>
                        <th className="text-right p-2 text-muted font-medium">Impr.</th>
                        <th className="text-right p-2 text-muted font-medium">Clicks</th>
                        <th className="text-right p-2 text-muted font-medium">Pos.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.spamQueries.map((r) => (
                        <tr key={r.query} className="border-b border-border last:border-0">
                          <td className="p-2 text-text font-mono">{r.query}</td>
                          <td className="p-2 text-right text-muted">{r.impressions.toLocaleString()}</td>
                          <td className="p-2 text-right text-muted">{r.clicks}</td>
                          <td className="p-2 text-right text-muted">{r.position.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(result.suspiciousPages?.length ?? 0) > 0 && (
                <button
                  onClick={() => setShowPages((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition w-full text-left"
                >
                  {showPages ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {result.suspiciousPages!.length} páginas con URLs sospechosas
                </button>
              )}
              {showPages && result.suspiciousPages && (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-bg">
                        <th className="text-left p-2 text-muted font-medium">Página</th>
                        <th className="text-right p-2 text-muted font-medium">Impr.</th>
                        <th className="text-right p-2 text-muted font-medium">Clicks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.suspiciousPages.map((r) => (
                        <tr key={r.page} className="border-b border-border last:border-0">
                          <td className="p-2 text-text font-mono break-all">{r.page}</td>
                          <td className="p-2 text-right text-muted">{r.impressions.toLocaleString()}</td>
                          <td className="p-2 text-right text-muted">{r.clicks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {result.robotsTxtRules && (
            <CodeBlock label="robots.txt — agregar estas líneas" code={result.robotsTxtRules} />
          )}

          {result.htaccessRules && (
            <CodeBlock label=".htaccess — agregar antes de # BEGIN WordPress" code={result.htaccessRules} />
          )}

          {result.additionalRecommendations && result.additionalRecommendations.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">Acciones adicionales</span>
              <ul className="space-y-1">
                {result.additionalRecommendations.map((r, i) => (
                  <li key={i} className="text-xs text-muted flex gap-2">
                    <span className="text-accent shrink-0">—</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {result?.error && (
        <div className="rounded-lg border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          {result.error}
        </div>
      )}
    </div>
  );
}
