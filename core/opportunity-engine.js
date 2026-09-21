// Motor de oportunidades de contenido (secciones 5, 6, 8, 9 del spec). Escanea las queries de
// GSC de un sitio completo, cruza con el inventario de contenido para detectar content gaps, y
// le pide a Gemini que arme el backlog de clusters en una sola pasada.
//
// Separación de responsabilidades (sección 19 — data provenance):
// - GSC: hechos (impresiones, clicks, posición, tendencia)
// - Content Inventory: hechos (qué URLs existen y qué cubren)
// - Gemini: interpretación (agrupar, nombrar, clasificar intención/tipo de contenido/relevancia)
// - Este motor: el content gap y el score de prioridad se calculan acá con una fórmula fija y
//   visible, NO los decide Gemini — así son explicables y no dependen de que el modelo "adivine
//   bien". El score es una PRIORIZACIÓN INTERNA, no una métrica de Google (sección 8).

const { fetchSitePerformance } = require("./gsc-fetch");
const { getClientByGscSite } = require("./clients");
const { generateJsonWithRetry } = require("./gemini-client");
const { getInventory } = require("./store/content-inventory");
const {
  buildOpportunityClusteringPrompt,
  validateOpportunityClusteringResponse,
} = require("./prompts/opportunity-clustering");

const MAX_QUERIES_TO_GEMINI = 120;
const MIN_IMPRESSIONS = 15;

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

// Señales de oportunidad de la sección 5 del spec, aplicadas query por query antes de mandar el
// lote a Gemini — reduce ruido y costo (sección 22: no gastar tokens en queries sin señal real).
function isCandidateQuery(q) {
  const impressions = q.impressions || 0;
  const position = q.position || 0;
  const ctr = q.ctr || 0;
  if (impressions < MIN_IMPRESSIONS) return false;
  if (position >= 8 && position <= 30) return true; // B: casi page 1, ganable
  if (impressions >= 50 && ctr < 0.02) return true; // A: exposición sin clicks
  if (q.delta && q.delta.impressions > 0 && impressions >= 30) return true; // D: creciendo
  return false;
}

function buildExistingContentSummary(inventory) {
  if (!inventory || inventory.items.length === 0) return null;
  return inventory.items
    .slice(0, 60)
    .map(
      (i) =>
        `- ${i.url} · tipo: ${i.pageType} · tema: ${i.mainTopic || i.title || "sin definir"} · keyword: ${i.primaryKeyword || "—"}`
    )
    .join("\n");
}

// Content gap determinístico: compara los tokens del cluster contra título/tema/keyword de cada
// URL del inventario. La evidencia (qué URLs matchearon) queda visible — no es una caja negra.
function assessContentGap(cluster, inventoryItems) {
  const clusterTokens = new Set([
    ...tokenize(cluster.topic),
    ...tokenize(cluster.suggested_primary_keyword),
    ...cluster.queries.flatMap(tokenize),
  ]);

  const scored = inventoryItems
    .map((item) => {
      const itemTokens = new Set([...tokenize(item.title), ...tokenize(item.mainTopic), ...tokenize(item.primaryKeyword)]);
      let overlap = 0;
      for (const t of itemTokens) if (clusterTokens.has(t)) overlap++;
      return { item, overlap };
    })
    .filter((s) => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);

  if (scored.length === 0) return { level: "none", score: 100, competingUrls: [] };
  const strongMatch = scored[0].overlap >= 3;
  return {
    level: strongMatch ? "high" : "medium",
    score: strongMatch ? 15 : 50,
    competingUrls: scored.slice(0, 3).map((s) => s.item.url),
  };
}

const RELEVANCE_SCORE = { high: 100, medium: 60, low: 20 };

// Pico en la zona 8-20 (casi page 1, ganable sin mucha autoridad extra). Cae para posiciones muy
// buenas (ya ganado, no es "oportunidad") o muy malas (difícil de pelear desde ahí).
function positionOpportunityScore(avgPosition) {
  if (avgPosition <= 3) return 20;
  if (avgPosition <= 7) return 50;
  if (avgPosition <= 20) return 100;
  if (avgPosition <= 30) return 70;
  return 35;
}

