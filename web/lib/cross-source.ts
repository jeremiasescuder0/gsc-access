// Cruce Search Console ↔ Google Analytics 4 por landing page. GSC devuelve URLs completas,
// GA4 devuelve paths (landingPagePlusQueryString) — se joinea por path normalizado.
//
// Cada fila deja explícito de qué fuente sale cada número (sección 19 del spec): gsc = hechos
// de Search Console, ga4 = hechos de Analytics. Ninguno es interpretación.
import type { SitePerformance } from "./gsc-types";
import type { Ga4Overview } from "./ga4-types";

export type CrossSourceRow = {
  page: string;
  gsc: { impressions: number; clicks: number; ctr: number; position: number } | null;
  ga4: { sessions: number; engagedSessions: number; engagementRate: number; avgEngagementTime: number; keyEvents: number } | null;
  // Señales derivadas de forma determinística (no IA) para ordenar y resaltar.
  flags: CrossSourceFlag[];
};

export type CrossSourceFlag = "traffic_no_conversion" | "engaged_low_visibility" | "visible_low_engagement";

export function urlToPath(url: string): string {
  try {
    const u = new URL(url);
    return (u.pathname + u.search).replace(/\/$/, "") || "/";
  } catch {
    return url.replace(/\/$/, "") || "/";
  }
}

function normalizePath(path: string): string {
  return (path || "").replace(/\/$/, "") || "/";
}

export function buildCrossSource(gsc: SitePerformance | null, ga4: Ga4Overview): CrossSourceRow[] {
  const gscByPath = new Map<string, SitePerformance["pages"][number]>();
  for (const p of gsc?.pages || []) gscByPath.set(urlToPath(p.page), p);

  const rows = new Map<string, CrossSourceRow>();

  for (const lp of ga4.landingPages) {
    const path = normalizePath(lp.page);
    const g = gscByPath.get(path);
    rows.set(path, {
      page: path,
      gsc: g ? { impressions: g.impressions, clicks: g.clicks, ctr: g.ctr, position: g.position } : null,
      ga4: {
        sessions: lp.sessions,
        engagedSessions: lp.engagedSessions,
        engagementRate: lp.engagementRate,
        avgEngagementTime: lp.avgEngagementTime,
        keyEvents: lp.keyEvents,
      },
      flags: [],
    });
  }

  // Páginas que GSC muestra pero que no aparecen como landing en GA4 (visibles, sin entradas).
  for (const [path, g] of gscByPath) {
    if (!rows.has(path)) {
      rows.set(path, {
        page: path,
        gsc: { impressions: g.impressions, clicks: g.clicks, ctr: g.ctr, position: g.position },
        ga4: null,
        flags: [],
      });
    }
  }

  const medianEngagement = median(ga4.landingPages.map((l) => l.engagementRate).filter((v) => v > 0)) || 0.3;

  for (const row of rows.values()) {
    if (row.ga4 && row.ga4.sessions >= 20 && row.ga4.keyEvents === 0 && ga4.totals.current.keyEvents > 0) {
      row.flags.push("traffic_no_conversion");
    }
    if (row.ga4 && row.ga4.engagementRate >= medianEngagement * 1.3 && row.ga4.sessions >= 5 && (!row.gsc || row.gsc.impressions < 100)) {
      row.flags.push("engaged_low_visibility");
    }
    if (row.gsc && row.gsc.impressions >= 200 && row.ga4 && row.ga4.sessions >= 10 && row.ga4.engagementRate < medianEngagement * 0.6) {
      row.flags.push("visible_low_engagement");
    }
  }

  return [...rows.values()].sort((a, b) => (b.ga4?.sessions || 0) - (a.ga4?.sessions || 0) || (b.gsc?.impressions || 0) - (a.gsc?.impressions || 0));
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export const FLAG_LABELS: Record<CrossSourceFlag, string> = {
  traffic_no_conversion: "Tráfico sin conversión",
  engaged_low_visibility: "Buen engagement, poca visibilidad",
  visible_low_engagement: "Visible pero con bajo engagement",
};
