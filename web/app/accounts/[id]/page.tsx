import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getAccountById, summarizeAccount } from "@/lib/ads-data";
import { MetricsGrid } from "@/components/MetricsGrid";
import { CampaignTable } from "@/components/CampaignTable";
import { ChatPanelLazy as ChatPanel } from "@/components/ChatPanelLazy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getAccountById(id);
  if (!account) notFound();

  const summary = summarizeAccount(account);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al portfolio
        </Link>
      </div>

      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{account.account}</h1>
          <p className="text-sm text-muted">
            ID {account.accountId} · {account.currency || "USD"} · últimos 30 días
          </p>
        </div>
        {!summary.hasActivity && (
          <div className="text-sm text-warning border border-warning/40 bg-warning/10 px-3 py-1 rounded">
            Sin actividad en el período
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MetricsGrid summary={summary} />

          <section>
            <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">
              Campañas
            </h2>
            <CampaignTable
              accountId={account.accountId}
              campaigns={account.campaigns}
              currency={account.currency}
            />
          </section>
        </div>

        <div className="lg:col-span-1">
          <ChatPanel
            accountId={account.accountId}
            contextLabel={account.account}
            suggestions={[
              "Dame un diagnóstico de performance en 3 puntos.",
              "¿Qué campañas pausarías o donde aumentarías budget?",
              "¿Hay search terms para sumar como negativos?",
            ]}
          />
        </div>
      </div>
    </div>
  );
}
