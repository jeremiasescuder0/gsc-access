import Link from "next/link";
import { Search } from "lucide-react";
import { describeAdsError, getAllAccounts, summarizeAccount } from "@/lib/ads-data";
import { AccountCard } from "@/components/AccountCard";
import { ChatPanelLazy as ChatPanel } from "@/components/ChatPanelLazy";
import { formatCurrency, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  let accounts;
  let error: string | null = null;

  try {
    const data = await getAllAccounts();
    accounts = data.map(summarizeAccount);
  } catch (err) {
    error = describeAdsError(err);
  }

  if (error) {
    const isNoAdsAccount = /not associated with any Ads accounts/i.test(error);
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-6">
        <h2 className="text-lg font-semibold text-warning mb-2">
          {isNoAdsAccount ? "Esta cuenta no tiene acceso a Google Ads" : "No pude cargar las cuentas"}
        </h2>
        {isNoAdsAccount ? (
          <div className="text-sm text-muted space-y-3">
            <p>
              La cuenta OAuth autenticada no figura como usuario en ningún Google Ads account.
              Para usar la sección Ads, hay que:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-xs">
              <li>
                Pedir al admin del MCC que invite esta cuenta como usuario desde Google Ads →
                Tools → Access and security.
              </li>
              <li>Aceptar la invitación desde Gmail.</li>
              <li>Reiniciar el dev server (<code className="text-accent">npm run dev</code>).</li>
            </ol>
            <p>Mientras tanto, podés usar la sección orgánico:</p>
            <Link
              href="/organic"
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded bg-accent text-white hover:bg-blue-600 transition text-sm"
            >
              <Search className="w-4 h-4" /> Ir a Orgánico
            </Link>
          </div>
        ) : (
          <>
            <pre className="text-xs text-muted whitespace-pre-wrap">{error}</pre>
            <p className="text-sm text-muted mt-4">
              Verificá que <code className="text-accent">../.env</code> tenga las credenciales y
              que <code className="text-accent">../token.json</code> exista.
            </p>
          </>
        )}
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-muted">
        Sin cuentas hijo encontradas en el MCC.
      </div>
    );
  }

  const active = accounts.filter((a) => a.hasActivity);
  const totalSpend = active.reduce((s, a) => s + a.totalCost, 0);
  const totalValue = active.reduce((s, a) => s + a.totalConversionsValue, 0);
  const totalConversions = active.reduce((s, a) => s + a.totalConversions, 0);
  const portfolioRoas = totalSpend > 0 ? (totalValue / totalSpend) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Portfolio</h1>
        <p className="text-sm text-muted">
          {accounts.length} cuentas · {active.length} activas · últimos 30 días
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Cuentas activas" value={`${active.length} / ${accounts.length}`} />
        <Kpi label="Gasto total" value={formatCurrency(totalSpend)} />
        <Kpi label="Conversiones" value={formatNumber(totalConversions, 0)} />
        <Kpi label="ROAS portfolio" value={`${formatNumber(portfolioRoas, 0)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">
            Cuentas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map((s) => (
              <AccountCard key={s.accountId} summary={s} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">
            Asistente
          </h2>
          <ChatPanel
            contextLabel="Portfolio completo"
            suggestions={[
              "¿Qué cuenta tiene el mejor ROAS y cuál el peor?",
              "¿Dónde puedo reasignar presupuesto sin riesgo?",
              "Listame las cuentas inactivas y qué chequear en cada una.",
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="text-lg font-semibold text-text">{value}</div>
    </div>
  );
}
