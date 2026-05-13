import type { Keyword } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent, roasColor } from "@/lib/format";

const matchTypeLabel: Record<string, string> = {
  EXACT: "exacta",
  PHRASE: "frase",
  BROAD: "amplia",
};

export function KeywordsTable({
  keywords,
  currency,
}: {
  keywords: Keyword[];
  currency: string | null;
}) {
  if (keywords.length === 0) {
    return (
      <div className="text-sm text-muted py-4">
        Sin keywords listadas (típico en campañas Performance Max o Display).
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Keyword</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium text-right">QS</th>
            <th className="px-4 py-3 font-medium text-right">Costo</th>
            <th className="px-4 py-3 font-medium text-right">Conv.</th>
            <th className="px-4 py-3 font-medium text-right">ROAS</th>
            <th className="px-4 py-3 font-medium text-right">CTR</th>
            <th className="px-4 py-3 font-medium text-right">CPC</th>
          </tr>
        </thead>
        <tbody>
          {keywords.map((k, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/40">
              <td className="px-4 py-3">
                <div className="font-medium text-text">{k.text}</div>
                <div className="text-xs text-muted">{k.adGroup}</div>
              </td>
              <td className="px-4 py-3 text-xs">
                {(k.matchType && matchTypeLabel[k.matchType]) || k.matchType?.toLowerCase()}
              </td>
              <td className="px-4 py-3 text-right text-xs">
                {k.qualityScore != null ? `${k.qualityScore}/10` : "—"}
              </td>
              <td className="px-4 py-3 text-right">{formatCurrency(k.cost, currency)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(k.conversions, 1)}</td>
              <td className={`px-4 py-3 text-right font-medium ${roasColor(k.roas)}`}>
                {k.cost > 0 ? `${formatNumber(k.roas, 0)}%` : "—"}
              </td>
              <td className="px-4 py-3 text-right">{formatPercent(k.ctr, 2)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(k.avgCpc, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
