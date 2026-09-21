// Reglas globales de contenido + perfil de contenido por cliente (sección 3 del spec).
// Objetivo: no repetir las reglas de marca/estilo en cada prompt de Gemini. El prompt final
// del Writer (Fase 3) se arma como GLOBAL_CONTENT_RULES + ClientContentProfile + brief del
// blog puntual, en vez de un mega-prompt duplicado por artículo.

const { createCollection } = require("./json-store");
const { CLIENTS, getClientByGscSite } = require("../clients");

const GLOBAL_CONTENT_RULES = {
  language: "Inglés salvo que se indique lo contrario",
  wordCountRange: [800, 1000],
  seoAeoBalance: { seo: 70, aeo: 30 },
  structure: [
    "Exactamente un H1",
    "Jerarquía lógica de H2/H3",
    "Keyword principal presente de forma natural en el H1 y en la introducción",
    "Keywords secundarias usadas naturalmente, sin keyword stuffing",
  ],
  style: [
    "Párrafos cortos y legibles",
    "Pasajes de respuesta directa donde sea apropiado (AEO/GEO)",
    "Escritura humana, profesional y natural",
    "Sin relleno ni redacción robótica",
    "Sin guiones largos (em dash)",
  ],
  restrictions: ["Sin tablas salvo que se pida explícitamente", "Sin precios salvo que se pida explícitamente"],
  cta: "CTA suave y relevante al cierre",
};

const collection = createCollection("client-profiles");

function slugId(gscSite) {
  return gscSite.replace(/^sc-domain:/, "").replace(/[^a-z0-9.-]+/gi, "_");
}

function defaultProfile(client) {
  return {
    gscSite: client.gscSite,
    clientName: client.name,
    brandName: client.name,
    website: null,
    primaryServices: [],
    locations: [],
    targetAudience: null,
    preferredTone: null,
    // null = usa GLOBAL_CONTENT_RULES.wordCountRange / seoAeoBalance sin override
    defaultArticleLength: null,
    seoAeoBalance: null,
    wordsToAvoid: [],
    claimsToAvoid: [],
    firstPersonPlural: true,
    ctaStyle: null,
    contentRestrictions: [],
    internalServicePages: [],
    otherInstructions: null,
    // Propiedad GA4 del cliente (sólo el número, ej. "123456789"). Se asigna desde la UI del
    // perfil eligiendo entre las propiedades a las que la cuenta autenticada tiene acceso.
    ga4PropertyId: null,
    // Nombres de key events de GA4 que cuentan como conversión para este cliente (cada cliente
    // los nombra distinto: generate_lead, form_submit, phone_click...). Vacío = usar keyEvents total.
    ga4ConversionEvents: [],
    updatedAt: null,
  };
}

function withClientMeta(profile, client) {
  return {
    ...profile,
    gscSite: client.gscSite,
    clientName: client.name,
    industry: client.industry,
    adsCustomerId: client.adsCustomerId,
  };
}

async function listClientProfiles() {
  const all = await collection.list();
  const stored = new Map(all.map((p) => [p.gscSite, p]));
  return CLIENTS.map((client) => {
    const profile = stored.get(client.gscSite);
    return {
      ...withClientMeta({ ...defaultProfile(client), ...(profile || {}) }, client),
      isConfigured: Boolean(profile),
    };
  });
}

async function getClientProfile(gscSite) {
  const client = getClientByGscSite(gscSite);
  if (!client) return null;
  const stored = await collection.get(slugId(gscSite));
  return {
    ...withClientMeta({ ...defaultProfile(client), ...(stored || {}) }, client),
    isConfigured: Boolean(stored),
  };
}

async function upsertClientProfile(gscSite, patch = {}) {
  const client = getClientByGscSite(gscSite);
  if (!client) throw new Error(`Cliente no encontrado para gscSite: ${gscSite}`);
  const id = slugId(gscSite);
  const existing = (await collection.get(id)) || defaultProfile(client);
  const { gscSite: _ignore, clientName: _ignore2, ...safePatch } = patch;
  const updated = {
    ...existing,
    ...safePatch,
    gscSite: client.gscSite,
    clientName: client.name,
    updatedAt: new Date().toISOString(),
  };
  await collection.write(id, updated);
  return updated;
}

module.exports = {
  GLOBAL_CONTENT_RULES,
  listClientProfiles,
  getClientProfile,
  upsertClientProfile,
};
