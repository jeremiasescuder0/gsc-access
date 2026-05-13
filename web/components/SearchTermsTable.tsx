import type { SearchTerm } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

const statusLabel: Record<string, string> = {
  ADDED: "agregada",
  EXCLUDED: "negativa",
  ADDED_EXCLUDED: "agregada/negativa",
  NONE: "—",
};

export function SearchTermsTable({
  searchTerms,
  currency,
  showCampaign = false,
}: {
  searchTerms: SearchTerm[];
  currency: string | null;
  showCampaign?: boolean;
}) {
  if (searchTerms.length === 0) {
    return <div className="text-sm text-muted py-4">Sin search terms con actividad.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Search term</th>
            {showCampaign && <th className="px-4 py-3 font-medium">Campaña / Ad group</th>}
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium text-right">Costo</th>
            <th className="px-4 py-3 font-medium text-right">Conv.</th>
            <th className="px-4 py-3 font-medium text-right">CTR</th>
            <th className="px-4 py-3 font-medium text-right">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {searchTerms.map((t, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/40">
              <td className="px-4 py-3 font-medium text-text">{t.searchTerm}</td>
              {showCampaign && <td className="px-4 py-3 text-xs text-muted">{t.campaign}</td>}
              <td className="px-4 py-3 text-xs text-muted">
                {(t.status && statusLabel[t.status]) || t.status?.toLowerCase() || "—"}
              </td>
              <td className="px-4 py-3 text-right">{formatCurrency(t.cost, currency)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(t.conversions, 1)}</td>
              <td className="px-4 py-3 text-right">{formatPercent(t.ctr, 2)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(t.clicks, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
