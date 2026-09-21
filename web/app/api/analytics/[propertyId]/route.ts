import { NextResponse } from "next/server";
import { getGa4Overview } from "@/lib/ga4-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const GET = withAuth(async (req: Request, { params }: { params: Promise<{ propertyId: string }> }) => {
  const { propertyId } = await params;
  if (!/^\d+$/.test(propertyId)) {
    return NextResponse.json({ error: "propertyId inválido (tiene que ser numérico)" }, { status: 400 });
  }
  const url = new URL(req.url);
  const periodDays = Number(url.searchParams.get("periodDays")) || 30;

  try {
    const overview = await getGa4Overview(propertyId, { periodDays });
    return NextResponse.json(overview);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
});
