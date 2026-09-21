import { NextResponse } from "next/server";
import { getAccountById, summarizeAccount } from "@/lib/ads-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const GET = withAuth(async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  try {
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    return NextResponse.json({
      account,
      summary: summarizeAccount(account),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
