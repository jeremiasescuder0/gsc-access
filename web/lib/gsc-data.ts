// Import ESTÁTICO (no dynamic import con pathToFileURL) a propósito: Next necesita poder
// trazar esta dependencia en build time para incluirla en el bundle de cada función serverless.
// Un import dinámico con path calculado en runtime es invisible para esa traza — confirmado
// inspeccionando el .nft.json del build: con el patrón viejo, core/ no aparecía en ningún
// bundle, lo que rompía todas las rutas en Vercel (filesystem no trazado ≠ filesystem local).
import * as gscFetchModule from "../../core/gsc-fetch.js";
import type { Site, SitePerformance } from "./gsc-types";

type GscFetchModule = {
  listSites: () => Promise<Site[]>;
  fetchSitePerformance: (
    siteUrl: string,
    options?: { periodDays?: number; blogPattern?: string }
  ) => Promise<SitePerformance>;
};

const { listSites, fetchSitePerformance } = gscFetchModule as unknown as GscFetchModule;

const CACHE_TTL_MS = 10 * 60 * 1000;

let sitesCache: { data: Site[]; fetchedAt: number } | null = null;
let sitesInflight: Promise<Site[]> | null = null;

export async function getSites(force = false): Promise<Site[]> {
  if (!force && sitesCache && Date.now() - sitesCache.fetchedAt < CACHE_TTL_MS) {
    return sitesCache.data;
  }
  if (sitesInflight) return sitesInflight;
  sitesInflight = listSites()
    .then((data) => {
      sitesCache = { data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      sitesInflight = null;
    });
  return sitesInflight;
}

const performanceCache = new Map<string, { data: SitePerformance; fetchedAt: number }>();
const performanceInflight = new Map<string, Promise<SitePerformance>>();

function cacheKey(siteUrl: string, periodDays: number, blogPattern: string) {
  return `${siteUrl}|${periodDays}|${blogPattern}`;
}

export async function getSitePerformance(
  siteUrl: string,
  options: { periodDays?: number; blogPattern?: string; force?: boolean } = {}
): Promise<SitePerformance> {
  const periodDays = options.periodDays ?? 30;
  const blogPattern = options.blogPattern ?? "/blog/";
  const key = cacheKey(siteUrl, periodDays, blogPattern);

  if (!options.force) {
    const cached = performanceCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.data;
    }
  }
  const existing = performanceInflight.get(key);
  if (existing) return existing;

  const promise = fetchSitePerformance(siteUrl, { periodDays, blogPattern })
    .then((data) => {
      performanceCache.set(key, { data, fetchedAt: Date.now() });
      return data;
    })
    .finally(() => {
      performanceInflight.delete(key);
    });

  performanceInflight.set(key, promise);
  return promise;
}
