import { NextResponse } from "next/server";
import { checkRateLimit, recordFailedAttempt, clearRateLimit, verifyCredentials, establishSessionOnResponse } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// Nunca loguear password/hash/cookie/secret — sólo el evento y datos no sensibles (usuario, ip).
function logAuthEvent(event: string, fields: Record<string, unknown>) {
  console.log(`[auth] ${event}`, fields);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 400 });
  }

  // Nunca confiar en el shape del body del cliente — validar tipo/longitud en el server.
  const { username, password } = (body as { username?: unknown; password?: unknown }) || {};
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.length === 0 ||
    username.length > 256 ||
    password.length === 0 ||
    password.length > 512
  ) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 400 });
  }

  const ip = getClientIp(req);

  const rateLimit = await checkRateLimit({ ip, username });
  if (!rateLimit.allowed) {
    logAuthEvent("LOGIN_RATE_LIMITED", { ip, username });
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 900) } }
    );
  }

  let valid: boolean;
  try {
    valid = await verifyCredentials({ username, password });
  } catch (err) {
    // AUTH_USERNAME/AUTH_PASSWORD_HASH mal configuradas — error interno, no del usuario. No
    // exponer el detalle (podría revelar qué variable falta) en la respuesta.
    console.error("[auth] configuration error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "No se pudo procesar el login. Reintentá más tarde." }, { status: 500 });
  }

  if (!valid) {
    await recordFailedAttempt({ ip, username });
    logAuthEvent("LOGIN_FAILURE", { ip, username });
    // Mensaje genérico a propósito — nunca distinguir "no existe" de "contraseña incorrecta".
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  await clearRateLimit({ ip, username });
  const response = NextResponse.json({ ok: true });
  // establishSessionOnResponse siempre crea un id de sesión nuevo (protección contra session
  // fixation) y lo setea en la respuesta vía Set-Cookie.
  await establishSessionOnResponse(username, response);
  logAuthEvent("LOGIN_SUCCESS", { ip, username });

  return response;
}
