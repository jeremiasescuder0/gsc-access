"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, AlertTriangle, TrendingDown, TrendingUp, Target, Activity, Radio, Smartphone, Search, Bug } from "lucide-react";
import type { Ga4InsightsRecord, Ga4InsightType } from "@/lib/ga4-types";

const TYPE_META: Record<Ga4InsightType, { label: string; icon: typeof Sparkles }> = {
  drop: { label: "Caída", icon: TrendingDown },
  growth: { label: "Crecimiento", icon: TrendingUp },
  conversion_gap: { label: "Brecha de conversión", icon: Target },
  engagement: { label: "Engagement", icon: Activity },
  channel: { label: "Canal", icon: Radio },
  device: { label: "Dispositivo", icon: Smartphone },
  seo_opportunity: { label: "Oportunidad SEO", icon: Search },
  tracking: { label: "Medición", icon: Bug },
};

const SEVERITY_STYLES = {
  high: "border-danger/40 bg-danger/5",
  medium: "border-warning/40 bg-warning/5",
  low: "border-border bg-surface",
};
const SEVERITY_LABEL = { high: "Alta", medium: "Media", low: "Baja" };
const SOURCE_LABEL = { ga4: "GA4", gsc: "GSC", cross: "GSC + GA4" };

export function InsightsPanel({
  clientSite,
  initial,
  periodDays,
}: {
  clientSite: string;
  initial: Ga4InsightsRecord | null;
  periodDays: number;
}) {
  const [record, setRecord] = useState<Ga4InsightsRecord | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/insights/${encodeURIComponent(clientSite)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron generar los insights");
      setRecord(data.insights);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          Insights con IA
        </h2>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 transition"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : record ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Analizando..." : record ? "Regenerar" : "Generar insights"}
        </button>
      </div>

      {!record && !loading && (
        <p className="text-xs text-muted">
          Gemini interpreta los datos de GA4 (y el cruce con Search Console) y devuelve recomendaciones con la evidencia
          numérica que las sustenta. Se guardan por cliente para no regenerarlas en cada visita.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-danger">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {record && (
        <div className="space-y-3">
          <div className="text-xs text-muted">
            Generado {new Date(record.generatedAt).toLocaleString("es-AR")} · últimos {record.periodDays} días ({record.range.startDate} →{" "}
            {record.range.endDate})
            {record.periodDays !== periodDays && <span className="text-warning"> · el dashboard muestra {periodDays} días, regenerá para alinear</span>}
          </div>
          <p className="text-sm text-text">{record.summary}</p>

          <div className="space-y-2">
            {record.insights.map((i, idx) => {
              const meta = TYPE_META[i.type] || TYPE_META.engagement;
              const Icon = meta.icon;
              return (
                <div key={idx} className={`rounded-lg border p-3 space-y-1.5 ${SEVERITY_STYLES[i.severity]}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-text">
                      <Icon className="w-4 h-4 text-muted" />
                      {i.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded-full border border-border text-muted">{meta.label}</span>
                      <span className="px-1.5 py-0.5 rounded-full border border-border text-muted">Fuente: {SOURCE_LABEL[i.source]}</span>
                      <span className="px-1.5 py-0.5 rounded-full border border-border text-muted">Severidad {SEVERITY_LABEL[i.severity]}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted">
                    <span className="text-text/80">Evidencia:</span> {i.evidence}
                  </div>
                  <div className="text-xs text-text">
                    <span className="text-accent">Recomendación:</span> {i.recommendation}
                  </div>
                  {i.pages.length > 0 && <div className="text-[11px] font-mono text-muted truncate">{i.pages.join(" · ")}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
