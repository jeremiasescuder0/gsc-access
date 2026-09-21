// Puente server-side hacia core/store/sessions.js, core/auth/password.js y
// core/auth/rate-limit.js — mismo patrón de import estático que el resto de web/lib/*.ts (ver
// la nota en gsc-data.ts sobre por qué el dynamic import con pathToFileURL no se traza en el
// build de Vercel).
//
// Dos formas de leer/escribir la cookie de sesión, a propósito:
// - *FromRequest / NextResponse.cookies: para Route Handlers, que reciben `req: Request`
//   directo. No dependen de contexto interno de Next, así que son testeables llamándolas como
//   funciones comunes con un Request armado a mano — sin necesidad de levantar un server real.
// - getCurrentSession() / establishSession() / destroySession() (sin argumentos): para Server
//   Components (páginas/layouts), que no reciben `req` — usan next/headers, que sí requiere el
//   contexto real de un request de Next y por eso sólo se ejercitan con la app corriendo.
import crypto from "crypto";
import { NextResponse } from "next/server";
import * as sessionsModule from "../../../core/store/sessions.js";
import * as passwordModule from "../../../core/auth/password.js";
import * as rateLimitModule from "../../../core/auth/rate-limit.js";

export const SESSION_COOKIE_NAME = "session_id";

export type Session = {
  id: string;
  username: string;
  createdAt: number;
  lastActivityAt: number;
};

type SessionsModule = {
  createSession: (input: { username: string }) => Promise<Session>;
  touchSession: (id: string) => Promise<Session | null>;
  deleteSession: (id: string) => Promise<void>;
};

type PasswordModule = {
  verifyCredentials: (input: { username: string; password: string }) => Promise<boolean>;
};

type RateLimitModule = {
  checkRateLimit: (input: { ip: string; username: string }) => Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
  recordFailedAttempt: (input: { ip: string; username: string }) => Promise<void>;
  clearRateLimit: (input: { ip: string; username: string }) => Promise<void>;
};

const { createSession, touchSession, deleteSession } = sessionsModule as unknown as SessionsModule;
const { verifyCredentials } = passwordModule as unknown as PasswordModule;
const { checkRateLimit, recordFailedAttempt, clearRateLimit } = rateLimitModule as unknown as RateLimitModule;

export { verifyCredentials, checkRateLimit, recordFailedAttempt, clearRateLimit };

// El id de sesión ya es aleatorio de 256 bits (impracticable de adivinar), así que el HMAC acá
// no protege confidencialidad — protege INTEGRIDAD: si alguien arma/modifica manualmente el
// valor de la cookie, se rechaza sin siquiera consultar el store de sesiones. Usa SESSION_SECRET
// como pide el spec en vez de dejar esa env var declarada pero sin usar.
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está configurada");
  return secret;
}

export function signSessionId(id: string): string {
  const mac = crypto.createHmac("sha256", getSessionSecret()).update(id).digest("base64url");
  return `${id}.${mac}`;
}

// Comparación en tiempo constante — nunca usar === directo en un HMAC.
export function verifySignedSessionId(value: string): string | null {
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const id = value.slice(0, dotIndex);
  const mac = value.slice(dotIndex + 1);
  const expectedMac = crypto.createHmac("sha256", getSessionSecret()).update(id).digest("base64url");

  const macBuf = Buffer.from(mac);
  const expectedBuf = Buffer.from(expectedMac);
  if (macBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(macBuf, expectedBuf)) return null;
  return id;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    // Sin maxAge fijo acá a propósito: la duración real la controla el registro de sesión en el
    // server (idle + absolute timeout). La cookie dura lo mismo que el límite absoluto para que
    // el browser no la retenga más tiempo del que la sesión podría ser válida de todos modos.
    maxAge: 12 * 60 * 60,
  };
}

function parseCookieHeader(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

// --- API para Route Handlers (reciben req: Request) — testeable sin server real ---

export function getSessionIdFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookieValue = parseCookieHeader(cookieHeader, SESSION_COOKIE_NAME);
  if (!cookieValue) return null;
  return verifySignedSessionId(cookieValue);
}

export async function getSessionFromRequest(req: Request): Promise<Session | null> {
  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) return null;
  return touchSession(sessionId);
}

// Crea una sesión NUEVA (nunca reutiliza un id de sesión anterior — protección contra session
// fixation) y la deja seteada en la respuesta. Se llama únicamente después de verificar
// credenciales.
export async function establishSessionOnResponse(username: string, response: NextResponse): Promise<Session> {
  const session = await createSession({ username });
  response.cookies.set(SESSION_COOKIE_NAME, signSessionId(session.id), cookieOptions());
  return session;
}

export async function destroySessionFromRequest(req: Request, response: NextResponse): Promise<void> {
  const sessionId = getSessionIdFromRequest(req);
  if (sessionId) await deleteSession(sessionId);
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...cookieOptions(), maxAge: 0 });
}

// --- API para Server Components (páginas/layouts, sin req directo) ---
// Usa next/headers — sólo funciona dentro de un request real de Next (no en tests unitarios
// llamando la función a mano). La protección de páginas privadas se verifica igual en la
// práctica corriendo la app; ver web/lib/auth/session.test.ts y with-auth.test.ts para la
// cobertura de lo que sí se puede probar como función pura.

export async function getCurrentSession(): Promise<Session | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) return null;
  const sessionId = verifySignedSessionId(cookieValue);
  if (!sessionId) return null;
  return touchSession(sessionId);
}
