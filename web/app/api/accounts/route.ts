import { NextResponse } from "next/server";
import { describeAdsError, getAllAccounts, summarizeAccount } from "@/lib/ads-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const GET = withAuth(async () => {
  try {
    const accounts = await getAllAccounts();
    const summaries = accounts.map(summarizeAccount);
    return NextResponse.json({ accounts: summaries });
  } catch (err) {
    console.error("[/api/accounts] full error:", err);
    return NextResponse.json({ error: describeAdsError(err) }, { status: 500 });
  }
});
