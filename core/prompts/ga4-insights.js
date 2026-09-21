// Prompt de insights de Analytics (fase 4 de la integración GA4). Gemini recibe los HECHOS ya
// calculados (totales con deltas, canales, landing pages, y el cruce con Search Console si
// existe) y devuelve recomendaciones estructuradas con la evidencia numérica que las respalda.
// Nunca inventa métricas: cada insight tiene que citar números que estén en la data.

const INSIGHT_TYPES = ["drop", "growth", "conversion_gap", "engagement", "channel", "device", "seo_opportunity", "tracking"];
const SEVERITIES = ["high", "medium", "low"];
const SOURCES = ["ga4", "gsc", "cross"];

function buildGa4InsightsPrompt({ clientProfile, overview, crossRows, periodDays }) {
  const conversionNote = clientProfile?.ga4ConversionEvents?.length
    ? `Los key events que cuentan como conversión para este cliente son: ${clientProfile.ga4ConversionEvents.join(", ")}.`
    : "El cliente no definió qué key events son conversión; usá el total de keyEvents y, si es 0 o no hay key events por nombre, señalalo como problema de medición (type: tracking) antes que como problema de performance.";

  return `Actuás como un analista senior de marketing digital. Analizá los datos de Google Analytics 4${
    crossRows?.length ? " y su cruce con Google Search Console" : ""
  } del cliente y devolvé insights accionables. Respondé EN ESPAÑOL.

CLIENTE: ${clientProfile?.brandName || clientProfile?.clientName || "desconocido"}
RUBRO: ${clientProfile?.industry || "no especificado"}
SERVICIOS: ${clientProfile?.primaryServices?.length ? clientProfile.primaryServices.join(", ") : "—"}
PERÍODO: últimos ${periodDays} días (${overview.ranges.current.startDate} → ${overview.ranges.current.endDate}), comparado con el período previo y con el mismo período del año anterior.
${conversionNote}

TOTALES (engagementRate es decimal 0-1; avgEngagementTime en segundos por sesión; deltaPrev/deltaYoY son diferencias absolutas):
${JSON.stringify(overview.totals, null, 2)}

CANALES:
${JSON.stringify(overview.channels, null, 2)}

DISPOSITIVOS:
${JSON.stringify(overview.devices, null, 2)}

KEY EVENTS POR NOMBRE:
${JSON.stringify(overview.keyEventsByName, null, 2)}

LANDING PAGES TOP (GA4):
${JSON.stringify(overview.landingPages.slice(0, 25), null, 2)}
${
  crossRows?.length
    ? `
CRUCE POR LANDING PAGE CON SEARCH CONSOLE (gsc = visibilidad en Google: impresiones/clicks/posición, ctr es DECIMAL 0-1, o sea 0.0011 = 0.11%; ga4 = comportamiento al entrar; flags = señales calculadas de forma determinística por la app):
${JSON.stringify(crossRows.slice(0, 40), null, 2)}`
    : ""
}

Instrucciones:
- NO inventes métricas ni porcentajes que no se puedan calcular con la data de arriba. Cada insight cita los números concretos en "evidence". Las tasas (engagementRate, ctr) vienen como decimal 0-1: expresalas como porcentaje correctamente (0.336 = 33.6%).
- Canales de GA4: "Cross-network" es Performance Max / Demand Gen de Google Ads (tráfico pago). "Paid Search" es sólo campañas de búsqueda tradicionales. No trates la ausencia de "Paid Search" como falta de inversión en pago si "Cross-network" tiene volumen.
- Ignorá variaciones chicas con volumen bajo (menos de ~20 sesiones no alcanza para concluir nada).
- Priorizá por impacto en conversiones (key events) y sesiones con engagement, no por sesiones brutas.
- Si keyEvents total es 0 o no hay key events por nombre, el primer insight tiene que ser de type "tracking": sin conversiones medidas no se puede optimizar hacia conversión.
- Máximo 8 insights, ordenados por severidad. Cada recomendación tiene que ser una acción concreta que el equipo pueda ejecutar esta semana.
- "source": "ga4" si la evidencia sale sólo de Analytics, "gsc" si sólo de Search Console, "cross" si combina las dos.

Respondé ÚNICAMENTE con este JSON (sin markdown, sin texto antes ni después):
{
  "summary": "2-3 oraciones con el estado general del período y lo más importante",
  "insights": [
    {
      "type": "${INSIGHT_TYPES.join("|")}",
      "severity": "${SEVERITIES.join("|")}",
      "title": "string corto",
      "evidence": "los números concretos que sustentan el insight, con fuente",
      "recommendation": "acción concreta y ejecutable",
      "source": "${SOURCES.join("|")}",
      "pages": ["paths involucrados, si aplica"]
    }
  ]
}`;
}

function validateGa4InsightsResponse(json) {
  if (!json || typeof json !== "object") throw new Error("Respuesta de Gemini vacía o inválida");
  if (typeof json.summary !== "string") throw new Error("Falta 'summary' en la respuesta de Gemini");
  if (!Array.isArray(json.insights)) throw new Error("Falta 'insights' (array) en la respuesta de Gemini");
  for (const i of json.insights) {
    if (!i || typeof i.title !== "string" || typeof i.evidence !== "string" || typeof i.recommendation !== "string") {
      throw new Error("Insight con forma inválida en la respuesta de Gemini");
    }
    if (!INSIGHT_TYPES.includes(i.type)) throw new Error(`type inválido en insight: "${i.type}"`);
    if (!SEVERITIES.includes(i.severity)) throw new Error(`severity inválida en insight: "${i.severity}"`);
    if (!SOURCES.includes(i.source)) throw new Error(`source inválido en insight: "${i.source}"`);
    if (!Array.isArray(i.pages)) i.pages = [];
  }
  return json;
}

module.exports = { buildGa4InsightsPrompt, validateGa4InsightsResponse, INSIGHT_TYPES, SEVERITIES };
