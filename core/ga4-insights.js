// Motor de insights de Analytics: le pasa a Gemini los hechos ya calculados (overview de GA4 +
// cruce con GSC) y persiste el resultado por cliente en el store KV/archivo, para que las
// recomendaciones queden guardadas con fecha y no haya que regenerarlas en cada visita
// (sección 22 del spec: evitar llamadas repetidas a Gemini).
//
// Separación de fuentes (sección 19): los números vienen del caller (hechos); Gemini sólo
// interpreta y cada insight declara de qué fuente sale su evidencia.

const { generateJsonWithRetry } = require("./gemini-client");
const { readJson, writeJson } = require("./store/json-store");
const { buildGa4InsightsPrompt, validateGa4InsightsResponse } = require("./prompts/ga4-insights");

function slugSite(siteUrl) {
  return siteUrl
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9.-]+/gi, "_");
}

function keyFor(clientSite) {
  return `analytics-insights/${slugSite(clientSite)}`;
}

async function getStoredInsights(clientSite) {
  return readJson(keyFor(clientSite), null);
}

async function generateInsights({ clientSite, clientProfile, overview, crossRows, periodDays = 30 }) {
  const prompt = buildGa4InsightsPrompt({ clientProfile, overview, crossRows, periodDays });

  let parsed;
  try {
    parsed = await generateJsonWithRetry(prompt, `ga4-insights:${clientSite}`);
    validateGa4InsightsResponse(parsed);
  } catch (err) {
    throw new Error(`Gemini no pudo generar los insights de Analytics: ${err.message}`);
  }

  const record = {
    clientSite,
    propertyId: overview.propertyId,
    periodDays,
    range: overview.ranges.current,
    generatedAt: new Date().toISOString(),
    model: "gemini-2.5-flash",
    summary: parsed.summary,
    insights: parsed.insights,
    // Snapshot de los totales que vio el modelo — para poder explicar después con qué data se
    // generó cada recomendación aunque los números vivos hayan cambiado.
    evidenceSnapshot: {
      totals: overview.totals.current,
      deltaPrev: overview.totals.deltaPrev,
      keyEventsByName: overview.keyEventsByName,
      crossRowsCount: crossRows?.length || 0,
    },
  };

  await writeJson(keyFor(clientSite), record);
  return record;
}

module.exports = { getStoredInsights, generateInsights };
