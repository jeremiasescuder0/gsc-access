import { NextResponse } from "next/server";
import { getContentInventory, syncContentInventory, updateContentInventoryItem } from "@/lib/blog-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = withAuth(async (req: Request, { params }: { params: Promise<{ siteUrl: string }> }) => {
  const { siteUrl: encoded } = await params;
  const siteUrl = decodeURIComponent(encoded);
  const url = new URL(req.url);
  const sync = url.searchParams.get("sync") === "1";

  try {
    const inventory = sync ? await syncContentInventory(siteUrl) : await getContentInventory(siteUrl);
    return NextResponse.json(inventory);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const PATCH = withAuth(async (req: Request, { params }: { params: Promise<{ siteUrl: string }> }) => {
  const { siteUrl: encoded } = await params;
  const siteUrl = decodeURIComponent(encoded);
  try {
    const body = await req.json();
    if (!body.url) return NextResponse.json({ error: "url es requerida" }, { status: 400 });
    const inventory = await updateContentInventoryItem(siteUrl, body.url, body.patch || {});
    return NextResponse.json(inventory);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
