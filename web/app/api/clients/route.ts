import { NextResponse } from "next/server";
import { listClientProfiles } from "@/lib/blog-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listClientProfiles();
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
