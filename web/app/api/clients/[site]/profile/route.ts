import { NextResponse } from "next/server";
import { getClientProfile, upsertClientProfile, getGlobalContentRules } from "@/lib/blog-data";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site: encoded } = await params;
  const gscSite = decodeURIComponent(encoded);
  try {
    const [profile, globalRules] = await Promise.all([getClientProfile(gscSite), getGlobalContentRules()]);
    if (!profile) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    return NextResponse.json({ profile, globalRules });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site: encoded } = await params;
  const gscSite = decodeURIComponent(encoded);
  try {
    const patch = await req.json();
    const profile = await upsertClientProfile(gscSite, patch);
    return NextResponse.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
