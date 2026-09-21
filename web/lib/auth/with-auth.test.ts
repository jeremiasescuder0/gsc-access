import { describe, it, expect, afterAll } from "vitest";
import { withAuth } from "./with-auth";
import { signSessionId, SESSION_COOKIE_NAME } from "./session";
const { createSession, deleteSession } = require("../../../core/store/sessions.js");

const APP_URL = "http://localhost:3000/api/algo-privado";

function makeRequest(opts: { cookie?: string; method?: string; origin?: string } = {}) {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", `${SESSION_COOKIE_NAME}=${opts.cookie}`);
  if (opts.origin) headers.set("origin", opts.origin);
  return new Request(APP_URL, { method: opts.method || "GET", headers });
}

describe("withAuth", () => {
  const createdSessionIds: string[] = [];

  afterAll(async () => {
    await Promise.all(createdSessionIds.map((id) => deleteSession(id)));
  });

  it("devuelve 401 sin cookie de sesión", async () => {
    const handler = withAuth(async () => new Response("no debería llegar acá"));
    const res = await handler(makeRequest(), { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("devuelve 401 con una cookie manipulada/inválida", async () => {
    const handler = withAuth(async () => new Response("no debería llegar acá"));
    const res = await handler(makeRequest({ cookie: "id-falso.firma-falsa" }), { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("con una sesión válida, invoca el handler y le pasa la sesión", async () => {
    const session = await createSession({ username: "test-admin" });
    createdSessionIds.push(session.id);
    const signedCookie = signSessionId(session.id);

    let receivedSession: unknown = null;
    const handler = withAuth(async (_req, _ctx, session) => {
      receivedSession = session;
      return new Response("ok");
    });

    const res = await handler(makeRequest({ cookie: signedCookie }), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect((receivedSession as { username: string } | null)?.username).toBe("test-admin");
  });

  it("rechaza con 403 un POST con Origin cross-site (defensa CSRF adicional a SameSite)", async () => {
    const session = await createSession({ username: "test-admin" });
    createdSessionIds.push(session.id);
    const signedCookie = signSessionId(session.id);

    const handler = withAuth(async () => new Response("no debería llegar acá"));
    const res = await handler(
      makeRequest({ cookie: signedCookie, method: "POST", origin: "https://sitio-malicioso.com" }),
      { params: Promise.resolve({}) }
    );
    expect(res.status).toBe(403);
  });

  it("permite un POST same-origin con sesión válida", async () => {
    const session = await createSession({ username: "test-admin" });
    createdSessionIds.push(session.id);
    const signedCookie = signSessionId(session.id);

    const handler = withAuth(async () => new Response("ok"));
    const res = await handler(
      makeRequest({ cookie: signedCookie, method: "POST", origin: "http://localhost:3000" }),
      { params: Promise.resolve({}) }
    );
    expect(res.status).toBe(200);
  });
});
