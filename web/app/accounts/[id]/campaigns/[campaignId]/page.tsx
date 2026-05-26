import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getAccountById, getCampaignDetail } from "@/lib/ads-data";
import { ChatPanelLazy as ChatPanel } from "@/components/ChatPanelLazy";
import { CampaignTabs } from "@/components/CampaignTabs";
import {
  biddingStrategyLabel,
  channelTypeLabel,
  formatCurrency,
  formatNumber,
  formatPercent,
  roasColor,
} from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string; campaignId: string }>;
}) {
  const { id, campaignId } = await params;

  const account = await getAccountById(id);
  if (!account) notFound();

  const detail = await getCampaignDetail(id, campaignId);
  if (!detail.campaign) notFound();

  const c = detail.campaign;
  const currency = account.currency;

  const channelLabel = channelTypeLabel(c.channelType);
  const biddingLabel = biddingStrategyLabel(c.biddingStrategyType);
  const statusLabel = typeof c.status === "string" ? c.status.toLowerCase() : c.status ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/accounts/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition"
        >
          <ChevronLeft className="w-4 h-4" /> {account.account}
        </Link>
      </div>

      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
          <p className="text-sm text-muted">
            {channelLabel} · puja {biddingLabel} · estado {statusLabel}
            {c.dailyBudget > 0 && (
              <> · budget diario {formatCurrency(c.dailyBudget, currency)}</>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Costo" value={formatCurrency(c.cost, currency)} />
        <Kpi
          label="ROAS"
          value={c.cost > 0 ? `${formatNumber(c.roas, 0)}%` : "—"}
          className={c.cost > 0 ? roasColor(c.roas) : undefined}
        />
        <Kpi label="Conversiones" value={formatNumber(c.conversions, 1)} />
        <Kpi label="Valor conv." value={formatCurrency(c.conversionsValue, currency)} />
        <Kpi label="CPA" value={c.conversions > 0 ? formatCurrency(c.cost / c.conversions, currency) : "—"} />
        <Kpi label="Clicks" value={formatNumber(c.clicks, 0)} />
        <Kpi label="Impresiones" value={formatNumber(c.impressions, 0)} />
        <Kpi label="CTR" value={formatPercent(c.ctr, 2)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <CampaignTabs detail={detail} currency={currency} />
        </div>

        <div className="lg:col-span-1">
          <ChatPanel
            accountId={id}
            campaignId={campaignId}
            contextLabel={`${account.account} → ${c.name}`}
            suggestions={[
              "Auditá los headlines de cada anuncio: ¿cuáles son débiles, genéricos o muy similares entre sí? Sugerí 3 reemplazos concretos.",
              "¿Las descriptions cubren los beneficios clave del negocio o son genéricas? Reescribí la peor.",
              "Identificá keywords con costo alto y 0 conversiones que habría que pausar.",
              "¿Hay search terms irrelevantes que sumarías como negativas para cortar gasto?",
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  className = "text-text",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={`text-lg font-semibold ${className}`}>{value}</div>
    </div>
  );
}