// Score de priorización interno — sección 8 del spec. Componentes y pesos visibles a propósito
// (se muestran en la UI) para que quede claro que NO es una métrica que devuelva Google.
// Nota: sin enriquecimiento de Ads (decisión explícita — ver conversación), "search demand" no
// es un componente propio todavía; el peso se redistribuyó entre las señales que sí son reales.
function computeScore({ totalImpressions, avgPosition, contentGapScore, relevanceScore }) {
  const impressionsScore = Math.min(100, Math.log10(totalImpressions + 1) * 28);
  const gscSignal = impressionsScore * 0.5 + positionOpportunityScore(avgPosition) * 0.5;
  const weights = { gscSignal: 0.45, contentGap: 0.3, businessRelevance: 0.25 };
  const score = gscSignal * weights.gscSignal + contentGapScore * weights.contentGap + relevanceScore * weights.businessRelevance;
  return {
    total: Math.round(score),
    breakdown: {
      gscSignal: Math.round(gscSignal),
      contentGap: Math.round(contentGapScore),
      businessRelevance: Math.round(relevanceScore),
      weights,
    },
  };
}

function scoreLabel(score) {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

async function scanOpportunities(clientSite, { periodDays = 90 } = {}) {
  const client = getClientByGscSite(clientSite);
  const [gscData, inventory] = await Promise.all([
    fetchSitePerformance(clientSite, { periodDays }),
    getInventory(clientSite),
  ]);

  const candidateQueries = gscData.queries
    .filter(isCandidateQuery)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, MAX_QUERIES_TO_GEMINI)
    .map((q) => ({
      query: q.query,
      impressions: q.impressions,
      clicks: q.clicks,
      ctr: Math.round(q.ctr * 10000) / 10000,
      position: Math.round(q.position * 10) / 10,
      delta: q.delta ? { impressions: q.delta.impressions, position: Math.round(q.delta.position * 10) / 10 } : null,
    }));

  const evidenceGsc = {
    fetchedAt: new Date().toISOString(),
    periodDays,
    range: gscData.ranges.current,
    totalQueriesAvailable: gscData.queries.length,
    candidateQueriesFound: candidateQueries.length,
  };

  if (candidateQueries.length === 0) {
    return {
      evidenceGsc,
      clusters: [],
      insufficientData: true,
      message: "No se encontraron queries con señal de oportunidad (impresiones/posición/tendencia) en este período.",
    };
  }

  const prompt = buildOpportunityClusteringPrompt({
    client,
    queries: candidateQueries,
    existingContentSummary: buildExistingContentSummary(inventory),
  });

  let parsed;
  try {
    parsed = await generateJsonWithRetry(prompt, `opportunity-scan:${clientSite}`);
    validateOpportunityClusteringResponse(parsed);
  } catch (err) {
    throw new Error(`Gemini no pudo generar el backlog de oportunidades: ${err.message}`);
  }

  const clusters = parsed.clusters
    .filter((c) => c.recommended_content_type !== "ignore")
    .map((cluster) => {
      const gap = assessContentGap(cluster, inventory.items);
      const clusterQueries = candidateQueries.filter((q) => cluster.queries.includes(q.query));
      const totalImpressions = clusterQueries.reduce((s, q) => s + q.impressions, 0) || cluster.queries.length * 20;
      const weightedPosition =
        clusterQueries.reduce((s, q) => s + q.position * q.impressions, 0) / (totalImpressions || 1) || 20;
      const relevanceScore = RELEVANCE_SCORE[cluster.service_relevance] ?? 50;
      const { total, breakdown } = computeScore({
        totalImpressions,
        avgPosition: weightedPosition,
        contentGapScore: gap.score,
        relevanceScore,
      });

      return {
        clusterName: cluster.cluster_name,
        suggestedTitle: cluster.suggested_title,
        topic: cluster.topic,
        searchIntent: cluster.search_intent,
        serviceRelevance: cluster.service_relevance,
        recommendedContentType: cluster.recommended_content_type,
        reasoningSummary: cluster.reasoning_summary,
        primaryKeyword: cluster.suggested_primary_keyword,
        secondaryKeywords: cluster.suggested_secondary_keywords || [],
        questionKeywords: cluster.suggested_question_keywords || [],
        semanticKeywords: cluster.suggested_semantic_keywords || [],
        priorityScore: total,
        priorityLabel: scoreLabel(total),
        scoreBreakdown: breakdown,
        contentGap: gap,
        evidence: {
          gsc: { queries: clusterQueries, totalImpressions, avgPosition: Math.round(weightedPosition * 10) / 10 },
          gemini: { model: "gemini-2.5-flash", generatedAt: new Date().toISOString() },
        },
      };
    });

  return { evidenceGsc, clusters, insufficientData: false };
}

module.exports = { scanOpportunities };
