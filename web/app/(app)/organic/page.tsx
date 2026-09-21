import { getSites } from "@/lib/gsc-data";
import { SiteSelector } from "@/components/SiteSelector";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrganicHomePage() {
  let sites;
  let error: string | null = null;

  try {
    sites = await getSites();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger bg-surface p-6">
        <h2 className="text-lg font-semibold text-danger mb-2">No pude listar los sitios</h2>
        <pre className="text-xs text-muted whitespace-pre-wrap">{error}</pre>
        <p className="text-sm text-muted mt-4">
          Verificá que <code className="text-accent">token.json</code> tenga el scope{" "}
          <code>webmasters.readonly</code> y que la cuenta tenga sitios verificados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Tráfico orgánico</h1>
        <p className="text-sm text-muted">
          Datos de Google Search Console — elegí un sitio para analizar performance.
        </p>
      </div>

      <SiteSelector sites={sites || []} />
    </div>
  );
}
