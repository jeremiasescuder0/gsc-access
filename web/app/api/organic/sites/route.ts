import { NextResponse } from "next/server";
import { getSites } from "@/lib/gsc-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const sites = await getSites();
    return NextResponse.json({ sites });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
