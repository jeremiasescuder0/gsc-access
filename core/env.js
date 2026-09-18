// Carga el .env de la raíz del repo — requerido por todos los módulos de core/ que necesitan
// GOOGLE_CLIENT_ID, GEMINI_API_KEY, etc.
//
// No alcanza con `require("dotenv").config()` a secas: por default dotenv busca .env en
// process.cwd(), y cuando este código corre bajo Next (web/), process.cwd() es web/, no la raíz
// del repo — el .env real nunca se encontraba (confirmado en pruebas: sin esto, cualquier ruta
// que tocara Google fallaba con "Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" aunque el .env
// existiera y estuviera bien completo).
//
// Tampoco alcanza __dirname: una vez que este archivo se importa de forma estática desde web/ y
// Turbopack lo empaqueta en el build de producción, __dirname deja de apuntar a su ubicación
// real en disco (mismo problema documentado en core/store/json-store.js).
//
// En Vercel esto es un no-op inofensivo: no hay .env (las env vars se inyectan directo por
// Vercel), dotenv simplemente no encuentra el archivo y sigue.
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

function resolveRepoRoot() {
  const looksLikeRepoRoot = (dir) => fs.existsSync(path.join(dir, "core")) && fs.existsSync(path.join(dir, "web"));
  const cwd = process.cwd();
  if (looksLikeRepoRoot(cwd)) return cwd;
  const parent = path.resolve(cwd, "..");
  if (looksLikeRepoRoot(parent)) return parent;
  return path.resolve(__dirname, "..");
}

const REPO_ROOT = resolveRepoRoot();
dotenv.config({ path: path.join(REPO_ROOT, ".env") });

module.exports = { REPO_ROOT, resolveRepoRoot };
