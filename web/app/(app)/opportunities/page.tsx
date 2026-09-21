import { Suspense } from "react";
import { listClientProfiles, listOpportunities } from "@/lib/blog-data";
import { OpportunityClientPicker } from "@/components/opportunities/OpportunityClientPicker";
import { ScanOpportunitiesButton } from "@/components/opportunities/ScanOpportunitiesButton";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ clientSite?: string }>;
}) {
  const { clientSite } = await searchParams;
  const clients = await listClientProfiles();
  const opportunities = clientSite ? await listOpportunities({ clientSite, status: "open" }) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Oportunidades</h1>
        <p className="text-sm text-muted">
          Backlog de contenido armado a partir de Search Console + Gemini. Elegí un cliente, escaneá, y
          convertí directo a Blog Project — las keywords y la evidencia ya vienen cargadas.
        </p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Suspense>
          <OpportunityClientPicker clients={clients.map((c) => ({ gscSite: c.gscSite, clientName: c.clientName }))} />
        </Suspense>
        {clientSite && <ScanOpportunitiesButton clientSite={clientSite} />}
      </div>

      {!clientSite ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
          Elegí un cliente arriba para ver o escanear su backlog de oportunidades.
        </div>
      ) : opportunities.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
          Sin oportunidades abiertas todavía para este cliente. Tocá &quot;Escanear oportunidades&quot; — trae
          las queries de Search Console de los últimos 90 días, las cruza con el inventario de contenido, y
          les pide a Gemini que arme el backlog.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opportunities.map((o) => (
            <OpportunityCard key={o.id} opportunity={o} />
          ))}
        </div>
      )}
    </div>
  );
}
