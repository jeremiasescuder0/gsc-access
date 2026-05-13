"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import type { QueryRow } from "@/lib/gsc-types";
import { formatNumber, formatPercent, formatPosition } from "@/lib/format";

type SortKey = "impressions" | "clicks" | "ctr" | "position" | "potential";
type SortDir = "asc" | "desc";

function potential(r: QueryRow): number {
  // Estimated clicks if it reaches pos 3 (avg CTR ~10%)
  return Math.round(r.impressions * 0.1);
}

function priorityLabel(score: number): { label: string; cls: string } {
  if (score >= 50) return { label: "Alta", cls: "text-success" };
  if (score >= 15) return { label: "Media", cls: "text-warning" };
  return { label: "Baja", cls: "text-muted" };
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const isActive = active === sortKey;
  return (
    <th
      className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:text-text transition"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className="ml-1 opacity-60">{isActive ? (dir === "desc" ? "↓" : "↑") : "↕"}</span>
    </th>
  );
}

export function OpportunitiesTable({ opportunities }: { opportunities: QueryRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("potential");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (opportunities.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        Sin queries en posiciones 11-30 con volumen relevante. Esto suele significar que el sitio
        rankea muy alto (top 10) o muy bajo ({">"}30) sin un cluster claro en la zona ganable.
      </div>
    );
  }

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "position" ? "asc" : "desc");
    }
  };

  const sorted = [...opportunities].sort((a, b) => {
    const mul = sortDir === "desc" ? -1 : 1;
    if (sortKey === "potential") return (potential(a) - potential(b)) * mul;
    return (a[sortKey] - b[sortKey]) * mul;
  });

  const sh = (label: string, key: SortKey) => (
    <SortHeader label={label} sortKey={key} active={sortKey} dir={sortDir} onSort={handleSort} />
  );

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted">
        Queries entre posición 11 y 30 con impresiones significativas. La columna{" "}
        <strong className="text-text">Potencial</strong> estima clicks adicionales si la query
        escala a top 3 (CTR ~10%). Ordená por potencial para priorizar qué optimizar primero.
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">
                <Target className="w-3 h-3 inline mr-1 text-warning" />
                Query
              </th>
              {sh("Impr.", "impressions")}
              {sh("Clicks", "clicks")}
              {sh("CTR", "ctr")}
              {sh("Pos.", "position")}
              {sh("Potencial", "potential")}
              <th className="px-4 py-3 font-medium text-right">Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const pot = potential(r);
              const { label, cls } = priorityLabel(pot);
              return (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/40">
                  <td className="px-4 py-3 font-medium text-text">{r.query}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(r.impressions, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(r.clicks, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(r.ctr, 2)}</td>
                  <td className="px-4 py-3 text-right font-medium text-warning">
                    {formatPosition(r.position)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-accent">+{formatNumber(pot, 0)}</td>
                  <td className={`px-4 py-3 text-right text-xs font-medium ${cls}`}>{label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
