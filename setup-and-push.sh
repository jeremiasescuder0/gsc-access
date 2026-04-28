#!/bin/bash
# setup-and-push.sh
# Corre este script desde la raíz de tu repo: bash setup-and-push.sh
set -e

echo "🔍 Verificando que estás en un repo git..."
git rev-parse --is-inside-work-tree > /dev/null 2>&1 || { echo "❌ No estás en un repositorio git. Navegá a la carpeta del repo y volvé a correr."; exit 1; }

# ─── .gitignore ───────────────────────────────────────────────
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Secrets — NEVER commit these
.env
oauth.json
token.json

# OS / Editor
.DS_Store
*.log
.vscode/
EOF
echo "✅ .gitignore actualizado"

# ─── .env.example ─────────────────────────────────────────────
cat > .env.example << 'EOF'
# Google OAuth credentials (desde Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000

# Gemini API Key (desde Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# Google Search Console site URL
GSC_SITE_URL=sc-domain:yourdomain.com
EOF
echo "✅ .env.example creado"

# ─── .env (local, no se commitea) ─────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env creado desde .env.example — completá tus credenciales"
else
  echo "ℹ️  .env ya existe, no se sobreescribió"
fi

# ─── auth.js ──────────────────────────────────────────────────
cat > auth.js << 'EOF'
require("dotenv").config();
const { google } = require("googleapis");
const http = require("http");
const fs = require("fs");

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("❌ Faltan variables de entorno. Copiá .env.example a .env y completá los valores.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/webmasters.readonly"],
});

console.log("\n🔗 Abrí este link en tu navegador:\n");
console.log(url);

http
  .createServer(async (req, res) => {
    if (req.url.includes("code=")) {
      const code = new URL(req.url, GOOGLE_REDIRECT_URI).searchParams.get("code");
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      fs.writeFileSync("token.json", JSON.stringify(tokens, null, 2));
      res.end("Autenticado! Ya podés cerrar.");
      console.log("\n✅ Token guardado en token.json (ignorado por git)");
      process.exit();
    }
  })
  .listen(3000, () => {
    console.log("Server escuchando en http://localhost:3000");
  });
EOF
echo "✅ auth.js actualizado"

# ─── test.js ──────────────────────────────────────────────────
cat > test.js << 'EOF'
require("dotenv").config();
const { google } = require("googleapis");
const fs = require("fs");

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GSC_SITE_URL } = process.env;

if (!fs.existsSync("token.json")) {
  console.error("❌ No se encontró token.json. Corré primero: node auth.js");
  process.exit(1);
}

const token = JSON.parse(fs.readFileSync("token.json"));

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials(token);

const searchconsole = google.searchconsole({ version: "v1", auth: oauth2Client });

async function run() {
  const res = await searchconsole.searchanalytics.query({
    siteUrl: GSC_SITE_URL,
    requestBody: {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      dimensions: ["query"],
    },
  });
  console.log(res.data);
}

run();
EOF
echo "✅ test.js actualizado"

# ─── analyze-gemini.js ────────────────────────────────────────
cat > analyze-gemini.js << 'EOF'
require("dotenv").config();
const { google } = require("googleapis");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const { GEMINI_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GSC_SITE_URL } = process.env;

if (!GEMINI_API_KEY || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("❌ Faltan variables de entorno. Revisá tu .env");
  process.exit(1);
}

