import { NextResponse } from "next/server";
import { getSites } from "@/lib/gsc-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = withAuth(async () => {
  try {
    const sites = await getSites();
    return NextResponse.json({ sites });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
