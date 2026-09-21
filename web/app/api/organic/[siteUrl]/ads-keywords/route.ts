import { NextResponse } from "next/server";
// Import estático a propósito — ver la nota en web/lib/gsc-data.ts.
import * as clientsModule from "../../../../../../core/clients.js";
import * as adsFetchModule from "../../../../../../core/ads-fetch.js";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ClientsModule = {
  getClientByGscSite: (siteUrl: string) => { name: string; adsCustomerId: string | null; industry: string } | null;
};

type AdsFetchModule = {
  fetchAccountSearchTerms: (
    customerId: string
  ) => Promise<{ searchTerm: string; impressions: number; clicks: number; cost: number; conversions: number }[]>;
};

const { getClientByGscSite } = clientsModule as unknown as ClientsModule;
const { fetchAccountSearchTerms } = adsFetchModule as unknown as AdsFetchModule;

export const GET = withAuth(async (
  _req: Request,
  { params }: { params: Promise<{ siteUrl: string }> }
) => {
  const { siteUrl: encoded } = await params;
  const siteUrl = decodeURIComponent(encoded);

  try {
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
});
