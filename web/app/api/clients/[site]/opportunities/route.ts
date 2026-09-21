import { NextResponse } from "next/server";
import { listOpportunities, scanClientOpportunities } from "@/lib/blog-data";
import type { OpportunityStatus } from "@/lib/blog-types";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
// El scan hace 1 llamada a Gemini sobre hasta 120 queries — puede tardar.
export const maxDuration = 90;

export const GET = withAuth(async (req: Request, { params }: { params: Promise<{ site: string }> }) => {
  const { site: encoded } = await params;
  const clientSite = decodeURIComponent(encoded);
  const url = new URL(req.url);
  const status = (url.searchParams.get("status") as OpportunityStatus | null) || undefined;

  try {
    const items = await listOpportunities({ clientSite, status });
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (req: Request, { params }: { params: Promise<{ site: string }> }) => {
  const { site: encoded } = await params;
  const clientSite = decodeURIComponent(encoded);

  try {
    const body = await req.json().catch(() => ({}));
    const periodDays = Number(body.periodDays) || undefined;
    const result = await scanClientOpportunities(clientSite, periodDays);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
});
