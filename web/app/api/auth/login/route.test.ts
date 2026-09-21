import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { POST as loginPOST } from "./route";
import { POST as logoutPOST } from "../logout/route";
import { GET as sessionGET } from "../session/route";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const LOGIN_URL = "http://localhost:3000/api/auth/login";
const TEST_IP = "203.0.113.55"; // TEST-NET-3 (RFC 5737), exclusivo de este archivo

function loginRequest(body: unknown, ip = TEST_IP) {
  return new Request(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function extractCookieValue(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

describe("POST /api/auth/login", () => {
  afterAll(() => {
    const dataDir = path.resolve(__dirname, "../../../../../data");
    if (!fs.existsSync(dataDir)) return;
    for (const f of fs.readdirSync(dataDir)) {
      if (f.startsWith("rate-limit-login-")) fs.unlinkSync(path.join(dataDir, f));
    }
  });

  it("login correcto: 200, setea cookie httpOnly/sameSite=lax, y regenera sesión en cada login", async () => {
    const res1 = await loginPOST(loginRequest({ username: "test-admin", password: "test-password-123456" }));
    expect(res1.status).toBe(200);

    const setCookie = res1.headers.get("set-cookie") || "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie).toContain("Path=/");

    const cookie1 = extractCookieValue(res1);
    expect(cookie1).toBeTruthy();

    // Segundo login (protección session fixation): tiene que ser una sesión NUEVA, no la misma.
    const res2 = await loginPOST(loginRequest({ username: "test-admin", password: "test-password-123456" }));
    const cookie2 = extractCookieValue(res2);
    expect(cookie2).toBeTruthy();
    expect(cookie2).not.toBe(cookie1);
  });

  it("password incorrecta: 401 con mensaje genérico", async () => {
    const res = await loginPOST(loginRequest({ username: "test-admin", password: "password-incorrecta" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Usuario o contraseña incorrectos.");
  });

  it("usuario incorrecto: 401 con EL MISMO mensaje genérico (no revela si el usuario existe)", async () => {
    const res = await loginPOST(loginRequest({ username: "usuario-que-no-existe", password: "test-password-123456" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Usuario o contraseña incorrectos.");
  });

  it("campos vacíos: 400", async () => {
    const res = await loginPOST(loginRequest({ username: "", password: "" }));
    expect(res.status).toBe(400);
  });

  it("campos con tipos inesperados: 400 (nunca confía en el shape del body del cliente)", async () => {
    const res = await loginPOST(loginRequest({ username: { $ne: null }, password: ["a", "b"] }));
    expect(res.status).toBe(400);
  });

  it("no expone información sensible en la respuesta de error", async () => {
    const res = await loginPOST(loginRequest({ username: "test-admin", password: "mal" }));
    const text = await res.text();
    expect(text.toLowerCase()).not.toContain("hash");
    expect(text.toLowerCase()).not.toContain("bcrypt");
    expect(text).not.toContain(process.env.AUTH_PASSWORD_HASH || "");
    expect(text).not.toContain(process.env.SESSION_SECRET || "");
  });

  it("rate limiting: bloquea con 429 después de varios intentos fallidos, incluso con credenciales luego correctas", async () => {
    const ip = "203.0.113.77";
    for (let i = 0; i < 6; i++) {
      await loginPOST(loginRequest({ username: "rl-route-user", password: "mal" }, ip));
    }
    const res = await loginPOST(loginRequest({ username: "test-admin", password: "test-password-123456" }, ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("logout invalida la sesión server-side: acceder después con la cookie vieja falla", async () => {
    const loginRes = await loginPOST(loginRequest({ username: "test-admin", password: "test-password-123456" }));
    const cookieValue = extractCookieValue(loginRes);
    expect(cookieValue).toBeTruthy();

    const authedCheck = await sessionGET(
      new Request("http://localhost:3000/api/auth/session", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${cookieValue}` },
      })
    );
    expect((await authedCheck.json()).authenticated).toBe(true);

    const logoutRes = await logoutPOST(
      new Request("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${cookieValue}` },
      })
    );
    expect(logoutRes.status).toBe(200);
    // La cookie de logout tiene que instruir al browser a borrarla.
    expect(logoutRes.headers.get("set-cookie") || "").toMatch(/Max-Age=0/i);

    const afterLogoutCheck = await sessionGET(
      new Request("http://localhost:3000/api/auth/session", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${cookieValue}` },
      })
    );
    expect((await afterLogoutCheck.json()).authenticated).toBe(false);
  });

  it("sin cookie: /api/auth/session responde authenticated: false (no 500, no excepción)", async () => {
    const res = await sessionGET(new Request("http://localhost:3000/api/auth/session"));
    expect(res.status).toBe(200);
    expect((await res.json()).authenticated).toBe(false);
  });
});
