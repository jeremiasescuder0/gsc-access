import type { AdGroup } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export function AdGroupsTable({
  adGroups,
  currency,
}: {
  adGroups: AdGroup[];
  currency: string | null;
}) {
  if (adGroups.length === 0) {
    return <div className="text-sm text-muted py-4">Sin ad groups con actividad.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Ad group</th>
            <th className="px-4 py-3 font-medium text-right">Costo</th>
            <th className="px-4 py-3 font-medium text-right">Conv.</th>
            <th className="px-4 py-3 font-medium text-right">CTR</th>
            <th className="px-4 py-3 font-medium text-right">CPC</th>
            <th className="px-4 py-3 font-medium text-right">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {adGroups.map((g, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/40">
              <td className="px-4 py-3 font-medium text-text">{g.name}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(g.cost, currency)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(g.conversions, 1)}</td>
              <td className="px-4 py-3 text-right">{formatPercent(g.ctr, 2)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(g.avgCpc, currency)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(g.clicks, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
