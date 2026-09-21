import { NextResponse } from "next/server";
import { listClientProfiles } from "@/lib/blog-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  try {
    const items = await listClientProfiles();
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
