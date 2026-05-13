import type { AccountSummary } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent, roasColor } from "@/lib/format";

export function MetricsGrid({ summary }: { summary: AccountSummary }) {
  const cards = [
    { label: "Gasto total", value: formatCurrency(summary.totalCost, summary.currency) },
    {
      label: "ROAS",
      value: `${formatNumber(summary.roas, 0)}%`,
      className: roasColor(summary.roas),
    },
    { label: "Conversiones", value: formatNumber(summary.totalConversions, 1) },
    {
      label: "Valor conv.",
      value: formatCurrency(summary.totalConversionsValue, summary.currency),
    },
    { label: "CPA", value: formatCurrency(summary.cpa, summary.currency) },
    { label: "Clicks", value: formatNumber(summary.totalClicks, 0) },
    { label: "Impresiones", value: formatNumber(summary.totalImpressions, 0) },
    { label: "CTR", value: formatPercent(summary.avgCtr, 2) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs text-muted mb-1">{c.label}</div>
          <div className={`text-lg font-semibold ${c.className || "text-text"}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
