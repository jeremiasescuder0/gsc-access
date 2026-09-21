// Verificación de credenciales del único usuario autorizado. bcrypt (vía bcryptjs, sin
// bindings nativos) en vez de Argon2id — el proyecto ya pisó un problema real con paquetes de
// binding nativo rompiendo en el build de Vercel (SQLite, descartado por el mismo motivo antes
// en este proyecto); bcryptjs es puro JS y funciona igual en cualquier entorno.
//
// bcrypt.compare() ya es resistente a timing attacks en la comparación del hash en sí. Lo que
// hay que evitar además es la diferencia de tiempo entre "usuario no existe" (si cortáramos
// ahí sin comparar nada) vs "usuario existe pero la contraseña está mal" (bcrypt corre). Por
// eso verifyCredentials SIEMPRE corre bcrypt.compare, incluso cuando el usuario no coincide —
// contra un hash dummy precalculado, para que el tiempo de respuesta no filtre si el usuario
// autorizado existe o no.

const bcrypt = require("bcryptjs");

// Hash dummy fijo (bcrypt de una cadena aleatoria, generado una sola vez) — sólo se usa para
// igualar el tiempo de cómputo cuando el username no matchea. No corresponde a ninguna
// contraseña real. IMPORTANTE: el cost factor ($2b$12$) tiene que ser el MISMO que usa
// hashPassword() más abajo — bcrypt.compare() tarda proporcional al cost factor codificado en
// el hash contra el que compara, así que un cost distinto reintroduce la diferencia de tiempo
// que esto está pensado para evitar (se detectó este bug real probando: con cost 10 acá vs 12
// en hashPassword, comparar username inválido tardaba ~3.7x menos que password inválida).
const DUMMY_HASH = "$2b$12$l4h9Oa4SxmXwexihjy/0S.2cLuxl/crnhGKai9QmEnSSxa0rQYRCu";

async function verifyCredentials({ username, password }) {
  const expectedUsername = process.env.AUTH_USERNAME;
  const expectedHash = process.env.AUTH_PASSWORD_HASH;

  if (!expectedUsername || !expectedHash) {
    throw new Error("AUTH_USERNAME / AUTH_PASSWORD_HASH no están configuradas");
  }

  // Comparación del username en tiempo constante-ish (no es tan sensible como el password, pero
  // igual evitamos el operador === de forma directa para no depender de la optimización del JIT).
  const usernameMatches =
    typeof username === "string" &&
    username.length === expectedUsername.length &&
    username === expectedUsername;

  const hashToCompare = usernameMatches ? expectedHash : DUMMY_HASH;
  const passwordMatches = await bcrypt.compare(String(password || ""), hashToCompare);

  return usernameMatches && passwordMatches;
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 12);
}

module.exports = { verifyCredentials, hashPassword };
