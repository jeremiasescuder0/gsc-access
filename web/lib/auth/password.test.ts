import { describe, it, expect } from "vitest";
// require directo del módulo CJS de core/ — mismo patrón que el resto del bridge.
const { verifyCredentials, hashPassword } = require("../../../core/auth/password.js");

describe("verifyCredentials", () => {
  it("acepta usuario y contraseña correctos", async () => {
    const ok = await verifyCredentials({ username: "test-admin", password: "test-password-123456" });
    expect(ok).toBe(true);
  });

  it("rechaza contraseña incorrecta", async () => {
    const ok = await verifyCredentials({ username: "test-admin", password: "wrong-password" });
    expect(ok).toBe(false);
  });

  it("rechaza usuario incorrecto", async () => {
    const ok = await verifyCredentials({ username: "not-the-admin", password: "test-password-123456" });
    expect(ok).toBe(false);
  });

  it("rechaza campos vacíos", async () => {
    expect(await verifyCredentials({ username: "", password: "" })).toBe(false);
    expect(await verifyCredentials({ username: "test-admin", password: "" })).toBe(false);
  });

  it("no explota con password undefined/null (tipos inesperados del cliente)", async () => {
    // @ts-expect-error — a propósito: el backend no debe confiar en el tipo que manda el cliente.
    await expect(verifyCredentials({ username: "test-admin", password: null })).resolves.toBe(false);
  });

  it("tarda un tiempo comparable entre usuario incorrecto y password incorrecta (mitigación de timing attack)", async () => {
    const t0 = Date.now();
    await verifyCredentials({ username: "test-admin", password: "wrong" });
    const wrongPasswordMs = Date.now() - t0;

    const t1 = Date.now();
    await verifyCredentials({ username: "no-such-user", password: "wrong" });
    const wrongUserMs = Date.now() - t1;

    // No exigimos igualdad exacta (hay jitter real de CPU) pero sí que estén en el mismo orden
    // de magnitud — si wrong-user fuera mucho más rápido, señalaría que se está saltando el
    // bcrypt.compare() cuando el usuario no matchea, filtrando por timing si el user existe.
    const ratio = Math.max(wrongPasswordMs, wrongUserMs) / Math.max(1, Math.min(wrongPasswordMs, wrongUserMs));
    expect(ratio).toBeLessThan(2.5);
  });

  it("hashPassword produce un hash que verifyCredentials acepta", async () => {
    const hash = await hashPassword("another-secure-password-1");
    const original = process.env.AUTH_PASSWORD_HASH;
    process.env.AUTH_PASSWORD_HASH = hash;
    try {
      expect(await verifyCredentials({ username: "test-admin", password: "another-secure-password-1" })).toBe(true);
    } finally {
      process.env.AUTH_PASSWORD_HASH = original;
    }
  });
});
