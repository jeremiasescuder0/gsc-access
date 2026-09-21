import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Usado por el frontend para saber si hay sesión activa (ej. mostrar el botón de logout) — no
// es el mecanismo de protección en sí, sólo lectura de estado. La protección real de cada
// recurso pasa por withAuth()/el layout de (app), no por este endpoint.
export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, username: session.username });
}
