import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { getSitePerformance } from "@/lib/gsc-data";
import { ChatPanelLazy as ChatPanel } from "@/components/ChatPanelLazy";
import { OrganicTabs } from "@/components/OrganicTabs";
import { Delta } from "@/components/Delta";
import { formatNumber, formatPercent, formatPosition } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrganicSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ siteUrl: string }>;
  searchParams: Promise<{ blogPattern?: string }>;
}) {
  const { siteUrl: encoded } = await params;
  const { blogPattern } = await searchParams;
  const siteUrl = decodeURIComponent(encoded);

  let data;
  let error: string | null = null;

  try {
    data = await getSitePerformance(siteUrl, {
      periodDays: 30,
      blogPattern: blogPattern || "/blog/",
    });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  if (error) {
    const isPermissionError = /insufficient permission|does not have/i.test(error);
    return (
      <div className="space-y-4">
        <Link
          href="/organic"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a sitios
        </Link>
        <div className="rounded-lg border border-danger bg-surface p-6">
          <h2 className="text-lg font-semibold text-danger mb-2">
            {isPermissionError ? "Sin permisos en este sitio" : "Error consultando GSC"}
          </h2>
          {isPermissionError ? (
            <div className="text-sm text-muted space-y-2">
              <p>
                La cuenta OAuth autenticada (la del{" "}
                <code className="text-accent">token.json</code>) no tiene permisos suficientes
                para leer data de <code className="text-accent">{siteUrl}</code> en Google Search
                Console.
              </p>
              <p>Para arreglarlo:</p>
              <ol className="list-decimal pl-5 space-y-1 text-xs">
                <li>
                  Entrar al{" "}
                  <a
                    className="text-accent hover:underline"
                    href="https://search.google.com/search-console"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Search Console del dueño del sitio
                  </a>
                  .
                </li>
                <li>
                  Settings → Users and permissions → agregar la cuenta OAuth como{" "}
                  <strong>Full user</strong>.
                </li>
                <li>
                  Alternativamente, re-autenticar con otra cuenta que sí tenga acceso (correr{" "}
                  <code className="text-accent">npm run auth</code> en la raíz).
                </li>
              </ol>
            </div>
          ) : (
            <pre className="text-xs text-muted whitespace-pre-wrap">{error}</pre>
          )}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const t = data.totals;

  return (
    <div className="space-y-6">
      <Link
        href="/organic"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition"
      >
        <ChevronLeft className="w-4 h-4" /> Volver a sitios
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{siteUrl}</h1>
        <p className="text-sm text-muted">
          {data.ranges.current.startDate} → {data.ranges.current.endDate} (últimos 30 días) · comparado
          contra período previo y mismo período del año anterior
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Clicks"
          value={formatNumber(t.current.clicks, 0)}
          deltaPrev={t.deltaPrev.clicks}
          deltaYoY={t.deltaYoY.clicks}
        />
        <Kpi
          label="Impresiones"
          value={formatNumber(t.current.impressions, 0)}
          deltaPrev={t.deltaPrev.impressions}
          deltaYoY={t.deltaYoY.impressions}
        />
        <Kpi
          label="CTR"
          value={formatPercent(t.current.ctr, 2)}
          deltaPrev={t.deltaPrev.ctr}
          deltaYoY={t.deltaYoY.ctr}
          deltaType="percent"
        />
        <Kpi
          label="Posición promedio"
          value={formatPosition(t.current.position)}
          deltaPrev={t.deltaPrev.position}
          deltaYoY={t.deltaYoY.position}
          deltaType="position"
          lowerIsBetter
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Suspense>
            <OrganicTabs data={data} />
          </Suspense>
        </div>

        <div className="lg:col-span-1">
          <ChatPanel
            siteUrl={siteUrl}
            contextLabel={`Orgánico · ${siteUrl}`}
            suggestions={[
              "¿Qué queries crecieron más mes a mes y por qué pueden estar creciendo?",
              "¿Qué páginas perdieron más tráfico vs período previo?",
              "¿Cuáles son las 5 oportunidades más ganables (posición 11-20 con buen volumen)?",
              "¿Hay patrones de qué blogs funcionan mejor?",
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
  deltaPrev,
  deltaYoY,
  deltaType = "number",
  lowerIsBetter = false,
}: {
  label: string;
  value: string;
  deltaPrev: number;
  deltaYoY: number;
  deltaType?: "number" | "percent" | "position";
  lowerIsBetter?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="text-lg font-semibold text-text mb-2">{value}</div>
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted w-12">vs prev</span>
          <Delta value={deltaPrev} type={deltaType} lowerIsBetter={lowerIsBetter} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted w-12">vs YoY</span>
          <Delta value={deltaYoY} type={deltaType} lowerIsBetter={lowerIsBetter} />
        </div>
      </div>
    </div>
  );
}
