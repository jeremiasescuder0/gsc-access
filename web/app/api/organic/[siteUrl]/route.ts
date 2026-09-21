import { NextResponse } from "next/server";
import { getSitePerformance } from "@/lib/gsc-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const GET = withAuth(async (
  req: Request,
  { params }: { params: Promise<{ siteUrl: string }> }
) => {
  const { siteUrl: encoded } = await params;
  const siteUrl = decodeURIComponent(encoded);
  const url = new URL(req.url);
  const periodDays = Number(url.searchParams.get("periodDays")) || 30;
  const blogPattern = url.searchParams.get("blogPattern") || "/blog/";

  try {
    const data = await getSitePerformance(siteUrl, { periodDays, blogPattern });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
