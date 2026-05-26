import { NextResponse } from "next/server";
import path from "path";
import { pathToFileURL } from "url";
import { config as dotenvConfig } from "dotenv";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ROOT_DIR = path.resolve(process.cwd(), "..");
dotenvConfig({ path: path.resolve(ROOT_DIR, ".env") });

type ClientsModule = {
  getClientByGscSite: (siteUrl: string) => { name: string; adsCustomerId: string | null; industry: string } | null;
};

type AdsFetchModule = {
  fetchAccountSearchTerms: (customerId: string) => Promise<{ searchTerm: string; impressions: number; clicks: number; cost: number; conversions: number }[]>;
};

async function loadModule<T>(file: string): Promise<T> {
  const url = pathToFileURL(path.resolve(ROOT_DIR, file)).href;
  const mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url);
  return (mod.default ?? mod) as T;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteUrl: string }> }
) {
  const { siteUrl: encoded } = await params;
  const siteUrl = decodeURIComponent(encoded);

  try {
    const [{ getClientByGscSite }, { fetchAccountSearchTerms }] = await Promise.all([
      loadModule<ClientsModule>("clients.js"),
      loadModule<AdsFetchModule>("ads-fetch.js"),
    ]);

    const client = getClientByGscSite(siteUrl);
    if (!client?.adsCustomerId) {
      return NextResponse.json({ searchTerms: [], source: "none", reason: "no_ads_account" });
    }

    const searchTerms = await fetchAccountSearchTerms(client.adsCustomerId);
    return NextResponse.json({ searchTerms, source: "ads", clientName: client.name, industry: client.industry });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
