// Investigación de keywords para un Blog Project puntual (secciones 5, 6 y 8 del spec).
// Trae queries reales de GSC, las filtra por relevancia al tema del proyecto, y le pide a
// Gemini que las agrupe y sugiera primary/secondary/question/semantic keywords.
//
// No persiste nada acá — devuelve evidence.gsc + evidence.gemini para que el caller (la API
// route) decida qué guardar en el Blog Project. Distingue siempre hecho de Google (evidenceGsc)
// de interpretación de Gemini (evidenceGemini), como pide la sección 19 (data provenance).

const { fetchSitePerformance } = require("./gsc-fetch");
const { getClientByGscSite } = require("./clients");
const { generateJsonWithRetry } = require("./gemini-client");
const { buildKeywordClusteringPrompt, validateClusteringResponse } = require("./prompts/keyword-clustering");

const MAX_QUERIES_TO_GEMINI = 50;
const MIN_TOPIC_MATCHES = 5;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "your", "are", "what", "how", "why",
  "near", "best", "top", "de", "la", "el", "los", "las", "para", "por", "como", "que", "es",
]);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

// Filtra las queries de GSC por relevancia al tema del proyecto. Si no hay suficiente overlap
// (proyecto muy nuevo, sin tema cargado todavía), cae a las mejores oportunidades generales del
// sitio para que igual haya material útil — pero deja constancia de qué modo se usó, para que
// la UI pueda mostrarlo (no es lo mismo "esto es específico al tema" que "esto es lo mejor que
// hay en general").
function pickRelevantQueries(queries, project) {
  const topicTokens = new Set([
    ...tokenize(project.topic),
    ...tokenize(project.workingTitle),
    ...tokenize(project.targetService),
    ...tokenize(project.primaryKeyword),
  ]);

  if (topicTokens.size > 0) {
    const matched = queries
      .filter((q) => tokenize(q.query).some((t) => topicTokens.has(t)))
      .sort((a, b) => b.impressions - a.impressions);

    if (matched.length >= MIN_TOPIC_MATCHES) {
      return { queries: matched.slice(0, MAX_QUERIES_TO_GEMINI), filterMode: "topic_match" };
    }
  }

  const broad = queries
    .filter((q) => q.impressions >= 10)
    .sort((a, b) => b.impressions - a.impressions);

  return { queries: broad.slice(0, MAX_QUERIES_TO_GEMINI), filterMode: "broad_fallback" };
}

async function researchKeywordsForProject(project, { periodDays = 90 } = {}) {
  const client = getClientByGscSite(project.clientSite);

  const gscData = await fetchSitePerformance(project.clientSite, { periodDays });
  const rawQueries = gscData.queries.map((q) => ({
    query: q.query,
    impressions: q.impressions,
    clicks: q.clicks,
    ctr: Math.round(q.ctr * 10000) / 10000,
    position: Math.round(q.position * 10) / 10,
  }));

  const { queries: candidateQueries, filterMode } = pickRelevantQueries(rawQueries, project);

  const evidenceGsc = {
    fetchedAt: new Date().toISOString(),
    periodDays,
    range: gscData.ranges.current,
    totalQueriesAvailable: rawQueries.length,
    filterMode,
    queriesSentToGemini: candidateQueries,
  };

  if (candidateQueries.length === 0) {
    return {
      evidenceGsc,
      evidenceGemini: null,
      insufficientData: true,
      message: "No se encontraron queries en Search Console para este sitio en el período elegido.",
    };
  }

  const prompt = buildKeywordClusteringPrompt({ client, project, queries: candidateQueries, filterMode });

  let parsed;
  try {
    parsed = await generateJsonWithRetry(prompt, `keyword-clustering:${project.id}`);
    validateClusteringResponse(parsed);
  } catch (err) {
    throw new Error(`Gemini no pudo generar el clustering de keywords: ${err.message}`);
  }

  const evidenceGemini = {
    model: "gemini-2.5-flash",
    generatedAt: new Date().toISOString(),
    clusters: parsed.clusters,
    suggestedPrimaryKeyword: parsed.suggested_primary_keyword,
    suggestedSecondaryKeywords: parsed.suggested_secondary_keywords,
    suggestedQuestionKeywords: parsed.suggested_question_keywords,
    suggestedSemanticKeywords: parsed.suggested_semantic_keywords,
    suggestedContentType: parsed.suggested_content_type || null,
    reasoningSummary: parsed.reasoning_summary || "",
  };

  return { evidenceGsc, evidenceGemini, insufficientData: false };
}

module.exports = { researchKeywordsForProject };
