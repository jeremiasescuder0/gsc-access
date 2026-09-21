import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import path from "path";
const { checkRateLimit, recordFailedAttempt, clearRateLimit, MAX_ATTEMPTS } = require("../../../core/auth/rate-limit.js");

// IP/usuario exclusivos de este archivo de test para no interferir con datos reales ni con
// otros tests que corren en el mismo store local.
const TEST_IP = "203.0.113.10"; // TEST-NET-3 (RFC 5737) — no es una IP real
const TEST_USER = "rate-limit-test-user";

const DATA_DIR = path.resolve(__dirname, "../../../data");

function cleanupRateLimitFiles() {
  const dir = DATA_DIR;
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith("rate-limit-login-")) fs.unlinkSync(path.join(dir, f));
  }
}

describe("rate limiting de login", () => {
  afterAll(() => {
    cleanupRateLimitFiles();
  });

  it("permite intentos por debajo del máximo", async () => {
    const result = await checkRateLimit({ ip: TEST_IP, username: TEST_USER });
    expect(result.allowed).toBe(true);
  });

  it("bloquea después de MAX_ATTEMPTS intentos fallidos y devuelve retryAfterSeconds", async () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await recordFailedAttempt({ ip: TEST_IP, username: TEST_USER });
    }
    const result = await checkRateLimit({ ip: TEST_IP, username: TEST_USER });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("no bloquea permanentemente: clearRateLimit desbloquea (simula un login exitoso)", async () => {
    await clearRateLimit({ ip: TEST_IP, username: TEST_USER });
    const result = await checkRateLimit({ ip: TEST_IP, username: TEST_USER });
    expect(result.allowed).toBe(true);
  });

  it("distingue por IP: otra IP con el mismo usuario no está bloqueada", async () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await recordFailedAttempt({ ip: "198.51.100.20", username: "shared-username-test" });
    }
    const blockedIp = await checkRateLimit({ ip: "198.51.100.20", username: "shared-username-test" });
    const otherIp = await checkRateLimit({ ip: "198.51.100.21", username: "another-user-entirely" });
    expect(blockedIp.allowed).toBe(false);
    expect(otherIp.allowed).toBe(true);
  });
});
