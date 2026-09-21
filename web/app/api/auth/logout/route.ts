import { NextResponse } from "next/server";
import { destroySessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const response = NextResponse.json({ ok: true });
  await destroySessionFromRequest(req, response);
  console.log("[auth] LOGOUT");
  return response;
}
