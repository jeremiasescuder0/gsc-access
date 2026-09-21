import { NextResponse } from "next/server";
import { getClientProfile } from "@/lib/blog-data";
import { getGa4Overview, getGa4Insights, generateGa4Insights } from "@/lib/ga4-data";
import { getSitePerformance } from "@/lib/gsc-data";
import { buildCrossSource } from "@/lib/cross-source";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET: últimos insights guardados para el cliente (null si nunca se generaron).
export const GET = withAuth(async (_req: Request, { params }: { params: Promise<{ site: string }> }) => {
  const { site: encoded } = await params;
  const clientSite = decodeURIComponent(encoded);
  try {
    const insights = await getGa4Insights(clientSite);
    return NextResponse.json({ insights });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

// POST: regenera los insights con Gemini a partir de GA4 (+ cruce con GSC si hay) y los guarda.
export const POST = withAuth(async (req: Request, { params }: { params: Promise<{ site: string }> }) => {
  const { site: encoded } = await params;
  const clientSite = decodeURIComponent(encoded);
  try {
    const profile = await getClientProfile(clientSite);
    if (!profile?.ga4PropertyId) {
      return NextResponse.json({ error: "El cliente no tiene propiedad GA4 asignada" }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const periodDays = [7, 30, 90].includes(Number(body.periodDays)) ? Number(body.periodDays) : 30;

    const [overview, gsc] = await Promise.all([
      getGa4Overview(profile.ga4PropertyId, { periodDays }),
      getSitePerformance(clientSite, { periodDays }).catch(() => null),
    ]);
    const crossRows = buildCrossSource(gsc, overview);
    const insights = await generateGa4Insights({ clientSite, clientProfile: profile, overview, crossRows, periodDays });
    return NextResponse.json({ insights });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
});
