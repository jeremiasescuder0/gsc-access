// Capa de persistencia con DOS backends, elegidos automáticamente según el entorno — el resto
// de core/store/*.js usa esta misma interfaz async sin saber cuál está activo:
//
// - Local (default): un archivo JSON por registro en data/<colección>/<id>.json. Lo que usa
//   desarrollo local — rápido, sin dependencias externas, funciona offline.
// - Vercel KV (si KV_REST_API_URL / KV_REST_API_TOKEN están seteadas): Redis administrado vía
//   REST. Necesario en producción: las funciones serverless de Vercel tienen filesystem
//   efímero — nada escrito a disco sobrevive entre invocaciones ni entre deploys.
//
// Se usa fetch nativo contra la REST API de Upstash (la misma que expone Vercel KV) en vez del
// SDK @vercel/kv, para no depender de cómo el bundler de Next resuelve un paquete importado
// desde un archivo que a su vez se trae con import estático desde fuera de web/ — con fetch no
// hay ninguna resolución de módulos de por medio, sólo un HTTP call en runtime.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { REPO_ROOT } = require("../env");

// OJO con __dirname: una vez que este archivo se importa de forma estática desde web/ (necesario
// para que Vercel lo incluya en el bundle — ver la nota en web/lib/gsc-data.ts), Turbopack lo
// empaqueta dentro de un chunk compilado, y __dirname deja de apuntar a la ubicación real del
// archivo en disco (confirmado en pruebas: con __dirname, un registro se escribió en un
// directorio fantasma en vez de data/, sin ningún error — pérdida silenciosa de datos). Por eso
// DATA_ROOT se calcula a partir de REPO_ROOT (core/env.js — usa process.cwd(), confiable incluso
// bundleado) y no de __dirname.
const DATA_ROOT = path.join(REPO_ROOT, "data");

function newId() {
  return crypto.randomUUID();
}

function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Vercel prefija las env vars que provisiona una integración de Marketplace (Storage → Upstash)
// con un prefijo derivado del nombre del proyecto, para evitar colisiones si se conectan varias
// — ej. GSC_ACC_KV_REST_API_URL en vez de KV_REST_API_URL a secas. No hay forma de saber ese
// prefijo de antemano (ni de copiar el valor: son env vars "sensitive", no se pueden volver a
// leer una vez creadas), así que además del nombre plano se busca cualquier variable que
// termine en _KV_REST_API_URL / _KV_REST_API_TOKEN.
function findKvCredential(suffix) {
  if (process.env[suffix]) return process.env[suffix];
  const key = Object.keys(process.env).find((k) => k.endsWith(`_${suffix}`));
  return key ? process.env[key] : undefined;
}

const KV_URL = findKvCredential("KV_REST_API_URL");
const KV_TOKEN = findKvCredential("KV_REST_API_TOKEN");
const USE_KV = Boolean(KV_URL && KV_TOKEN);

// --- Backend KV ---

async function kvCommand(...args) {
  const res = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) {
    throw new Error(
      `Vercel KV: comando ${args[0]} falló (${res.status} ${res.statusText}): ${data?.error || "sin detalle"}`
    );
  }
  return data.result;
}

