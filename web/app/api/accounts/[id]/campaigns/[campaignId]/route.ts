import { NextResponse } from "next/server";
import { getCampaignDetail } from "@/lib/ads-data";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { id, campaignId } = await params;
  try {
    const detail = await getCampaignDetail(id, campaignId);
    if (!detail.campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
