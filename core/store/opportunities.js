// Backlog de oportunidades de contenido por cliente (secciones 5, 6, 8, 9, 17 del spec). Una
// Opportunity es lo que existe ANTES de convertirse en Blog Project: el resultado de escanear
// GSC + clusterizar con Gemini, con evidencia y un score de prioridad interno calculado en
// core/opportunity-engine.js (no lo inventa Gemini — ver esa nota ahí). El usuario elige cuáles
// convertir o ignorar; nada se crea ni se publica solo.

const { createCollection, newId } = require("./json-store");
const { createBlogProject } = require("./blog-projects");

const STATUSES = ["open", "converted", "ignored"];

const collection = createCollection("opportunities");

async function createOpportunity(input = {}) {
  const now = new Date().toISOString();
  const record = {
    id: newId(),
    clientSite: input.clientSite,
    clusterName: input.clusterName,
    suggestedTitle: input.suggestedTitle || null,
    topic: input.topic || null,
    searchIntent: input.searchIntent || null,
    serviceRelevance: input.serviceRelevance || null,
    recommendedContentType: input.recommendedContentType || null,
    reasoningSummary: input.reasoningSummary || "",
    primaryKeyword: input.primaryKeyword || null,
    secondaryKeywords: input.secondaryKeywords || [],
    questionKeywords: input.questionKeywords || [],
    semanticKeywords: input.semanticKeywords || [],
    priorityScore: input.priorityScore ?? null,
    priorityLabel: input.priorityLabel || null,
    scoreBreakdown: input.scoreBreakdown || null,
    contentGap: input.contentGap || null,
    evidence: input.evidence || { gsc: null, gemini: null },
    status: "open",
    convertedToProjectId: null,
    scannedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await collection.write(record.id, record);
  return record;
}

async function listOpportunities({ clientSite, status } = {}) {
  let items = await collection.list();
  if (clientSite) items = items.filter((o) => o.clientSite === clientSite);
  if (status) items = items.filter((o) => o.status === status);
  return items.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
}

async function getOpportunity(id) {
  return collection.get(id);
}

async function updateOpportunity(id, patch = {}) {
  const existing = await collection.get(id);
  if (!existing) throw new Error(`Oportunidad no encontrada: ${id}`);
  const updated = { ...existing, ...patch, id: existing.id, clientSite: existing.clientSite, updatedAt: new Date().toISOString() };
  await collection.write(id, updated);
  return updated;
}

async function markIgnored(id) {
  return updateOpportunity(id, { status: "ignored" });
}

// Evita duplicar oportunidades en cada re-scan: si ya hay una ABIERTA con la misma keyword
// principal para el mismo cliente, se actualiza en vez de crear una nueva.
async function findOpenDuplicate(clientSite, primaryKeyword) {
  const items = await listOpportunities({ clientSite, status: "open" });
  const norm = (s) => (s || "").trim().toLowerCase();
  return items.find((o) => norm(o.primaryKeyword) === norm(primaryKeyword)) || null;
}

// Persiste los clusters que devolvió el motor de oportunidades (core/opportunity-engine.js),
// deduplicando contra lo que ya estaba abierto.
async function syncScanResults(clientSite, clusters) {
  const results = [];
  for (const c of clusters) {
    const dup = await findOpenDuplicate(clientSite, c.primaryKeyword);
    const record = dup ? await updateOpportunity(dup.id, c) : await createOpportunity({ ...c, clientSite });
    results.push(record);
  }
  return results;
}

const CANNIBALIZATION_RECOMMENDATION = {
  none: "No se encontró contenido existente relacionado — crear es la opción más segura.",
  medium: "Hay contenido relacionado parcialmente. Revisar antes de crear uno nuevo: puede convenir actualizar el existente.",
  high: "Ya existe contenido que cubre este tema de cerca. Actualizar el existente en vez de crear uno nuevo, salvo que la intención de búsqueda sea claramente distinta.",
};

// Convierte una Opportunity abierta en un Blog Project precargado con las keywords y la
// evidencia ya armadas — el punto central de "traer la data de entrada" en vez de arrancar de
// un formulario vacío. La oportunidad queda marcada como convertida (no se borra, para
// mantener el historial de de dónde salió el proyecto).
async function convertToBlogProject(id) {
  const opportunity = await collection.get(id);
  if (!opportunity) throw new Error(`Oportunidad no encontrada: ${id}`);
  if (opportunity.status !== "open") {
    throw new Error(`La oportunidad ya está "${opportunity.status}", no se puede convertir de nuevo.`);
  }

  const gapLevel = opportunity.contentGap?.level || "none";
  const project = await createBlogProject({
    clientSite: opportunity.clientSite,
    workingTitle: opportunity.suggestedTitle || opportunity.clusterName,
    topic: opportunity.topic,
    searchIntent: opportunity.searchIntent,
    contentType: opportunity.recommendedContentType,
    primaryKeyword: opportunity.primaryKeyword,
    secondaryKeywords: opportunity.secondaryKeywords,
    questionKeywords: opportunity.questionKeywords,
    semanticKeywords: opportunity.semanticKeywords,
    sourceOpportunityId: opportunity.id,
    opportunityReason: opportunity.reasoningSummary,
    evidence: { gsc: opportunity.evidence?.gsc || null, ads: null, gemini: opportunity.evidence?.gemini || null, manual: null },
    relatedExistingUrls: opportunity.contentGap?.competingUrls || [],
    cannibalization:
      gapLevel === "none"
        ? null
        : {
            level: gapLevel,
            competingUrls: opportunity.contentGap?.competingUrls || [],
            recommendation: CANNIBALIZATION_RECOMMENDATION[gapLevel] || CANNIBALIZATION_RECOMMENDATION.none,
            reasoning: `Detectado por overlap de keywords contra el inventario de contenido del sitio.`,
          },
  });

  await updateOpportunity(id, { status: "converted", convertedToProjectId: project.id });
  return project;
}

module.exports = {
  STATUSES,
  createOpportunity,
  listOpportunities,
  getOpportunity,
  updateOpportunity,
  markIgnored,
  findOpenDuplicate,
  syncScanResults,
  convertToBlogProject,
};
