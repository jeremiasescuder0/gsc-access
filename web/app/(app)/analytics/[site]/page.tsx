import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getClientProfile } from "@/lib/blog-data";
import { getGa4Overview } from "@/lib/ga4-data";
import { Ga4Overview } from "@/components/analytics/Ga4Overview";
import { ChatPanelLazy as ChatPanel } from "@/components/ChatPanelLazy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ periodDays?: string }>;
}) {
  const { site: encoded } = await params;
  const { periodDays: periodParam } = await searchParams;
  const gscSite = decodeURIComponent(encoded);
  const periodDays = [7, 30, 90].includes(Number(periodParam)) ? Number(periodParam) : 30;

  const profile = await getClientProfile(gscSite);

  const back = (
    <Link href="/analytics" className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition">
      <ChevronLeft className="w-4 h-4" /> Volver a Analytics
    </Link>
  );

  if (!profile) {
    return (
      <div className="space-y-4">
        {back}
        <div className="rounded-lg border border-danger bg-surface p-6 text-sm text-danger">Cliente no encontrado.</div>
      </div>
    );
  }

  if (!profile.ga4PropertyId) {
    return (
      <div className="space-y-4">
        {back}
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-6 text-sm">
          <div className="font-medium text-warning mb-1">{profile.clientName} no tiene propiedad GA4 asignada</div>
          <p className="text-muted">
            Asignala desde{" "}
            <Link href={`/clients/${encodeURIComponent(gscSite)}`} className="text-accent hover:underline">
              el perfil del cliente
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  let data;
  let error: string | null = null;
  try {
    data = await getGa4Overview(profile.ga4PropertyId, { periodDays });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  if (error || !data) {
    const isPermission = /permission|403|does not have|insufficient/i.test(error || "");
    return (
      <div className="space-y-4">
        {back}
        <div className="rounded-lg border border-danger bg-surface p-6">
          <h2 className="text-lg font-semibold text-danger mb-2">
            {isPermission ? "Sin acceso a esta propiedad GA4" : "Error consultando Google Analytics"}
          </h2>
          {isPermission ? (
            <p className="text-sm text-muted">
              La cuenta Google autenticada en la app no tiene rol de Viewer en la propiedad{" "}
              <code className="text-accent">{profile.ga4PropertyId}</code>. Pedile al dueño de la propiedad que la agregue
              en GA4 → Admin → Property access management, o verificá que el ID sea el correcto en el perfil.
            </p>
          ) : (
            <pre className="text-xs text-muted whitespace-pre-wrap">{error}</pre>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {back}

      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{profile.clientName}</h1>
          <p className="text-sm text-muted">
            GA4 · propiedad {profile.ga4PropertyId} · {data.ranges.current.startDate} → {data.ranges.current.endDate} (últimos{" "}
            {periodDays} días) · comparado contra período previo y mismo período del año anterior
          </p>
        </div>
        <div className="flex rounded border border-border overflow-hidden text-xs">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/analytics/${encodeURIComponent(gscSite)}?periodDays=${d}`}
              className={`px-3 py-1.5 font-medium transition ${
                d === periodDays ? "bg-accent/10 text-accent" : "text-muted hover:text-text"
              }`}
            >
              {d} días
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Ga4Overview data={data} />
        </div>
        <div className="lg:col-span-1">
          <ChatPanel
            siteUrl={gscSite}
            ga4PropertyId={profile.ga4PropertyId}
            contextLabel={`Analytics · ${profile.clientName}`}
            suggestions={[
              "¿Qué landing pages traen tráfico pero no generan key events?",
              "¿Qué canal tiene mejor tasa de engagement y por qué?",
              "¿Cómo cambió el comportamiento vs el período anterior?",
              "¿Qué debería optimizar primero para mejorar las conversiones?",
            ]}
          />
        </div>
      </div>
    </div>
  );
}
