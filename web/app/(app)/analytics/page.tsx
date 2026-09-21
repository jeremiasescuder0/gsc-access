import Link from "next/link";
import { BarChart3, Circle, CheckCircle2 } from "lucide-react";
import { listClientProfiles } from "@/lib/blog-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsHomePage() {
  const clients = await listClientProfiles();
  const withGa4 = clients.filter((c) => c.ga4PropertyId);
  const withoutGa4 = clients.filter((c) => !c.ga4PropertyId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Analytics</h1>
        <p className="text-sm text-muted">
          Google Analytics 4 por cliente: sesiones, engagement, conversiones, canales y landing pages.
          Para conectar un cliente, asignale su propiedad GA4 desde su perfil.
        </p>
      </div>

      {withGa4.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted uppercase tracking-wide">Conectados ({withGa4.length})</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {withGa4.map((c) => (
              <Link
                key={c.gscSite}
                href={`/analytics/${encodeURIComponent(c.gscSite)}`}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-surface hover:border-accent transition"
              >
                <BarChart3 className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text truncate">{c.clientName}</div>
                  <div className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success" /> propiedad {c.ga4PropertyId}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {withoutGa4.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted uppercase tracking-wide">Sin propiedad asignada ({withoutGa4.length})</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {withoutGa4.map((c) => (
              <Link
                key={c.gscSite}
                href={`/clients/${encodeURIComponent(c.gscSite)}`}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-surface opacity-70 hover:opacity-100 hover:border-warning transition"
              >
                <Circle className="w-4 h-4 shrink-0 mt-0.5 text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text truncate">{c.clientName}</div>
                  <div className="text-xs text-warning mt-0.5">Asignar propiedad GA4 en el perfil →</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
