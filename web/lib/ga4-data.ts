// Puente server-side hacia core/ga4-fetch.js, con el mismo cache TTL en memoria que gsc-data.ts
// (la GA4 Data API tiene cuotas por propiedad/hora — no repetir llamadas idénticas).
// Import estático a propósito — ver la nota en gsc-data.ts.
import * as ga4FetchModule from "../../core/ga4-fetch.js";
import * as ga4InsightsModule from "../../core/ga4-insights.js";
import type { Ga4Property, Ga4Overview, Ga4PagePerformance, Ga4DateRange, Ga4InsightsRecord } from "./ga4-types";
import type { ClientContentProfile } from "./blog-types";
import type { CrossSourceRow } from "./cross-source";

type Ga4FetchModule = {
  listGa4Properties: () => Promise<Ga4Property[]>;
  fetchPropertyOverview: (propertyId: string, options?: { periodDays?: number }) => Promise<Ga4Overview>;
  fetchPagePerformance: (propertyId: string, pagePath: string, range: Ga4DateRange) => Promise<Ga4PagePerformance>;
  buildRanges: (periodDays?: number) => Ga4Overview["ranges"];
};

const { listGa4Properties, fetchPropertyOverview, fetchPagePerformance, buildRanges } =
  ga4FetchModule as unknown as Ga4FetchModule;

export { buildRanges as buildGa4Ranges, fetchPagePerformance as fetchGa4PagePerformance };

type Ga4InsightsModule = {
  getStoredInsights: (clientSite: string) => Promise<Ga4InsightsRecord | null>;
  generateInsights: (input: {
    clientSite: string;
    clientProfile: ClientContentProfile | null;
    overview: Ga4Overview;
    crossRows: CrossSourceRow[];
    periodDays?: number;
  }) => Promise<Ga4InsightsRecord>;
};
const { getStoredInsights, generateInsights } = ga4InsightsModule as unknown as Ga4InsightsModule;

export { getStoredInsights as getGa4Insights, generateInsights as generateGa4Insights };

const CACHE_TTL_MS = 10 * 60 * 1000;

let propertiesCache: { data: Ga4Property[]; fetchedAt: number } | null = null;

export async function getGa4Properties(force = false): Promise<Ga4Property[]> {
  if (!force && propertiesCache && Date.now() - propertiesCache.fetchedAt < CACHE_TTL_MS) {
    return propertiesCache.data;
  }
  const data = await listGa4Properties();
  propertiesCache = { data, fetchedAt: Date.now() };
  return data;
}

const overviewCache = new Map<string, { data: Ga4Overview; fetchedAt: number }>();
const overviewInflight = new Map<string, Promise<Ga4Overview>>();

export async function getGa4Overview(
  propertyId: string,
  options: { periodDays?: number; force?: boolean } = {}
): Promise<Ga4Overview> {
  const periodDays = options.periodDays ?? 30;
  const key = `${propertyId}|${periodDays}`;

  if (!options.force) {
    const cached = overviewCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.data;
  }
  const existing = overviewInflight.get(key);
  if (existing) return existing;

  const promise = fetchPropertyOverview(propertyId, { periodDays })
    .then((data) => {
      overviewCache.set(key, { data, fetchedAt: Date.now() });
      return data;
    })
    .finally(() => overviewInflight.delete(key));

  overviewInflight.set(key, promise);
  return promise;
}
