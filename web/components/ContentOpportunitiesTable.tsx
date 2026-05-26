"use client";

import { Lightbulb, TrendingUp, AlertTriangle, Globe, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { SitePerformance } from "@/lib/gsc-types";
import { classifyContentOpportunities, difficultyFromPosition } from "@/lib/content-opportunities";
import { formatNumber, formatPercent, formatPosition } from "@/lib/format";

type AdsSearchTerm = {
  searchTerm: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
};

type AdsKeywordsResponse = {
  searchTerms?: AdsSearchTerm[];
  source: "ads" | "none";
  reason?: string;
  clientName?: string;
  industry?: string;
  error?: string;
};

function SectionHeader({ icon: Icon, title, count, color }: {
  icon: typeof Lightbulb;
  title: string;
  count: number | null;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${color}`}>
      <Icon className="w-4 h-4" />
      {title}
      {count !== null && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-bg text-muted font-normal">{count}</span>
      )}
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
      {message}
    </div>
  );
}

function AdsKeywordsSection({ siteUrl }: { siteUrl: string }) {
  const [state, setState] = useState<{ loading: boolean; data: AdsKeywordsResponse | null }>({ loading: true, data: null });

  useEffect(() => {
    const encoded = encodeURIComponent(siteUrl);
    fetch(`/api/organic/${encoded}/ads-keywords`)
      .then((r) => r.json())
      .then((data) => setState({ loading: false, data }))
      .catch(() => setState({ loading: false, data: null }));
  }, [siteUrl]);

  if (state.loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted py-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando keywords del rubro desde Ads...
      </div>
    );
  }

  if (!state.data || state.data.source === "none") {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        Este cliente no tiene cuenta Google Ads vinculada. Los temas de blog de arriba se calculan solo desde GSC.
      </div>
    );
  }

  if (state.data.error) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        No se pudo cargar los search terms de Ads: {state.data.error}
      </div>
    );
  }

  const terms = state.data.searchTerms || [];
  if (terms.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        Sin search terms en los últimos 30 días para esta cuenta.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {state.data.industry && (
        <p className="text-xs text-muted">
          Rubro: <span className="text-text">{state.data.industry}</span>
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Keyword (search term real)</th>
              <th className="px-4 py-3 font-medium text-right">Impr. Ads</th>
              <th className="px-4 py-3 font-medium text-right">Clicks Ads</th>
              <th className="px-4 py-3 font-medium text-right">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {terms.slice(0, 30).map((st, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/40">
                <td className="px-4 py-3 font-medium text-text max-w-xs truncate">{st.searchTerm}</td>
                <td className="px-4 py-3 text-right">{formatNumber(st.impressions, 0)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(st.clicks, 0)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(st.conversions, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        {terms.length} keywords del rubro · usá estas como base para los artículos de blog del cliente
      </p>
    </div>
  );
}

export function ContentOpportunitiesTable({ data }: { data: SitePerformance }) {
  const { blogTopics, quickWins, lowCtr, siteCtr } = classifyContentOpportunities(data);
  const total = blogTopics.length + quickWins.length + lowCtr.length;

  if (total === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted text-center">
        Sin oportunidades de contenido detectadas en este período. Probá con más días de datos.
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Exploración del rubro — Ads search terms */}
      <div className="space-y-2">
        <SectionHeader
          icon={Globe}
          title="Exploración del rubro — keywords reales de Ads"
          count={null}
          color="text-purple-400"
        />
        <p className="text-xs text-muted">
          Search terms que disparan los anuncios del cliente. No están limitados por el contenido actual del sitio — son el universo real de búsquedas del rubro.
        </p>
        <AdsKeywordsSection siteUrl={data.siteUrl} />
      </div>

      {/* Blog Topics */}
      <div className="space-y-2">
        <SectionHeader
          icon={Lightbulb}
          title="Temas nuevos de blog"
          count={blogTopics.length}
          color="text-accent"
        />
        <p className="text-xs text-muted">
          Queries con demanda que no tienen artículo de blog. Candidatos directos a contenido nuevo.
        </p>
        {blogTopics.length === 0 ? (
          <EmptyRow message="Todos los temas con demanda ya tienen una página de blog." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Query</th>
                  <th className="px-4 py-3 font-medium text-right">Impr.</th>
                  <th className="px-4 py-3 font-medium text-right">Clicks</th>
                  <th className="px-4 py-3 font-medium text-right">CTR</th>
                  <th className="px-4 py-3 font-medium text-right">Pos.</th>
                  <th className="px-4 py-3 font-medium text-right">Dificultad</th>
                </tr>
              </thead>
              <tbody>
                {blogTopics.map((r, i) => {
                  const diff = difficultyFromPosition(r.position);
                  return (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/40">
                      <td className="px-4 py-3 font-medium text-text max-w-xs truncate">{r.query}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(r.impressions, 0)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(r.clicks, 0)}</td>
                      <td className="px-4 py-3 text-right">{formatPercent(r.ctr, 2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-warning">{formatPosition(r.position)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${diff.cls}`}>
                          {diff.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Wins */}
      <div className="space-y-2">
        <SectionHeader
          icon={TrendingUp}
          title="Quick wins — optimizar título/meta"
          count={quickWins.length}
          color="text-warning"
        />
        <p className="text-xs text-muted">
          Ya rankean en top 10 pero su CTR está por debajo del {Math.round(siteCtr * 60)}% del promedio del sitio ({formatPercent(siteCtr, 2)}).
          Solo cambiando el title tag se puede subir el tráfico sin tocar posición.
        </p>
        {quickWins.length === 0 ? (
          <EmptyRow message="Todas las queries en top 10 tienen CTR normal." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Query</th>
                  <th className="px-4 py-3 font-medium text-right">Impr.</th>
                  <th className="px-4 py-3 font-medium text-right">CTR actual</th>
                  <th className="px-4 py-3 font-medium text-right">CTR sitio</th>
                  <th className="px-4 py-3 font-medium text-right">Pos.</th>
                  <th className="px-4 py-3 font-medium text-right">Clicks perdidos</th>
                </tr>
              </thead>
              <tbody>
                {quickWins.map((r, i) => {
                  const expectedClicks = Math.round(r.impressions * siteCtr);
                  const lostClicks = Math.max(0, expectedClicks - r.clicks);
                  return (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/40">
                      <td className="px-4 py-3 font-medium text-text max-w-xs truncate">{r.query}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(r.impressions, 0)}</td>
                      <td className="px-4 py-3 text-right text-danger font-medium">{formatPercent(r.ctr, 2)}</td>
                      <td className="px-4 py-3 text-right text-muted">{formatPercent(siteCtr, 2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-success">{formatPosition(r.position)}</td>
                      <td className="px-4 py-3 text-right text-warning font-medium">-{formatNumber(lostClicks, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CTR Bajo */}
      <div className="space-y-2">
        <SectionHeader
          icon={AlertTriangle}
          title="Alerta CTR bajo — alta exposición"
          count={lowCtr.length}
          color="text-danger"
        />
        <p className="text-xs text-muted">
          Páginas que Google muestra mucho (100+ impresiones) pero casi nadie hace click. CTR &lt; 2% con posición &lt; 15.
        </p>
        {lowCtr.length === 0 ? (
          <EmptyRow message="Sin alertas de CTR bajo." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Query</th>
                  <th className="px-4 py-3 font-medium text-right">Impr.</th>
                  <th className="px-4 py-3 font-medium text-right">CTR</th>
                  <th className="px-4 py-3 font-medium text-right">Pos.</th>
                  <th className="px-4 py-3 font-medium text-right">Clicks reales</th>
                  <th className="px-4 py-3 font-medium text-right">Clicks potenciales</th>
                </tr>
              </thead>
              <tbody>
                {lowCtr.map((r, i) => {
                  const potential = Math.round(r.impressions * 0.05);
                  return (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/40">
                      <td className="px-4 py-3 font-medium text-text max-w-xs truncate">{r.query}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(r.impressions, 0)}</td>
                      <td className="px-4 py-3 text-right text-danger font-bold">{formatPercent(r.ctr, 2)}</td>
                      <td className="px-4 py-3 text-right">{formatPosition(r.position)}</td>
                      <td className="px-4 py-3 text-right text-muted">{formatNumber(r.clicks, 0)}</td>
                      <td className="px-4 py-3 text-right text-accent font-medium">~{formatNumber(potential, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
