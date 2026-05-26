"use client";

import type { AssetGroup } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

function formatEnum(value: string | number | null | undefined): string {
  if (value == null) return "—";
  return String(value).toLowerCase().replace(/_/g, " ");
}

export function AssetGroupsTable({
  assetGroups,
  currency,
}: {
  assetGroups: AssetGroup[];
  currency: string | null;
}) {
  if (assetGroups.length === 0) {
    return (
      <div className="text-sm text-muted py-4">
        Sin asset groups. Esta campaña puede ser de tipo Search o no tiene datos en el período.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Asset Group</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium text-right">Impr.</th>
            <th className="px-4 py-3 font-medium text-right">Clicks</th>
            <th className="px-4 py-3 font-medium text-right">CTR</th>
            <th className="px-4 py-3 font-medium text-right">Costo</th>
            <th className="px-4 py-3 font-medium text-right">Conv.</th>
          </tr>
        </thead>
        <tbody>
          {assetGroups.map((ag, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/40">
              <td className="px-4 py-3 font-medium text-text max-w-xs">
                <div>{ag.name || "—"}</div>
                {ag.finalUrls.length > 0 && (
                  <div className="text-xs text-muted truncate max-w-xs">{ag.finalUrls[0]}</div>
                )}
              </td>
              <td className="px-4 py-3 text-muted">{formatEnum(ag.status)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(ag.impressions, 0)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(ag.clicks, 0)}</td>
              <td className="px-4 py-3 text-right">{formatPercent(ag.ctr, 2)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(ag.cost, currency)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(ag.conversions, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
