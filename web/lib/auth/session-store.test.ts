import { describe, it, expect, vi, afterEach } from "vitest";
const { createSession, touchSession, deleteSession, IDLE_TIMEOUT_MS, ABSOLUTE_TIMEOUT_MS } = require("../../../core/store/sessions.js");

describe("core/store/sessions.js", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("crea una sesión con id aleatorio de al menos 32 caracteres (256 bits en base64url)", async () => {
    const session = await createSession({ username: "test-admin" });
    expect(session.id.length).toBeGreaterThanOrEqual(32);
    expect(session.username).toBe("test-admin");
    await deleteSession(session.id);
  });

  it("dos sesiones creadas seguidas tienen ids distintos (no reutiliza — protección session fixation)", async () => {
    const a = await createSession({ username: "test-admin" });
    const b = await createSession({ username: "test-admin" });
    expect(a.id).not.toBe(b.id);
    await deleteSession(a.id);
    await deleteSession(b.id);
  });

  it("touchSession devuelve la sesión mientras esté vigente", async () => {
    const session = await createSession({ username: "test-admin" });
    const touched = await touchSession(session.id);
    expect(touched?.id).toBe(session.id);
    await deleteSession(session.id);
  });

  it("touchSession devuelve null para un id que no existe", async () => {
    expect(await touchSession("id-que-no-existe")).toBeNull();
  });

  it("una sesión expira por inactividad (idle timeout) y se comporta como inexistente", async () => {
    vi.useFakeTimers();
    const start = Date.now();
    vi.setSystemTime(start);

    const session = await createSession({ username: "test-admin" });

    vi.setSystemTime(start + IDLE_TIMEOUT_MS + 1000);
    const afterIdle = await touchSession(session.id);
    expect(afterIdle).toBeNull();

    // Una vez expirada, ni siquiera queda el registro — un touch posterior también da null.
    vi.setSystemTime(start + IDLE_TIMEOUT_MS + 2000);
    expect(await touchSession(session.id)).toBeNull();
  });

  it("una sesión expira por límite absoluto aunque haya actividad constante (sin llegar a inactividad)", async () => {
    vi.useFakeTimers();
    const start = Date.now();
    vi.setSystemTime(start);
    const session = await createSession({ username: "test-admin" });

    // Actividad cada 20 min (menos que el idle timeout de 30 min) para mantenerla viva vía
    // touchSession, hasta justo antes del límite absoluto — el idle timeout nunca debería
    // dispararse acá, así que si igual expira, es por el límite absoluto.
    const step = 20 * 60 * 1000;
    let elapsed = 0;
    while (elapsed + step < ABSOLUTE_TIMEOUT_MS) {
      elapsed += step;
      vi.setSystemTime(start + elapsed);
      const touched = await touchSession(session.id);
      expect(touched?.id).toBe(session.id);
    }

    vi.setSystemTime(start + ABSOLUTE_TIMEOUT_MS + 1000);
    expect(await touchSession(session.id)).toBeNull();
  });

  it("deleteSession invalida la sesión de inmediato (logout / revocación server-side)", async () => {
    const session = await createSession({ username: "test-admin" });
    expect(await touchSession(session.id)).not.toBeNull();
    await deleteSession(session.id);
    expect(await touchSession(session.id)).toBeNull();
  });
});
