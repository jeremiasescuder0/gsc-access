import path from "path";
import { pathToFileURL } from "url";
import { config as dotenvConfig } from "dotenv";
import type { Site, SitePerformance } from "./gsc-types";

const ROOT_DIR = path.resolve(process.cwd(), "..");

dotenvConfig({ path: path.resolve(ROOT_DIR, ".env") });

type GscFetchModule = {
  listSites: () => Promise<Site[]>;
  fetchSitePerformance: (
    siteUrl: string,
    options?: { periodDays?: number; blogPattern?: string }
  ) => Promise<SitePerformance>;
};

let gscFetchPromise: Promise<GscFetchModule> | null = null;

function loadGscFetch(): Promise<GscFetchModule> {
  if (gscFetchPromise) return gscFetchPromise;
  const fileUrl = pathToFileURL(path.resolve(ROOT_DIR, "gsc-fetch.js")).href;
  gscFetchPromise = import(/* webpackIgnore: true */ /* turbopackIgnore: true */ fileUrl)
    .then((mod) => (mod.default ?? mod) as GscFetchModule);
  return gscFetchPromise;
}

const CACHE_TTL_MS = 10 * 60 * 1000;

let sitesCache: { data: Site[]; fetchedAt: number } | null = null;
let sitesInflight: Promise<Site[]> | null = null;

export async function getSites(force = false): Promise<Site[]> {
  if (!force && sitesCache && Date.now() - sitesCache.fetchedAt < CACHE_TTL_MS) {
    return sitesCache.data;
  }
  if (sitesInflight) return sitesInflight;
  sitesInflight = loadGscFetch()
    .then((mod) => mod.listSites())
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

  const promise = loadGscFetch()
    .then((mod) => mod.fetchSitePerformance(siteUrl, { periodDays, blogPattern }))
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
