"use client";

import { useState } from "react";
import type { CrossSourceRow, CrossSourceFlag } from "@/lib/cross-source";
import { FLAG_LABELS } from "@/lib/cross-source";
import { formatNumber, formatPercent, formatPosition } from "@/lib/format";
import { formatDuration, shortenPath } from "@/lib/ga4-format";

const FLAG_STYLES: Record<CrossSourceFlag, string> = {
  traffic_no_conversion: "text-danger bg-danger/10 border-danger/30",
  engaged_low_visibility: "text-success bg-success/10 border-success/30",
  visible_low_engagement: "text-warning bg-warning/10 border-warning/30",
};

export function CrossSourceTable({ rows }: { rows: CrossSourceRow[] }) {
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const shown = (onlyFlagged ? rows.filter((r) => r.flags.length > 0) : rows).slice(0, 60);

  if (rows.length === 0) return <div className="text-sm text-muted py-4">Sin datos para cruzar en el período.</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted">
          <span className="text-text">GSC</span> = lo que Google mostró (impresiones, clicks, posición) ·{" "}
          <span className="text-text">GA4</span> = qué hizo la gente que entró (sesiones, engagement, key events). Las señales
          las calcula la app con reglas fijas, no la IA.
        </p>
        <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
          <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} className="accent-accent" />
          Solo con señales ({rows.filter((r) => r.flags.length > 0).length})
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-3 py-2 text-left font-medium">Página</th>
              <th className="px-3 py-2 text-right font-medium text-accent/80">Impr.</th>
              <th className="px-3 py-2 text-right font-medium text-accent/80">Clicks</th>
              <th className="px-3 py-2 text-right font-medium text-accent/80">Pos.</th>
              <th className="px-3 py-2 text-right font-medium">Sesiones</th>
              <th className="px-3 py-2 text-right font-medium">Engag.</th>
              <th className="px-3 py-2 text-right font-medium">Tiempo</th>
              <th className="px-3 py-2 text-right font-medium">Key ev.</th>
              <th className="px-3 py-2 text-left font-medium">Señal</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.page} className="border-b border-border last:border-0 hover:bg-bg/40">
                <td className="px-3 py-2 font-mono text-text max-w-[260px] truncate" title={r.page}>
                  {shortenPath(r.page, 45)}
                </td>
                <td className="px-3 py-2 text-right text-muted">{r.gsc ? formatNumber(r.gsc.impressions) : "—"}</td>
                <td className="px-3 py-2 text-right text-muted">{r.gsc ? formatNumber(r.gsc.clicks) : "—"}</td>
                <td className="px-3 py-2 text-right text-muted">{r.gsc ? formatPosition(r.gsc.position) : "—"}</td>
                <td className="px-3 py-2 text-right text-muted">{r.ga4 ? formatNumber(r.ga4.sessions) : "—"}</td>
                <td className="px-3 py-2 text-right text-muted">{r.ga4 ? formatPercent(r.ga4.engagementRate, 0) : "—"}</td>
                <td className="px-3 py-2 text-right text-muted">{r.ga4 ? formatDuration(r.ga4.avgEngagementTime) : "—"}</td>
                <td className="px-3 py-2 text-right text-muted">{r.ga4 ? formatNumber(r.ga4.keyEvents) : "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.flags.map((f) => (
                      <span key={f} className={`px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${FLAG_STYLES[f]}`}>
                        {FLAG_LABELS[f]}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
