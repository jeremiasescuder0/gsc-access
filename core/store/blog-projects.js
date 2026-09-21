// Modelo BlogProject — la entidad central del workflow de investigación/creación/auditoría
// de contenido SEO. Ver PRODUCT GOAL / sección 1-2 del spec de producto.
//
// Cada BlogProject es un archivo JSON en data/blog-projects/<id>.json. El objeto guarda TODO
// el recorrido: de dónde salió la oportunidad, qué keywords se eligieron y por qué, el brief,
// el draft, las auditorías, las revisiones, y la performance post-publicación — para que
// cualquier recomendación se pueda explicar mirando el registro.

const { createCollection, newId } = require("./json-store");
const { getClientByGscSite } = require("../clients");

const STATUSES = [
  "opportunity",
  "research",
  "brief_ready",
  "brief_approved",
  "draft_ready",
  "audit_required",
  "revision_required",
  "human_review",
  "approved",
  "published",
  "refresh_opportunity",
  "archived",
];

// Transiciones permitidas desde cada estado. El flujo es mayormente lineal (sección 2 del
// spec) con retrocesos válidos: a research si el brief no sirve, a human_review si la
// revisión automática no alcanza, y de published a refresh_opportunity cuando la performance
// post-publicación sugiere que el contenido necesita una actualización.
// El brief formal es opcional: el Writer puede generar el draft directo desde las keywords del
// proyecto (opportunity/research → draft_ready), que es el flujo que usa el equipo hoy.
const ALLOWED_TRANSITIONS = {
  opportunity: ["research", "draft_ready", "archived"],
  research: ["brief_ready", "draft_ready", "opportunity", "archived"],
  brief_ready: ["brief_approved", "draft_ready", "research", "archived"],
  brief_approved: ["draft_ready", "brief_ready", "archived"],
  draft_ready: ["audit_required", "archived"],
  audit_required: ["revision_required", "human_review", "archived"],
  revision_required: ["audit_required", "human_review", "archived"],
  human_review: ["approved", "revision_required", "archived"],
  approved: ["published", "human_review", "archived"],
  published: ["refresh_opportunity", "archived"],
  refresh_opportunity: ["research", "published", "archived"],
  archived: ["opportunity"], // permite reabrir manualmente algo archivado por error
};

const MAX_AUTO_REVISIONS = 2;

const collection = createCollection("blog-projects");

function assertValidStatus(status) {
  if (!STATUSES.includes(status)) {
    throw new Error(`Status inválido: "${status}". Válidos: ${STATUSES.join(", ")}`);
  }
}

function emptyEvidence() {
  // Distingue explícitamente de dónde vino cada dato (sección 19 — data provenance):
  // GSC y Ads son hechos de Google, gemini es interpretación, manual es lo que cargó una persona.
  // gsc/gemini acá son la evidencia de ORIGEN (de una Opportunity, si el proyecto vino de ahí).
  // keywordResearch es un campo aparte a propósito: lo llena la acción "Investigar keywords"
  // corrida DESPUÉS, dentro del proyecto — tiene una forma distinta y no debe pisar ni mezclarse
  // con la evidencia de origen (bug real que causó un crash en la UI: el panel de investigación
  // asumía que evidence.gsc siempre tenía SU forma, y rompía si el proyecto venía de una
  // Opportunity con evidence.gsc en la forma del motor de oportunidades).
  return { gsc: null, ads: null, gemini: null, manual: null, keywordResearch: null };
}

async function createBlogProject(input = {}) {
  if (!input.clientSite) {
    throw new Error("clientSite es requerido para crear un Blog Project");
  }
  const client = getClientByGscSite(input.clientSite);
  const now = new Date().toISOString();
  const id = newId();

  const record = {
    id,
    clientSite: input.clientSite,
    clientName: client?.name || input.clientName || null,
    createdAt: now,
    updatedAt: now,
    status: "opportunity",
    statusHistory: [{ status: "opportunity", at: now, note: input.statusNote || "Creado" }],

    title: input.title || null,
    workingTitle: input.workingTitle || input.title || null,
    topic: input.topic || null,
    targetService: input.targetService || null,
    targetLocation: input.targetLocation || null,
    targetAudience: input.targetAudience || null,
    searchIntent: input.searchIntent || null,

    primaryKeyword: input.primaryKeyword || null,
    secondaryKeywords: input.secondaryKeywords || [],
    questionKeywords: input.questionKeywords || [],
    semanticKeywords: input.semanticKeywords || [],

    // Origen: si viene de una oportunidad detectada por el motor de GSC/Ads (Fase 2) o se
    // cargó a mano.
    sourceOpportunityId: input.sourceOpportunityId || null,
    opportunityReason: input.opportunityReason || null,
    // new_blog | update_existing_blog | optimize_service_page | faq | ignore
    contentType: input.contentType || null,

    evidence: input.evidence || emptyEvidence(),
    relatedExistingUrls: input.relatedExistingUrls || [],
    cannibalization: input.cannibalization || null,
    recommendedInternalLinks: input.recommendedInternalLinks || [],

    brief: null,
    briefHistory: [],

    draft: null,
    draftHistory: [],

    audits: [],
    revisionCount: 0,

    finalContent: null,
    humanReview: null,

    publication: { url: null, publishedAt: null },
    performance: [],
    refreshOpportunity: null,
  };

  await collection.write(id, record);
  return record;
}

async function listBlogProjects({ clientSite, status } = {}) {
  let items = await collection.list();
  if (clientSite) items = items.filter((p) => p.clientSite === clientSite);
  if (status) items = items.filter((p) => p.status === status);
  return items.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

async function getBlogProject(id) {
  return collection.get(id);
}

// Patch genérico para los campos editables del proyecto. No permite pisar id/createdAt, y
// status se cambia exclusivamente vía transitionStatus() para que quede auditado.
async function updateBlogProject(id, patch = {}) {
  const existing = await collection.get(id);
  if (!existing) throw new Error(`Blog Project no encontrado: ${id}`);
  const { id: _id, createdAt: _createdAt, status: _status, statusHistory: _statusHistory, ...safePatch } = patch;
  const updated = {
    ...existing,
    ...safePatch,
    id: existing.id,
    createdAt: existing.createdAt,
    status: existing.status,
    statusHistory: existing.statusHistory,
    updatedAt: new Date().toISOString(),
  };
  await collection.write(id, updated);
  return updated;
}

async function transitionStatus(id, newStatus, note = "") {
  assertValidStatus(newStatus);
  const existing = await collection.get(id);
  if (!existing) throw new Error(`Blog Project no encontrado: ${id}`);
  const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Transición inválida: "${existing.status}" → "${newStatus}". Permitidas desde "${existing.status}": ${
        allowed.join(", ") || "ninguna"
      }`
    );
  }
  const now = new Date().toISOString();
  const updated = {
    ...existing,
    status: newStatus,
    statusHistory: [...existing.statusHistory, { status: newStatus, at: now, note }],
    updatedAt: now,
  };
  await collection.write(id, updated);
  return updated;
}

module.exports = {
  STATUSES,
  ALLOWED_TRANSITIONS,
  MAX_AUTO_REVISIONS,
  createBlogProject,
  listBlogProjects,
  getBlogProject,
  updateBlogProject,
  transitionStatus,
};
