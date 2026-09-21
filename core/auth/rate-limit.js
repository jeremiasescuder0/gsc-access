// Rate limiting del endpoint de login — ventana fija de tiempo, por IP y por usuario, sin
// bloqueo permanente. Usa el mismo store KV/archivo que el resto de la app (readJson/writeJson
// de core/store/json-store.js) en vez de mantener contadores en memoria: en serverless cada
// invocación puede caer en una instancia distinta, así que un contador in-memory no serviría.

const { readJson, writeJson } = require("../store/json-store");

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;

function keyFor(kind, id) {
  return `rate-limit/login-${kind}-${encodeURIComponent(id)}`;
}

async function getCounter(key) {
  const now = Date.now();
  const counter = await readJson(key, null);
  if (!counter || now - counter.windowStart > WINDOW_MS) {
    return { windowStart: now, attempts: 0 };
  }
  return counter;
}

// Chequea SIN incrementar — se llama antes de procesar el intento de login, para poder
// rechazar de entrada sin siquiera comparar la contraseña.
async function checkRateLimit({ ip, username }) {
  const [ipCounter, userCounter] = await Promise.all([
    getCounter(keyFor("ip", ip)),
    getCounter(keyFor("user", username)),
  ]);

  const blocked = ipCounter.attempts >= MAX_ATTEMPTS || userCounter.attempts >= MAX_ATTEMPTS;
  if (!blocked) return { allowed: true };

  const oldestWindowStart = Math.min(ipCounter.windowStart, userCounter.windowStart);
  const retryAfterMs = Math.max(0, WINDOW_MS - (Date.now() - oldestWindowStart));
  return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
}

async function recordFailedAttempt({ ip, username }) {
  const ipKey = keyFor("ip", ip);
  const userKey = keyFor("user", username);
  const [ipCounter, userCounter] = await Promise.all([getCounter(ipKey), getCounter(userKey)]);
  await Promise.all([
    writeJson(ipKey, { windowStart: ipCounter.windowStart, attempts: ipCounter.attempts + 1 }),
    writeJson(userKey, { windowStart: userCounter.windowStart, attempts: userCounter.attempts + 1 }),
  ]);
}

// Login exitoso: limpiar los contadores para que un usuario legítimo nunca quede bloqueado por
// intentos previos fallidos (ej. typos) una vez que entra bien.
async function clearRateLimit({ ip, username }) {
  await Promise.all([
    writeJson(keyFor("ip", ip), { windowStart: Date.now(), attempts: 0 }),
    writeJson(keyFor("user", username), { windowStart: Date.now(), attempts: 0 }),
  ]);
}

module.exports = { WINDOW_MS, MAX_ATTEMPTS, checkRateLimit, recordFailedAttempt, clearRateLimit };
