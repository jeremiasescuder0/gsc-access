# gsc-access — Contexto del proyecto

## Qué es
Herramienta Node.js que conecta Google Search Console + Google Ads con Gemini para análisis automático de performance de clientes.

## Arquitectura
- `auth.js` — OAuth2 con scopes de GSC + Ads. Genera token.json
- `ads-fetch.js` — Se conecta al MCC, lista cuentas hijo, corre queries GAQL (campañas, search terms, ad groups, conversiones)
- `analyze-ads-gemini.js` — Orquesta el fetch y manda los datos a Gemini 2.0 Flash con 3 prompts: performance, anomalías, comparación cross-account
- `analyze-gemini.js` — Análisis original de GSC (SEO)

## Stack
- google-ads-api (GAQL)
- googleapis (GSC + OAuth)
- @google/generative-ai (Gemini 2.0 Flash)

## Próximos pasos pendientes
- Solicitar acceso de producción para el developer token de Ads
- Agregar manejo de refresh token automático
- Dashboard web para visualizar los reportes JSON