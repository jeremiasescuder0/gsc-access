// Prompt de clustering de oportunidades a nivel sitio (secciones 5 y 6 del spec). A diferencia
// de keyword-clustering.js (que arma keywords para un Blog Project que YA existe), este prompt
// escanea las queries con señal de oportunidad de todo un sitio y arma el backlog completo de
// una sola pasada — para no gastar una llamada a Gemini por cluster (sección 22).

const CONTENT_TYPES = ["new_blog", "update_existing_blog", "optimize_service_page", "faq", "ignore"];
const RELEVANCE_LEVELS = ["high", "medium", "low"];

function buildOpportunityClusteringPrompt({ client, queries, existingContentSummary }) {
  return `Actuás como un estratega de contenido SEO. Tenés las queries de Google Search Console
con señal de oportunidad de un sitio (últimos meses) y necesitás armar un backlog de
oportunidades de contenido agrupando las que tratan del mismo tema.

IDIOMA — regla estricta, sin excepciones salvo que el cliente indique lo contrario:
- suggested_title: SIEMPRE en inglés. Es el título que va a llevar el blog publicado.
- cluster_name, topic, search_intent, reasoning_summary: en español (son para uso interno del
  equipo, no se publican).
- queries, suggested_primary_keyword, suggested_secondary_keywords, suggested_question_keywords,
  suggested_semantic_keywords: EXACTAMENTE como aparecen en la data de GSC, sin traducir.

CLIENTE: ${client?.name || "desconocido"}
RUBRO: ${client?.industry || "no especificado"}

CONTENIDO EXISTENTE EN EL SITIO (para no sugerir temas ya cubiertos, o para marcar si conviene
actualizar en vez de crear nuevo):
${existingContentSummary || "Sin inventario de contenido cargado todavía."}

QUERIES DE GOOGLE SEARCH CONSOLE CON SEÑAL DE OPORTUNIDAD (${queries.length}), con
impresiones/clicks/posición/tendencia:
${JSON.stringify(queries, null, 2)}

Instrucciones:
- NO inventes volumen de búsqueda ni ninguna métrica que no esté en la data de arriba.
- Agrupá SOLO queries que juntas representan una oportunidad real. Cada cluster necesita 3 o más
  queries relacionadas — si es una query suelta sin acompañamiento, no le armes cluster propio.
- Ignorá ruido, queries de marca del propio cliente, y temas sin relación con el rubro.
- service_relevance: "high" si conecta directo con un servicio del rubro, "medium" si es
  relevante pero no core, "low" si es tangencial.
- recommended_content_type "ignore" para clusters que técnicamente agrupan pero no ameritan
  contenido nuevo (ya están bien cubiertos, son de marca, o intención no comercial/informacional
  útil para el negocio).
- No generes más de 12 clusters — priorizá los de mayor impacto real.

Respondé ÚNICAMENTE con este JSON (sin markdown, sin texto antes o después):
{
  "clusters": [
    {
      "cluster_name": "string",
      "suggested_title": "string — SIEMPRE en inglés, es el título del blog publicado",
      "search_intent": "string",
      "queries": ["string"],
      "topic": "string",
      "service_relevance": "high|medium|low",
      "recommended_content_type": "new_blog|update_existing_blog|optimize_service_page|faq|ignore",
      "reasoning_summary": "string breve — por qué es (o no es) una oportunidad",
      "suggested_primary_keyword": "string",
      "suggested_secondary_keywords": ["string"],
      "suggested_question_keywords": ["string"],
      "suggested_semantic_keywords": ["string"]
    }
  ]
}`;
}

function validateOpportunityClusteringResponse(json) {
  if (!json || typeof json !== "object") {
    throw new Error("Respuesta de Gemini vacía o inválida");
  }
  if (!Array.isArray(json.clusters)) {
    throw new Error("Falta 'clusters' (array) en la respuesta de Gemini");
  }
  for (const c of json.clusters) {
    if (!c || typeof c.cluster_name !== "string" || !Array.isArray(c.queries) || c.queries.length === 0) {
      throw new Error("Cluster con forma inválida en la respuesta de Gemini");
    }
    if (!RELEVANCE_LEVELS.includes(c.service_relevance)) {
      throw new Error(`service_relevance inválido: "${c.service_relevance}"`);
    }
    if (!CONTENT_TYPES.includes(c.recommended_content_type)) {
      throw new Error(`recommended_content_type inválido: "${c.recommended_content_type}"`);
    }
    if (typeof c.suggested_primary_keyword !== "string") {
      throw new Error("Falta suggested_primary_keyword en un cluster");
    }
  }
  return json;
}

module.exports = {
  buildOpportunityClusteringPrompt,
  validateOpportunityClusteringResponse,
  CONTENT_TYPES,
  RELEVANCE_LEVELS,
};
