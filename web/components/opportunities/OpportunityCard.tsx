"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, FileEdit, X } from "lucide-react";
import type { Opportunity } from "@/lib/blog-types";
import { CONTENT_TYPE_LABELS } from "@/lib/blog-types";
import { formatNumber } from "@/lib/format";
import { PriorityBadge } from "./PriorityBadge";

const GAP_LABEL: Record<string, string> = {
  none: "Sin contenido existente relacionado",
  medium: "Contenido relacionado parcialmente — revisar antes de crear",
  high: "Ya existe contenido cercano — considerar actualizar en vez de crear nuevo",
};

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const router = useRouter();
  const [converting, setConverting] = useState(false);
  const [ignoring, setIgnoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  async function convert() {
    setConverting(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunity.id}/convert`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el Blog Project");
      router.push(`/blog-projects/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setConverting(false);
    }
  }

  async function ignore() {
    setIgnoring(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunity.id}/ignore`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo ignorar");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIgnoring(false);
    }
  }

  const gsc = opportunity.evidence.gsc;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-medium text-text">{opportunity.suggestedTitle || opportunity.clusterName}</div>
          <div className="text-xs text-muted mt-0.5">{opportunity.topic}</div>
        </div>
        <PriorityBadge priority={opportunity.priorityLabel || "low"} />
      </div>

      {gsc && (
        <div className="text-xs text-muted">
          {gsc.queries.length} queries relacionadas · {formatNumber(gsc.totalImpressions)} impresiones combinadas · posición
          promedio {gsc.avgPosition}
        </div>
      )}

      {opportunity.contentGap && (
        <div
          className={`text-xs rounded border px-2 py-1.5 ${
            opportunity.contentGap.level === "high"
              ? "border-warning/40 bg-warning/5 text-warning"
              : opportunity.contentGap.level === "medium"
              ? "border-muted/40 bg-muted/5 text-muted"
              : "border-success/30 bg-success/5 text-success"
          }`}
        >
          {GAP_LABEL[opportunity.contentGap.level]}
          {opportunity.contentGap.competingUrls.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {opportunity.contentGap.competingUrls.map((u) => (
                <div key={u} className="truncate opacity-80">
                  {u}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-muted italic">&quot;{opportunity.reasoningSummary}&quot;</div>

      {opportunity.recommendedContentType && (
        <div className="text-xs">
          <span className="text-muted">Recomendación: </span>
          <span className="text-accent">{CONTENT_TYPE_LABELS[opportunity.recommendedContentType]}</span>
        </div>
      )}

      <button
        onClick={() => setShowDetail((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition"
      >
        {showDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Ver keywords y detalle del score
      </button>

      {showDetail && (
        <div className="space-y-2 text-xs pt-1 border-t border-border">
          {opportunity.primaryKeyword && (
            <div>
              <span className="text-muted">Principal: </span>
              <span className="text-accent font-medium">{opportunity.primaryKeyword}</span>
            </div>
          )}
          {opportunity.secondaryKeywords.length > 0 && (
            <div>
              <span className="text-muted">Secundarias: </span>
              <span className="text-text">{opportunity.secondaryKeywords.join(", ")}</span>
            </div>
          )}
          {opportunity.questionKeywords.length > 0 && (
            <div>
              <span className="text-muted">Tipo pregunta: </span>
              <span className="text-text">{opportunity.questionKeywords.join(", ")}</span>
            </div>
          )}
          {gsc && (
            <div>
              <span className="text-muted">Queries del cluster: </span>
              <span className="text-text">{gsc.queries.map((q) => q.query).join(" · ")}</span>
            </div>
          )}
          {opportunity.scoreBreakdown && (
            <div className="text-muted">
              Score {opportunity.priorityScore}/100 — señal GSC {opportunity.scoreBreakdown.gscSignal} (
              {Math.round(opportunity.scoreBreakdown.weights.gscSignal * 100)}%), content gap{" "}
              {opportunity.scoreBreakdown.contentGap} ({Math.round(opportunity.scoreBreakdown.weights.contentGap * 100)}%),
              relevancia de negocio {opportunity.scoreBreakdown.businessRelevance} (
              {Math.round(opportunity.scoreBreakdown.weights.businessRelevance * 100)}%). Score interno de priorización, no
              es una métrica de Google.
            </div>
          )}
        </div>
      )}

      {error && <div className="text-xs text-danger">{error}</div>}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={convert}
          disabled={converting || ignoring}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-50 transition"
        >
          {converting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileEdit className="w-3.5 h-3.5" />}
          Crear Blog Project
        </button>
        <button
          onClick={ignore}
          disabled={converting || ignoring}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-muted hover:text-danger hover:bg-danger/10 disabled:opacity-50 transition"
        >
          {ignoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          Ignorar
        </button>
      </div>
    </div>
  );
}
