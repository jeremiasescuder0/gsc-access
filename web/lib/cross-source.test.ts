import { describe, it, expect } from "vitest";
import { buildCrossSource, urlToPath } from "./cross-source";
import type { Ga4Overview } from "./ga4-types";
import type { SitePerformance } from "./gsc-types";
const { validateGa4InsightsResponse } = require("../../core/prompts/ga4-insights.js");

function ga4With(landingPages: Ga4Overview["landingPages"], keyEventsTotal = 10): Ga4Overview {
  return {
    propertyId: "1",
    ranges: { current: { startDate: "a", endDate: "b" }, previous: { startDate: "a", endDate: "b" }, yearOverYear: { startDate: "a", endDate: "b" } },
    totals: {
      current: { sessions: 100, totalUsers: 90, newUsers: 80, engagedSessions: 40, engagementRate: 0.4, avgEngagementTime: 30, screenPageViews: 200, keyEvents: keyEventsTotal },
      previous: { sessions: 90, totalUsers: 80, newUsers: 70, engagedSessions: 35, engagementRate: 0.39, avgEngagementTime: 28, screenPageViews: 180, keyEvents: 8 },
      yearOverYear: { sessions: 80, totalUsers: 70, newUsers: 60, engagedSessions: 30, engagementRate: 0.37, avgEngagementTime: 25, screenPageViews: 160, keyEvents: 5 },
      deltaPrev: { sessions: 10, totalUsers: 10, newUsers: 10, engagedSessions: 5, engagementRate: 0.01, avgEngagementTime: 2, screenPageViews: 20, keyEvents: 2 },
      deltaYoY: { sessions: 20, totalUsers: 20, newUsers: 20, engagedSessions: 10, engagementRate: 0.03, avgEngagementTime: 5, screenPageViews: 40, keyEvents: 5 },
    },
    channels: [],
    landingPages,
    devices: [],
    daily: [],
    keyEventsByName: [],
  };
}

function gscWith(pages: { page: string; impressions: number; clicks: number; position: number }[]): SitePerformance {
  return {
    siteUrl: "sc-domain:example.com",
    ranges: { current: { startDate: "a", endDate: "b" }, previous: { startDate: "a", endDate: "b" }, yearOverYear: { startDate: "a", endDate: "b" } },
    blogPattern: "/blog/",
    totals: {
      current: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      previous: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      yearOverYear: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      deltaPrev: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      deltaYoY: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    },
    queries: [],
    queriesYoY: [],
    pages: pages.map((p) => ({ ...p, ctr: p.impressions ? p.clicks / p.impressions : 0, previous: null, delta: null })),
    pagesYoY: [],
    opportunities: [],
    blogPages: [],
  };
}

describe("cruce GSC ↔ GA4", () => {
  it("normaliza URLs completas de GSC a paths comparables con GA4", () => {
    expect(urlToPath("https://example.com/blog/post/")).toBe("/blog/post");
    expect(urlToPath("https://example.com/")).toBe("/");
    expect(urlToPath("https://example.com/p?x=1")).toBe("/p?x=1");
  });

  it("joinea por path y marca tráfico sin conversión cuando el sitio sí convierte", () => {
    const ga4 = ga4With([
      { page: "/servicio", sessions: 50, engagedSessions: 25, engagementRate: 0.5, avgEngagementTime: 40, keyEvents: 0 },
      { page: "/contacto", sessions: 30, engagedSessions: 20, engagementRate: 0.66, avgEngagementTime: 50, keyEvents: 10 },
    ]);
    const gsc = gscWith([{ page: "https://example.com/servicio/", impressions: 1000, clicks: 60, position: 8 }]);
    const rows = buildCrossSource(gsc, ga4);

    const servicio = rows.find((r) => r.page === "/servicio")!;
    expect(servicio.gsc?.impressions).toBe(1000);
    expect(servicio.ga4?.sessions).toBe(50);
    expect(servicio.flags).toContain("traffic_no_conversion");

    const contacto = rows.find((r) => r.page === "/contacto")!;
    expect(contacto.gsc).toBeNull();
    expect(contacto.flags).not.toContain("traffic_no_conversion");
  });

  it("no marca 'tráfico sin conversión' si el sitio no mide conversiones (sería un problema de tracking, no de la página)", () => {
    const ga4 = ga4With([{ page: "/servicio", sessions: 50, engagedSessions: 25, engagementRate: 0.5, avgEngagementTime: 40, keyEvents: 0 }], 0);
    const rows = buildCrossSource(null, ga4);
    expect(rows[0].flags).not.toContain("traffic_no_conversion");
  });

  it("incluye páginas que GSC muestra pero que no reciben entradas en GA4", () => {
    const ga4 = ga4With([{ page: "/", sessions: 10, engagedSessions: 4, engagementRate: 0.4, avgEngagementTime: 20, keyEvents: 1 }]);
    const gsc = gscWith([{ page: "https://example.com/olvidada", impressions: 500, clicks: 2, position: 30 }]);
    const rows = buildCrossSource(gsc, ga4);
    const olvidada = rows.find((r) => r.page === "/olvidada")!;
    expect(olvidada.ga4).toBeNull();
    expect(olvidada.gsc?.impressions).toBe(500);
  });

  it("marca buen engagement con poca visibilidad y visible con bajo engagement", () => {
    const ga4 = ga4With([
      { page: "/a", sessions: 20, engagedSessions: 18, engagementRate: 0.9, avgEngagementTime: 60, keyEvents: 2 },
      { page: "/b", sessions: 20, engagedSessions: 2, engagementRate: 0.1, avgEngagementTime: 5, keyEvents: 1 },
      { page: "/c", sessions: 20, engagedSessions: 8, engagementRate: 0.4, avgEngagementTime: 20, keyEvents: 1 },
    ]);
    const gsc = gscWith([
      { page: "https://example.com/a", impressions: 20, clicks: 5, position: 12 },
      { page: "https://example.com/b", impressions: 5000, clicks: 100, position: 5 },
    ]);
    const rows = buildCrossSource(gsc, ga4);
    expect(rows.find((r) => r.page === "/a")!.flags).toContain("engaged_low_visibility");
    expect(rows.find((r) => r.page === "/b")!.flags).toContain("visible_low_engagement");
  });
});

describe("validación de insights de GA4", () => {
  const valid = {
    summary: "ok",
    insights: [{ type: "tracking", severity: "high", title: "t", evidence: "e", recommendation: "r", source: "ga4", pages: [] }],
  };

  it("acepta una respuesta bien formada", () => {
    expect(() => validateGa4InsightsResponse(valid)).not.toThrow();
  });

  it("rechaza type / severity / source fuera del enum", () => {
    expect(() => validateGa4InsightsResponse({ ...valid, insights: [{ ...valid.insights[0], type: "magic" }] })).toThrow(/type/);
    expect(() => validateGa4InsightsResponse({ ...valid, insights: [{ ...valid.insights[0], severity: "urgent" }] })).toThrow(/severity/);
    expect(() => validateGa4InsightsResponse({ ...valid, insights: [{ ...valid.insights[0], source: "guess" }] })).toThrow(/source/);
  });

  it("rechaza insights sin evidencia o sin recomendación", () => {
    expect(() => validateGa4InsightsResponse({ ...valid, insights: [{ ...valid.insights[0], evidence: undefined }] })).toThrow();
  });
});
