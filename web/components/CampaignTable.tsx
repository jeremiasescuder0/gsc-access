"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Campaign } from "@/lib/types";
import {
  channelTypeLabel,
  formatCurrency,
  formatNumber,
  formatPercent,
  roasColor,
} from "@/lib/format";

export function CampaignTable({
  accountId,
  campaigns,
  currency,
}: {
  accountId: string;
  campaigns: Campaign[];
  currency: string | null;
}) {
  const router = useRouter();

  if (campaigns.length === 0) {
    return <div className="text-sm text-muted py-4">Sin campañas para mostrar.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Campaña</th>
            <th className="px-4 py-3 font-medium text-right">Costo</th>
            <th className="px-4 py-3 font-medium text-right">Conv.</th>
            <th className="px-4 py-3 font-medium text-right">Valor</th>
            <th className="px-4 py-3 font-medium text-right">ROAS</th>
            <th className="px-4 py-3 font-medium text-right">CTR</th>
            <th className="px-4 py-3 font-medium text-right">CPC</th>
            <th className="px-2 py-3" aria-hidden></th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c, i) => {
            const href = c.id ? `/accounts/${accountId}/campaigns/${c.id}` : null;
            const clickable = !!href;
            return (
              <tr
                key={i}
                onClick={() => href && router.push(href)}
                className={`border-b border-border last:border-0 ${
                  clickable ? "cursor-pointer hover:bg-bg/40 group" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <div
                    className={`font-medium text-text ${
                      clickable ? "group-hover:text-accent transition" : ""
                    }`}
                  >
                    {c.name}
                  </div>
                  {c.channelType != null && (
                    <div className="text-xs text-muted">
                      {channelTypeLabel(c.channelType)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{formatCurrency(c.cost, currency)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(c.conversions, 1)}</td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(c.conversionsValue, currency)}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${roasColor(c.roas)}`}>
                  {formatNumber(c.roas, 0)}%
                </td>
                <td className="px-4 py-3 text-right">{formatPercent(c.ctr, 2)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(c.avgCpc, currency)}</td>
                <td className="px-2 py-3 text-right">
                  {clickable && (
                    <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent transition inline" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
