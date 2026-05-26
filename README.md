# GSC AI Tool

Herramienta interna para analizar **Google Search Console** y **Google Ads** (multi-cuenta vía MCC) con IA (Gemini 2.5 Flash). Incluye dashboard web y scripts CLI.

---

## Estructura del proyecto

```
gsc-access/
├── core/          # Módulos compartidos (auth, GSC, Ads, clientes)
├── cli/           # Scripts de análisis ejecutables desde terminal
├── tests/         # Scripts de verificación de conexión
├── reports/       # JSONs y HTMLs generados (gitignored)
└── web/           # Dashboard web (Next.js)
```

---

## Setup

### 1. Instalar dependencias

```bash
npm install
cd web && npm install
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
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/api/auth/callback` |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GSC_SITE_URL` | Ej: `sc-domain:tudominio.com` |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads → Herramientas → Centro de API |
| `GOOGLE_ADS_MCC_ID` | ID del MCC sin guiones, ej: `1234567890` |

### 3. Autenticar con Google

```bash
npm run auth
```

Abre un browser para el flujo OAuth2. Genera `token.json` en el root (gitignored).

### 4. Verificar conexión

```bash
npm run test-connection
```

---

## Comandos CLI

| Comando | Descripción |
|---|---|
| `npm run auth` | Autenticación OAuth2 con Google |
| `npm run analyze` | Análisis SEO de GSC con Gemini |
| `npm run analyze-ads` | Análisis de Google Ads (todas las cuentas del MCC) |
| `npm run opportunities` | Oportunidades de keywords y blog topics por cliente |
| `npm run blog-audit` | Auditoría de borradores de blog con Gemini |
| `npm run report` | Generar reporte HTML de Ads |
| `npm run test-connection` | Verificar conexión a GSC |

### Opciones de `npm run opportunities`

```bash
# Analiza todos los sitios
npm run opportunities

# Solo un sitio
npm run opportunities -- sc-domain:ejemplo.com

# Rango de fechas personalizado
npm run opportunities -- sc-domain:ejemplo.com --days=60
```

---

## Dashboard web

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Incluye:
- **Cuentas Ads** — métricas por cuenta y campaña (Search + Performance Max)
- **Orgánico GSC** — performance por sitio, queries, páginas
- **Contenido** — oportunidades de blog desde Ads search terms, quick wins CTR, alertas

---

## Seguridad

- **Nunca commitear** `.env`, `token.json`, ni archivos `*.backup.json`
- Los tokens OAuth se guardan localmente en `token.json` (gitignored)
- Si un token se compromete: revocar en Google Cloud Console → Credentials → Reset Secret, luego correr `npm run auth`
