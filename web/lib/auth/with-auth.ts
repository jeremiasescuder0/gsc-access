// Protección server-side para rutas de API. Cada endpoint privado se envuelve con withAuth() —
// nunca confía en un header o flag que mande el cliente, siempre revalida contra el store de
// sesiones (getCurrentSession).
import { NextResponse } from "next/server";
import { getSessionFromRequest, type Session } from "./session";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Defensa en profundidad contra CSRF además de SameSite=Lax: en métodos que modifican estado,
// si el request trae Origin, tiene que matchear el host de la app. SameSite=Lax ya bloquea que
// el browser mande la cookie en un POST cross-site, pero este chequeo cubre casos donde SameSite
// no aplica (clientes/proxies viejos) sin necesidad de un token CSRF aparte.
function originIsTrusted(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // muchos clientes same-origin no mandan Origin en same-site requests
  try {
    const originHost = new URL(origin).host;
    const requestHost = new URL(req.url).host;
    return originHost === requestHost;
  } catch {
    return false;
  }
}

type RouteHandler<Ctx> = (req: Request, ctx: Ctx, session: Session) => Promise<Response> | Response;

export function withAuth<Ctx = { params: Promise<Record<string, string>> }>(handler: RouteHandler<Ctx>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    if (UNSAFE_METHODS.has(req.method) && !originIsTrusted(req)) {
      return NextResponse.json({ error: "Origin no confiable" }, { status: 403 });
    }

    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    return handler(req, ctx, session);
  };
}
