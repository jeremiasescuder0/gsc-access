// Prompt de clustering de keywords (sección 6 del spec). Agrupa queries reales de Search
// Console y le pide a Gemini que sugiera qué keyword debería ser primary/secondary/question/
// semantic para un Blog Project puntual. La salida es JSON estructurado y se valida antes de
// usarse — ver core/gemini-client.js#generateJsonWithRetry.
//
// Principio del spec: Google provee la data, Gemini interpreta. Este prompt nunca le pide al
// modelo que invente volumen de búsqueda — sólo trabaja sobre impresiones/clicks/posición que
// ya vienen de GSC.

const CONTENT_TYPES = ["new_blog", "update_existing_blog", "optimize_service_page", "faq", "ignore"];

function buildKeywordClusteringPrompt({ client, project, queries, filterMode }) {
  return `Actuás como un estratega de contenido SEO. Tenés queries reales de Google Search Console
para el sitio de un cliente y necesitás agruparlas y sugerir keywords para un artículo de blog
puntual. Respondé EN ESPAÑOL en los campos de razonamiento, pero mantené las keywords/queries
EXACTAMENTE como aparecen en la data (no las traduzcas ni las reformules).

CLIENTE: ${client?.name || project.clientSite}
RUBRO: ${client?.industry || "no especificado"}
TEMA DEL BLOG PROJECT: ${project.topic || project.workingTitle || "(sin definir todavía)"}
SERVICIO TARGET: ${project.targetService || "no especificado"}
${
  filterMode === "topic_match"
    ? "Las queries de abajo ya se filtraron por relevancia al tema de este blog."
    : "No había suficientes queries relacionadas al tema todavía, así que se incluyen las mejores oportunidades generales del sitio (impresiones altas) para que elijas con criterio cuáles sirven."
}

QUERIES DE GOOGLE SEARCH CONSOLE (${queries.length}):
${JSON.stringify(queries, null, 2)}

Instrucciones:
- NO inventes volumen de búsqueda ni ninguna métrica que no esté en la data de arriba.
- Agrupá las queries en clusters temáticos. Cada query real tiene que quedar en como máximo un cluster.
- Para cada cluster asigná un recommended_content_type de esta lista exacta: ${CONTENT_TYPES.join(", ")}.
- Elegí UNA keyword principal (mejor combinación de impresiones + relevancia de negocio para este blog puntual) y varias secundarias, de pregunta, y semánticas — TODAS tomadas literalmente de las queries reales de arriba, no inventadas.
- Si la data no alcanza para una recomendación seria, decilo en reasoning_summary y dejá los arrays de keywords sugeridas vacíos en vez de forzar una respuesta.

Respondé ÚNICAMENTE con este JSON (sin markdown, sin texto antes o después):
{
  "clusters": [
    {
      "cluster_name": "string",
      "search_intent": "string",
      "queries": ["string"],
      "topic": "string",
      "service_relevance": "string",
      "recommended_content_type": "new_blog|update_existing_blog|optimize_service_page|faq|ignore",
      "reasoning_summary": "string breve"
    }
  ],
  "suggested_primary_keyword": "string",
  "suggested_secondary_keywords": ["string"],
  "suggested_question_keywords": ["string"],
  "suggested_semantic_keywords": ["string"],
  "suggested_content_type": "new_blog|update_existing_blog|optimize_service_page|faq|ignore",
  "reasoning_summary": "string breve explicando la elección de la keyword principal"
}`;
}

function validateClusteringResponse(json) {
  if (!json || typeof json !== "object") {
    throw new Error("Respuesta de Gemini vacía o inválida");
  }
  if (!Array.isArray(json.clusters)) {
    throw new Error("Falta 'clusters' (array) en la respuesta de Gemini");
  }
  for (const c of json.clusters) {
    if (!c || typeof c.cluster_name !== "string" || !Array.isArray(c.queries)) {
      throw new Error("Cluster con forma inválida en la respuesta de Gemini");
    }
    if (c.recommended_content_type && !CONTENT_TYPES.includes(c.recommended_content_type)) {
      throw new Error(`recommended_content_type inválido: "${c.recommended_content_type}"`);
    }
  }
  if (typeof json.suggested_primary_keyword !== "string") {
    throw new Error("Falta 'suggested_primary_keyword' (string) en la respuesta de Gemini");
  }
  for (const field of ["suggested_secondary_keywords", "suggested_question_keywords", "suggested_semantic_keywords"]) {
    if (!Array.isArray(json[field])) {
      throw new Error(`Falta '${field}' (array) en la respuesta de Gemini`);
    }
  }
  if (json.suggested_content_type && !CONTENT_TYPES.includes(json.suggested_content_type)) {
    throw new Error(`suggested_content_type inválido: "${json.suggested_content_type}"`);
  }
  return json;
}

module.exports = { buildKeywordClusteringPrompt, validateClusteringResponse, CONTENT_TYPES };
