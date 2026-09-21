// Sesiones server-side para el login de un único usuario. La cookie en el navegador sólo
// guarda un ID de sesión aleatorio opaco — el registro real (cuándo se creó, última actividad)
// vive acá, en el mismo store KV/archivo que el resto de la app (core/store/json-store.js).
// Sin JWT ni tokens firmados: la autoridad siempre es este registro server-side, lo que permite
// revocación real en logout (borrar el registro) en vez de esperar a que expire un token.

const crypto = require("crypto");
const { createCollection } = require("./json-store");

// Ventanas de expiración — ver README/resumen de la implementación para la justificación.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min sin actividad
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 horas desde el login, sin importar actividad

const collection = createCollection("sessions");

function newSessionId() {
  // 256 bits — suficiente para que adivinar un ID por fuerza bruta sea inviable.
  return crypto.randomBytes(32).toString("base64url");
}

async function createSession({ username }) {
  const now = Date.now();
  const id = newSessionId();
  const record = {
    id,
    username,
    createdAt: now,
    lastActivityAt: now,
  };
  await collection.write(id, record);
  return record;
}

function isExpired(session) {
  const now = Date.now();
  if (now - session.createdAt > ABSOLUTE_TIMEOUT_MS) return true;
  if (now - session.lastActivityAt > IDLE_TIMEOUT_MS) return true;
  return false;
}

// Devuelve la sesión si es válida y no expiró, actualizando lastActivityAt (idle timeout
// deslizante). Si expiró, la borra del store y devuelve null — una sesión vencida se comporta
// exactamente igual que una sesión inexistente, como pide el spec.
async function touchSession(id) {
  if (!id) return null;
  const session = await collection.get(id);
  if (!session) return null;
  if (isExpired(session)) {
    await collection.remove(id);
    return null;
  }
  const updated = { ...session, lastActivityAt: Date.now() };
  await collection.write(id, updated);
  return updated;
}

async function deleteSession(id) {
  if (!id) return;
  await collection.remove(id);
}

module.exports = {
  IDLE_TIMEOUT_MS,
  ABSOLUTE_TIMEOUT_MS,
  createSession,
  touchSession,
  deleteSession,
};