async function kvGetJson(key) {
  const raw = await kvCommand("GET", key);
  if (raw === null || raw === undefined) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function kvSetJson(key, value) {
  await kvCommand("SET", key, JSON.stringify(value));
}

async function kvDelKey(key) {
  await kvCommand("DEL", key);
}

function kvCollection(name) {
  const indexKey = `${name}:__ids__`;
  const keyFor = (id) => `${name}:${id}`;

  return {
    async list() {
      const ids = (await kvCommand("SMEMBERS", indexKey)) || [];
      const records = await Promise.all(ids.map((id) => kvGetJson(keyFor(id))));
      return records.filter(Boolean);
    },
    async get(id) {
      return kvGetJson(keyFor(id));
    },
    async write(id, record) {
      await kvSetJson(keyFor(id), record);
      await kvCommand("SADD", indexKey, id);
      return record;
    },
    async remove(id) {
      await kvDelKey(keyFor(id));
      await kvCommand("SREM", indexKey, id);
    },
  };
}

// --- Backend local (archivos JSON) ---

// Vercel siempre setea VERCEL=1 en las funciones serverless. Si llegamos hasta acá sin KV
// configurado estando en Vercel, es casi seguro un error de configuración (falta conectar el KV
// store o faltan sus env vars) — mejor fallar fuerte y explícito que escribir en un filesystem
// efímero y perder todo silenciosamente en el próximo cold start.
function assertSafeToUseLocalFiles() {
  if (process.env.VERCEL && !USE_KV) {
    throw new Error(
      "No se puede usar almacenamiento en archivos locales en Vercel (filesystem efímero). " +
        "Conectá un Vercel KV store al proyecto y verificá que KV_REST_API_URL / KV_REST_API_TOKEN " +
        "estén seteadas en las variables de entorno."
    );
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJsonFileLocal(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`[json-store] error leyendo ${filePath}: ${err.message}`);
    return fallback;
  }
}

function writeJsonFileAtomicLocal(filePath, data) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
  return data;
}

function fileCollection(name) {
  const dir = path.join(DATA_ROOT, name);
  const filePathFor = (id) => path.join(dir, `${id}.json`);

  return {
    async list() {
      assertSafeToUseLocalFiles();
      ensureDir(dir);
      return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => readJsonFileLocal(path.join(dir, f), null))
        .filter(Boolean);
    },
    async get(id) {
      assertSafeToUseLocalFiles();
      return readJsonFileLocal(filePathFor(id), null);
    },
    async write(id, record) {
      assertSafeToUseLocalFiles();
      return writeJsonFileAtomicLocal(filePathFor(id), record);
    },
    async remove(id) {
      assertSafeToUseLocalFiles();
      const fp = filePathFor(id);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    },
  };
}

// --- API pública — misma forma sea cual sea el backend activo ---

function createCollection(name) {
  return USE_KV ? kvCollection(name) : fileCollection(name);
}

// Para registros que no encajan en "una colección de ids" (ej: content-inventory, que guarda un
// array por sitio bajo una sola clave namespaceada, tipo "content-inventory/<slug>").
async function readJson(namespacedKey, fallback) {
  if (USE_KV) {
    const value = await kvGetJson(namespacedKey);
    return value === null ? fallback : value;
  }
  assertSafeToUseLocalFiles();
  return readJsonFileLocal(path.join(DATA_ROOT, `${namespacedKey}.json`), fallback);
}

async function writeJson(namespacedKey, data) {
  if (USE_KV) {
    await kvSetJson(namespacedKey, data);
    return data;
  }
  assertSafeToUseLocalFiles();
  return writeJsonFileAtomicLocal(path.join(DATA_ROOT, `${namespacedKey}.json`), data);
}

// Ida y vuelta de escritura/lectura/borrado contra el backend activo — usado por la ruta de
// diagnóstico para confirmar que las credenciales de KV están bien configuradas en Vercel sin
// tener que adivinar mirando logs.
async function selfTest() {
  // Sin ":" — es un carácter inválido en nombres de archivo de Windows (donde corre dev local).
  const key = `__selftest__-${Date.now()}`;
  const payload = { ok: true, at: new Date().toISOString() };
  await writeJson(key, payload);
  const read = await readJson(key, null);
  if (USE_KV) await kvDelKey(key);
  else {
    const fp = path.join(DATA_ROOT, `${key}.json`);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  return {
    backend: USE_KV ? "vercel-kv" : "local-files",
    roundTripOk: read?.ok === true,
  };
}

module.exports = {
  DATA_ROOT,
  USE_KV,
  createCollection,
  readJson,
  writeJson,
  newId,
  slugify,
  selfTest,
};
