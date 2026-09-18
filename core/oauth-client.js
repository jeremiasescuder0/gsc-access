const { REPO_ROOT } = require("./env");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// GOOGLE_REFRESH_TOKEN (env var) tiene prioridad sobre token.json — es el camino de producción
// (Vercel): el filesystem serverless es efímero, así que no hay ningún archivo para leer ni
// donde persistir un refresh. El client_id/secret siguen alcanzando para pedir un access_token
// nuevo en cada cold start a partir del refresh_token; Google normalmente no lo rota, así que no
// hace falta guardar nada de vuelta.
//
// Localmente (sin esa env var) se sigue usando token.json como siempre — flujo sin cambios.
const TOKEN_PATH = path.join(REPO_ROOT, "token.json");
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const ENV_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || null;

function loadToken() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error("token.json no encontrado. Corré primero: npm run auth");
  }
  return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
}

function saveToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
}

function buildClient(token, { persist }) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en .env");
  }

  const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
  client.setCredentials(token);

  if (persist) {
    client.on("tokens", (newTokens) => {
      const current = loadToken();
      const merged = { ...current, ...newTokens };
      if (!newTokens.refresh_token && current.refresh_token) {
        merged.refresh_token = current.refresh_token;
      }
      saveToken(merged);
      console.log("Token OAuth refrescado y guardado en token.json");
    });
  }

  return client;
}

async function getOAuthClient() {
  if (ENV_REFRESH_TOKEN) {
    // Sin expiry_date/access_token: el SDK pide uno nuevo la primera vez que se necesita.
    const client = buildClient({ refresh_token: ENV_REFRESH_TOKEN }, { persist: false });
    try {
      await client.getAccessToken();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || String(err);
      throw new Error(`No se pudo obtener access token desde GOOGLE_REFRESH_TOKEN: ${msg}`);
    }
    return client;
  }

  const token = loadToken();
  if (!token.refresh_token) {
    throw new Error("token.json no tiene refresh_token. Re-autenticate con npm run auth");
  }

  const client = buildClient(token, { persist: true });
  const expiresIn = (token.expiry_date || 0) - Date.now();

  if (expiresIn < REFRESH_MARGIN_MS) {
    try {
      await client.getAccessToken();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || String(err);
      throw new Error(
        `No se pudo refrescar el token OAuth: ${msg}. Re-autenticate con npm run auth`
      );
    }
  }

  return client;
}

function getRefreshToken() {
  if (ENV_REFRESH_TOKEN) return ENV_REFRESH_TOKEN;
  const token = loadToken();
  if (!token.refresh_token) {
    throw new Error("token.json no tiene refresh_token. Re-autenticate con npm run auth");
  }
  return token.refresh_token;
}

module.exports = { getOAuthClient, getRefreshToken };
