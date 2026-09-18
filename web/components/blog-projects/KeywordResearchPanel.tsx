"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, Sparkles, Check } from "lucide-react";
import type {
  BlogProject,
  KeywordResearchGscEvidence,
  KeywordResearchGeminiEvidence,
} from "@/lib/blog-types";
import { CONTENT_TYPE_LABELS } from "@/lib/blog-types";

const FILTER_MODE_LABEL: Record<string, string> = {
  topic_match: "queries filtradas por relevancia al tema",
  broad_fallback: "sin suficiente match de tema — mejores oportunidades generales del sitio",
};

export function KeywordResearchPanel({ project }: { project: BlogProject }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showClusters, setShowClusters] = useState(false);

  const [gsc, setGsc] = useState<KeywordResearchGscEvidence | null>(
    (project.evidence?.gsc as KeywordResearchGscEvidence | null) || null
  );
  const [gemini, setGemini] = useState<KeywordResearchGeminiEvidence | null>(
    (project.evidence?.gemini as KeywordResearchGeminiEvidence | null) || null
  );

  async function runResearch() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setApplied(false);
    try {
      const res = await fetch(`/api/blog-projects/${project.id}/keyword-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo investigar keywords");
      setGsc(data.project.evidence.gsc);
      setGemini(data.project.evidence.gemini);
      if (data.insufficientData) setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function applySuggestions() {
    if (!gemini) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/blog-projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryKeyword: gemini.suggestedPrimaryKeyword || null,
          secondaryKeywords: gemini.suggestedSecondaryKeywords,
          questionKeywords: gemini.suggestedQuestionKeywords,
          semanticKeywords: gemini.suggestedSemanticKeywords,
          contentType: gemini.suggestedContentType,
          opportunityReason: gemini.reasoningSummary,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo aplicar la sugerencia");
      setApplied(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          Investigar keywords (GSC + Gemini)
        </h2>
      </div>

      <p className="text-xs text-muted">
        Trae queries reales de Search Console para el sitio del cliente, las filtra por relevancia
        al tema, y le pide a Gemini que las agrupe y sugiera keywords. Ninguna métrica se inventa —
        todo lo que ves en las queries viene de GSC.
      </p>

      <button
        onClick={runResearch}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 transition"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {gemini || gsc ? "Volver a investigar" : "Investigar keywords"}
      </button>

      {error && <div className="text-xs text-danger">{error}</div>}
      {message && <div className="text-xs text-warning">{message}</div>}

      {gsc && (
        <div className="text-xs text-muted">
          {gsc.queriesSentToGemini.length} de {gsc.totalQueriesAvailable} queries usadas ·{" "}
          {FILTER_MODE_LABEL[gsc.filterMode] || gsc.filterMode} · período {gsc.range.startDate} →{" "}
          {gsc.range.endDate}
        </div>
      )}

      {gemini && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="space-y-1.5 text-xs">
            <KeywordRow label="Principal" values={[gemini.suggestedPrimaryKeyword]} accent />
            <KeywordRow label="Secundarias" values={gemini.suggestedSecondaryKeywords} />
            <KeywordRow label="Tipo pregunta" values={gemini.suggestedQuestionKeywords} />
            <KeywordRow label="Semánticas" values={gemini.suggestedSemanticKeywords} />
            {gemini.suggestedContentType && (
              <div>
                <span className="text-muted">Tipo de contenido sugerido: </span>
                <span className="text-text">{CONTENT_TYPE_LABELS[gemini.suggestedContentType]}</span>
              </div>
            )}
          </div>

          {gemini.reasoningSummary && (
            <p className="text-xs text-muted italic">&quot;{gemini.reasoningSummary}&quot;</p>
          )}

          <button
            onClick={() => setShowClusters((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition"
          >
            {showClusters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {gemini.clusters.length} cluster{gemini.clusters.length === 1 ? "" : "s"} de keywords
          </button>

          {showClusters && (
            <div className="space-y-2">
              {gemini.clusters.map((c, i) => (
                <div key={i} className="rounded border border-border p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text">{c.cluster_name}</span>
                    <span className="text-xs text-accent">{CONTENT_TYPE_LABELS[c.recommended_content_type]}</span>
                  </div>
                  <div className="text-xs text-muted">{c.search_intent}</div>
                  <div className="text-xs text-muted">{c.queries.join(" · ")}</div>
                  <div className="text-xs text-muted italic">{c.reasoning_summary}</div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={applySuggestions}
            disabled={applying}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-50 transition"
          >
            {applying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {applied && <Check className="w-3.5 h-3.5" />}
            Aplicar sugerencias al proyecto
          </button>
        </div>
      )}
    </div>
  );
}

function KeywordRow({ label, values, accent }: { label: string; values: string[]; accent?: boolean }) {
  const clean = values.filter(Boolean);
  if (clean.length === 0) return null;
  return (
    <div>
      <span className="text-muted">{label}: </span>
      <span className={accent ? "text-accent font-medium" : "text-text"}>{clean.join(", ")}</span>
    </div>
  );
}
