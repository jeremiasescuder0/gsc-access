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


```


