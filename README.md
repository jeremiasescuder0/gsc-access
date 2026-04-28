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
