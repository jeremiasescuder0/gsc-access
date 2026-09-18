// Import estático a propósito — ver la nota en gsc-data.ts sobre por qué el dynamic import con
// pathToFileURL no se traza en el build de Vercel.
import * as adsFetchModule from "../../core/ads-fetch.js";
import type { Account, AccountSummary, CampaignDetail } from "./types";

type AdsFetchModule = {
  fetchAllAccountsData: () => Promise<Account[]>;
  fetchCampaignDetail: (customerId: string, campaignId: string) => Promise<CampaignDetail>;
};

const { fetchAllAccountsData, fetchCampaignDetail } = adsFetchModule as unknown as AdsFetchModule;

type CacheEntry = {
  data: Account[];
  fetchedAt: number;
};

const CACHE_TTL_MS = 15 * 60 * 1000;
let cache: CacheEntry | null = null;
let inflight: Promise<Account[]> | null = null;

export async function getAllAccounts(force = false): Promise<Account[]> {
  const now = Date.now();
  if (!force && cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }
  if (inflight) return inflight;

  inflight = fetchAllAccountsData()
    .then((data) => {
      cache = { data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function getAccountById(id: string): Promise<Account | null> {
  const accounts = await getAllAccounts();
  return accounts.find((a) => a.accountId === id) ?? null;
}

export function summarizeAccount(account: Account): AccountSummary {
  const totalCost = account.campaigns.reduce((s, c) => s + (c.cost || 0), 0);
  const totalConversions = account.campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const totalConversionsValue = account.campaigns.reduce(
    (s, c) => s + (c.conversionsValue || 0),
    0
  );
  const totalClicks = account.campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalImpressions = account.campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const roas = totalCost > 0 ? (totalConversionsValue / totalCost) * 100 : 0;
  const cpa = totalConversions > 0 ? totalCost / totalConversions : 0;

  return {
    accountId: account.accountId,
    account: account.account,
    currency: account.currency,
    totalCost,
    totalConversions,
    totalConversionsValue,
    totalClicks,
    totalImpressions,
    avgCtr,
    roas,
    cpa,
    campaignsCount: account.campaigns.length,
    hasActivity: totalImpressions > 0 || totalCost > 0,
  };
}

export function describeAdsError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as {
      errors?: { message?: string; error_code?: unknown }[];
      message?: string;
    };
    if (e.message) return e.message;
    if (Array.isArray(e.errors)) {
      return e.errors.map((x) => x.message || JSON.stringify(x)).join(" | ");
    }
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

export function getCacheInfo() {
  if (!cache) return { cached: false };
  return {
    cached: true,
    fetchedAt: new Date(cache.fetchedAt).toISOString(),
    ageMs: Date.now() - cache.fetchedAt,
    ttlMs: CACHE_TTL_MS,
  };
}

type CampaignCacheEntry = {
  data: CampaignDetail;
  fetchedAt: number;
};

const campaignCache = new Map<string, CampaignCacheEntry>();
const campaignInflight = new Map<string, Promise<CampaignDetail>>();

export async function getCampaignDetail(
  accountId: string,
  campaignId: string,
  force = false
): Promise<CampaignDetail> {
  const key = `${accountId}:${campaignId}`;
  const now = Date.now();
  const cached = campaignCache.get(key);
  if (!force && cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }
  const existing = campaignInflight.get(key);
  if (existing) return existing;

  const promise = fetchCampaignDetail(accountId, campaignId)
    .then((data) => {
      campaignCache.set(key, { data, fetchedAt: Date.now() });
      return data;
    })
    .finally(() => {
      campaignInflight.delete(key);
    });

  campaignInflight.set(key, promise);
  return promise;
}
