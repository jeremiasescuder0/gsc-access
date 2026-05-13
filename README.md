# GSC AI Tool

Herramienta para analizar datos de **Google Search Console** y **Google Ads** (multi-cuenta vía MCC) con IA (Gemini 2.0 Flash).

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
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads → Herramientas → Centro de API |
| `GOOGLE_ADS_MCC_ID` | ID del MCC sin guiones, ej: `1234567890` |

> ⚠️ **Nunca commiteés `.env`, `oauth.json` ni `token.json`** — están en `.gitignore`.

### 3. Autenticar con Google

```bash
npm run auth
```

### 4. Verificar conexión

```bash
npm run test-connection
```

### 5. Correr el análisis de GSC

```bash
npm run analyze
```

### 6. Correr el análisis de Google Ads (multi-cuenta MCC)

```bash
npm run analyze-ads
```

Recorre todas las cuentas hijo habilitadas del MCC, trae métricas de los últimos 30 días (campañas, search terms, ad groups, conversiones), y manda cada cuenta a Gemini para:

- Análisis de **performance** (top performers, problemas, recomendaciones de presupuesto, próximos pasos).
- Detección de **anomalías** (CTR bajo, CPA alto, ROAS negativo, search terms irrelevantes, etc.).
- Si hay más de una cuenta, un análisis **cross-account** con ranking, oportunidades de escala y reallocation de budget.

Al final genera `report-ads-{timestamp}.json` con la data cruda + los análisis (ignorado por git).

## Estructura

```
├── auth.js                  # OAuth — scopes: GSC + Ads. Genera token.json
├── test.js                  # Verifica conexión con GSC
├── analyze-gemini.js        # Análisis SEO con Gemini (GSC)
├── ads-fetch.js             # Lista cuentas del MCC + corre GAQL por cuenta
├── analyze-ads-gemini.js    # Orquesta fetch + análisis Gemini multi-cuenta
├── .env.example             # Template de variables (commiteado)
├── .env                     # Secretos reales (ignorado por git)
├── token.json               # Token OAuth (ignorado por git)
└── report-ads-*.json        # Reportes generados (ignorados por git)
```

## Roadmap

- [x] Análisis de campañas de Google Ads (MCC)
- [ ] Comparación de períodos
- [ ] Exportar reportes a PDF/Sheets
- [ ] Dashboard web
