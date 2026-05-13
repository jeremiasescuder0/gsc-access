"use client";

import { useState } from "react";
import type { PageRow, RowWithDelta } from "@/lib/gsc-types";
import { formatNumber, formatPercent, formatPosition } from "@/lib/format";
import { Delta } from "./Delta";

type SortKey = "clicks" | "impressions" | "ctr" | "position";
type SortDir = "asc" | "desc";

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
  right = true,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  right?: boolean;
}) {
  const isActive = active === sortKey;
  return (
    <th
      className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-text transition ${right ? "text-right" : "text-left"}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className="ml-1 opacity-60">{isActive ? (dir === "desc" ? "↓" : "↑") : "↕"}</span>
    </th>
  );
}

export function PagesTable({
  pages,
  limit,
  showDelta = true,
}: {
  pages: RowWithDelta<PageRow>[];
  limit?: number;
  showDelta?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("clicks");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "position" ? "asc" : "desc");
    }
  };

  const sorted = [...pages].sort((a, b) => {
    const mul = sortDir === "desc" ? -1 : 1;
    return (a[sortKey] - b[sortKey]) * mul;
  });

  const rows = limit ? sorted.slice(0, limit) : sorted;

  if (rows.length === 0) {
    return <div className="text-sm text-muted py-4">Sin páginas para mostrar.</div>;
  }

  const sh = (label: string, key: SortKey) => (
    <SortHeader label={label} sortKey={key} active={sortKey} dir={sortDir} onSort={handleSort} />
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Página</th>
            {sh("Clicks", "clicks")}
            {showDelta && <th className="px-2 py-3 font-medium text-right">Δ</th>}
            {sh("Impr.", "impressions")}
            {showDelta && <th className="px-2 py-3 font-medium text-right">Δ</th>}
            {sh("CTR", "ctr")}
            {sh("Pos.", "position")}
            {showDelta && <th className="px-2 py-3 font-medium text-right">Δ Pos.</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/40">
              <td className="px-4 py-3">
                <a
                  href={r.page}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-text hover:text-accent transition truncate inline-block max-w-[280px]"
                  title={r.page}
                >
                  {shortenUrl(r.page)}
                </a>
              </td>
              <td className="px-4 py-3 text-right">{formatNumber(r.clicks, 0)}</td>
              {showDelta && (
                <td className="px-2 py-3 text-right">
                  {r.delta ? <Delta value={r.delta.clicks} /> : <span className="text-muted text-xs">—</span>}
                </td>
              )}
              <td className="px-4 py-3 text-right">{formatNumber(r.impressions, 0)}</td>
              {showDelta && (
                <td className="px-2 py-3 text-right">
                  {r.delta ? <Delta value={r.delta.impressions} /> : <span className="text-muted text-xs">—</span>}
                </td>
              )}
              <td className="px-4 py-3 text-right">{formatPercent(r.ctr, 2)}</td>
              <td className="px-4 py-3 text-right">{formatPosition(r.position)}</td>
              {showDelta && (
                <td className="px-2 py-3 text-right">
                  {r.delta ? (
                    <Delta value={r.delta.position} type="position" lowerIsBetter />
                  ) : (
                    <span className="text-muted text-xs">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
