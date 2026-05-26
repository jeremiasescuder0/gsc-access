require("dotenv").config();
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const TOKEN_PATH = path.join(__dirname, "token.json");
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

function loadToken() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error("token.json no encontrado. Corré primero: npm run auth");
  }
  return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
}

function saveToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
}

function buildClient(token) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en .env");
  }

  const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
  client.setCredentials(token);

  client.on("tokens", (newTokens) => {
    const current = loadToken();
    const merged = { ...current, ...newTokens };
    // refresh_token sólo viene en la primera auth; preservarlo si el refresh no lo retorna
    if (!newTokens.refresh_token && current.refresh_token) {
      merged.refresh_token = current.refresh_token;
    }
    saveToken(merged);
    console.log("🔄 Token OAuth refrescado y guardado en token.json");
  });

  return client;
}

async function getOAuthClient() {
  const token = loadToken();
  if (!token.refresh_token) {
    throw new Error("token.json no tiene refresh_token. Re-autenticá con npm run auth");
  }

  const client = buildClient(token);
  const expiresIn = (token.expiry_date || 0) - Date.now();

  if (expiresIn < REFRESH_MARGIN_MS) {
    try {
      await client.getAccessToken();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || String(err);
      throw new Error(
        `No se pudo refrescar el token OAuth: ${msg}. Re-autenticá con npm run auth`
      );
    }
  }

  return client;
}

function getRefreshToken() {
  const token = loadToken();
  if (!token.refresh_token) {
    throw new Error("token.json no tiene refresh_token. Re-autenticá con npm run auth");
  }
  return token.refresh_token;
}

module.exports = { getOAuthClient, getRefreshToken };