if (!fs.existsSync("token.json")) {
  console.error("❌ No se encontró token.json. Corré primero: node auth.js");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const token = JSON.parse(fs.readFileSync("token.json"));
const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
oauth2Client.setCredentials(token);

const searchconsole = google.searchconsole({ version: "v1", auth: oauth2Client });

async function run() {
  const res = await searchconsole.searchanalytics.query({
    siteUrl: GSC_SITE_URL,
    requestBody: {
      startDate: "2025-01-01",
      endDate: "2025-02-01",
      dimensions: ["query"],
      rowLimit: 20,
    },
  });

  const rows = res.data.rows || [];
  const formatted = rows.map(r => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));

  const prompt = `
You are an SEO expert.

Analyze this Google Search Console data and provide:
1. Top opportunities (high impressions, low CTR)
2. Quick wins (positions 2-10)
3. Content ideas

Data:
${JSON.stringify(formatted, null, 2)}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  console.log("\n🔥 INSIGHTS:\n");
  console.log(text);
}

run();
EOF
echo "✅ analyze-gemini.js actualizado"

# ─── package.json ─────────────────────────────────────────────
cat > package.json << 'EOF'
{
  "name": "gsc-ai-tool",
  "version": "0.1.0",
  "description": "Google Search Console + Gemini AI analysis tool",
  "main": "analyze-gemini.js",
  "scripts": {
    "auth": "node auth.js",
    "test-connection": "node test.js",
    "analyze": "node analyze-gemini.js"
  },
  "keywords": ["seo", "google-search-console", "gemini", "ai"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.91.0",
    "@google/generative-ai": "^0.24.1",
    "dotenv": "^16.4.5",
    "googleapis": "^171.4.0",
    "open": "^11.0.0"
  }
}
EOF
echo "✅ package.json actualizado"

# ─── README.md ────────────────────────────────────────────────
cat > README.md << 'EOF'
# GSC AI Tool

Herramienta para analizar datos de **Google Search Console** con IA (Gemini). Diseñada para escalar hacia análisis de campañas de ads y otras fuentes.

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Completar `.env` con tus credenciales:

| Variable | Dónde conseguirla |
|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Mismo lugar |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000` (para dev local) |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GSC_SITE_URL` | Ej: `sc-domain:tudominio.com` |

> ⚠️ **Nunca commiteés `.env`, `oauth.json` ni `token.json`** — están en `.gitignore`.

### 3. Autenticar con Google

```bash
npm run auth
```

### 4. Verificar conexión

```bash
npm run test-connection
```

### 5. Correr el análisis

```bash
npm run analyze
```

## Estructura

```
├── auth.js              # Flujo OAuth — genera token.json
├── test.js              # Verifica conexión con GSC
├── analyze-gemini.js    # Análisis principal con Gemini
├── .env.example         # Template de variables (commiteado)
├── .env                 # Secretos reales (ignorado por git)
├── token.json           # Token OAuth (ignorado por git)
└── oauth.json           # Credenciales OAuth (ignorado por git)
```

## Roadmap

- [ ] Análisis de campañas de Google Ads
- [ ] Comparación de períodos
- [ ] Exportar reportes a PDF/Sheets
- [ ] Dashboard web
EOF
echo "✅ README.md creado"

# ─── Instalar dotenv ──────────────────────────────────────────
echo ""
echo "📦 Instalando dotenv..."
npm install dotenv --save

# ─── Limpiar archivos secretos del tracking de git ────────────
echo ""
echo "🧹 Removiendo secretos del tracking de git (si estaban trackeados)..."
git rm --cached oauth.json token.json .env 2>/dev/null && echo "  → Removidos del índice" || echo "  → No estaban trackeados (bien)"

# ─── Commit y push ────────────────────────────────────────────
echo ""
echo "📝 Commiteando..."
git add .gitignore .env.example auth.js test.js analyze-gemini.js package.json package-lock.json README.md
git commit -m "feat: refactor to use dotenv, remove hardcoded secrets

- Replace oauth.json/token.json reads with process.env via dotenv
- Add .env.example with all required variables
- Fix .gitignore (was ignoring itself)
- Add input validation and startup checks to all scripts
- Add npm scripts: auth, test-connection, analyze
- Add README with setup instructions"

echo ""
echo "🚀 Pusheando..."
git push

echo ""
echo "✅ Todo listo!"
echo ""
echo "⚠️  Acordate de rotar tus credenciales si no lo hiciste:"
echo "   → Gemini API Key: https://aistudio.google.com/apikey"
echo "   → OAuth client secret: https://console.cloud.google.com"
echo "   → Luego completá tu .env con las nuevas credenciales y corré: npm run auth"