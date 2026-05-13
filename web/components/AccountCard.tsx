import Link from "next/link";
import { TrendingUp, AlertCircle } from "lucide-react";
import type { AccountSummary } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent, roasColor } from "@/lib/format";

export function AccountCard({ summary }: { summary: AccountSummary }) {
  return (
    <Link
      href={`/accounts/${summary.accountId}`}
      className="block rounded-lg border border-border bg-surface p-5 hover:border-accent transition group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text truncate group-hover:text-accent transition">
            {summary.account}
          </h3>
          <div className="text-xs text-muted mt-0.5">
            ID {summary.accountId} · {summary.currency || "USD"}
          </div>
        </div>
        {summary.hasActivity ? (
          <TrendingUp className="w-4 h-4 text-success shrink-0" />
        ) : (
          <span title="Sin actividad" className="inline-flex shrink-0">
            <AlertCircle className="w-4 h-4 text-warning" />
          </span>
        )}
      </div>

      {summary.hasActivity ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Gasto" value={formatCurrency(summary.totalCost, summary.currency)} />
          <Metric
            label="ROAS"
            value={`${formatNumber(summary.roas, 0)}%`}
            valueClass={roasColor(summary.roas)}
          />
          <Metric label="Conversiones" value={formatNumber(summary.totalConversions, 0)} />
          <Metric label="CTR" value={formatPercent(summary.avgCtr, 2)} />
        </div>
      ) : (
        <div className="text-xs text-muted py-2">Sin actividad en los últimos 30 días</div>
      )}

      <div className="mt-4 pt-3 border-t border-border text-xs text-muted">
        {summary.campaignsCount} campañas
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
  valueClass = "text-text",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`font-medium ${valueClass}`}>{value}</div>
    </div>
  );
}
