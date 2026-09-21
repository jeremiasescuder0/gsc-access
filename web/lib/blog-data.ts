// Puente server-side hacia core/store/*.js y core/keyword-research.js. Import ESTÁTICO a
// propósito — ver la nota en gsc-data.ts sobre por qué el dynamic import con pathToFileURL no
// se traza en el build de Vercel.
import * as blogProjectsModule from "../../core/store/blog-projects.js";
import * as clientProfilesModule from "../../core/store/client-profiles.js";
import * as contentInventoryModule from "../../core/store/content-inventory.js";
import * as keywordResearchModule from "../../core/keyword-research.js";
import * as jsonStoreModule from "../../core/store/json-store.js";
import * as opportunitiesModule from "../../core/store/opportunities.js";
import * as opportunityEngineModule from "../../core/opportunity-engine.js";
import type {
  BlogProject,
  BlogProjectInput,
  BlogProjectStatus,
  ClientContentProfile,
  GlobalContentRules,
  ContentInventory,
  KeywordResearchGscEvidence,
  KeywordResearchGeminiEvidence,
  Opportunity,
  OpportunityStatus,
} from "./blog-types";

// Todas las funciones del store son async (el backend puede ser Vercel KV, que siempre es
// remoto) aunque el módulo original no tenga tipos — por eso el cast explícito acá.
type BlogProjectsModule = {
  STATUSES: BlogProjectStatus[];
  ALLOWED_TRANSITIONS: Record<string, string[]>;
  createBlogProject: (input: BlogProjectInput) => Promise<BlogProject>;
  listBlogProjects: (filter?: { clientSite?: string; status?: BlogProjectStatus }) => Promise<BlogProject[]>;
  getBlogProject: (id: string) => Promise<BlogProject | null>;
  updateBlogProject: (id: string, patch: Partial<BlogProject>) => Promise<BlogProject>;
  transitionStatus: (id: string, status: BlogProjectStatus, note?: string) => Promise<BlogProject>;
};

type ClientProfilesModule = {
  GLOBAL_CONTENT_RULES: GlobalContentRules;
  listClientProfiles: () => Promise<ClientContentProfile[]>;
  getClientProfile: (gscSite: string) => Promise<ClientContentProfile | null>;
  upsertClientProfile: (gscSite: string, patch: Partial<ClientContentProfile>) => Promise<ClientContentProfile>;
};

type ContentInventoryModule = {
  getInventory: (siteUrl: string) => Promise<ContentInventory>;
  syncInventoryFromGsc: (siteUrl: string, opts?: { periodDays?: number }) => Promise<ContentInventory>;
  upsertInventoryItem: (siteUrl: string, url: string, patch: Record<string, unknown>) => Promise<ContentInventory>;
};

type KeywordResearchModule = {
  researchKeywordsForProject: (
    project: BlogProject,
    opts?: { periodDays?: number }
  ) => Promise<{
    evidenceGsc: KeywordResearchGscEvidence;
    evidenceGemini: KeywordResearchGeminiEvidence | null;
    insufficientData: boolean;
    message?: string;
  }>;
};

const {
  STATUSES,
  ALLOWED_TRANSITIONS,
  createBlogProject: _createBlogProject,
  listBlogProjects: _listBlogProjects,
  getBlogProject: _getBlogProject,
  updateBlogProject: _updateBlogProject,
  transitionStatus: _transitionStatus,
} = blogProjectsModule as unknown as BlogProjectsModule;

const {
  GLOBAL_CONTENT_RULES,
  listClientProfiles: _listClientProfiles,
  getClientProfile: _getClientProfile,
  upsertClientProfile: _upsertClientProfile,
} = clientProfilesModule as unknown as ClientProfilesModule;

const {
  getInventory: _getInventory,
  syncInventoryFromGsc: _syncInventoryFromGsc,
  upsertInventoryItem: _upsertInventoryItem,
} = contentInventoryModule as unknown as ContentInventoryModule;

const { researchKeywordsForProject } = keywordResearchModule as unknown as KeywordResearchModule;

type OpportunitiesModule = {
  listOpportunities: (filter?: { clientSite?: string; status?: OpportunityStatus }) => Promise<Opportunity[]>;
  getOpportunity: (id: string) => Promise<Opportunity | null>;
  markIgnored: (id: string) => Promise<Opportunity>;
  syncScanResults: (clientSite: string, clusters: unknown[]) => Promise<Opportunity[]>;
  convertToBlogProject: (id: string) => Promise<BlogProject>;
};

type OpportunityEngineModule = {
  scanOpportunities: (
    clientSite: string,
    opts?: { periodDays?: number }
  ) => Promise<{ evidenceGsc: unknown; clusters: unknown[]; insufficientData: boolean; message?: string }>;
};

const {
  listOpportunities: _listOpportunities,
  getOpportunity: _getOpportunity,
  markIgnored: _markIgnoredOpportunity,
  syncScanResults,
  convertToBlogProject: _convertToBlogProject,
} = opportunitiesModule as unknown as OpportunitiesModule;

const { scanOpportunities } = opportunityEngineModule as unknown as OpportunityEngineModule;

type JsonStoreModule = {
  USE_KV: boolean;
  selfTest: () => Promise<{ backend: string; roundTripOk: boolean }>;
};
const { selfTest } = jsonStoreModule as unknown as JsonStoreModule;

export async function runStoreSelfTest() {
  return selfTest();
}

export async function listBlogProjects(filter?: { clientSite?: string; status?: BlogProjectStatus }) {
  return _listBlogProjects(filter);
}

export async function getBlogProject(id: string) {
  return _getBlogProject(id);
}

export async function createBlogProject(input: BlogProjectInput) {
  return _createBlogProject(input);
}

export async function updateBlogProject(id: string, patch: Partial<BlogProject>) {
  return _updateBlogProject(id, patch);
}

export async function transitionBlogProjectStatus(id: string, status: BlogProjectStatus, note?: string) {
  return _transitionStatus(id, status, note);
}

export async function getBlogProjectTransitions() {
  return { statuses: STATUSES, allowedTransitions: ALLOWED_TRANSITIONS };
}

export async function listClientProfiles() {
  return _listClientProfiles();
}

export async function getClientProfile(gscSite: string) {
  return _getClientProfile(gscSite);
}

export async function upsertClientProfile(gscSite: string, patch: Partial<ClientContentProfile>) {
  return _upsertClientProfile(gscSite, patch);
}

export async function getGlobalContentRules() {
  return GLOBAL_CONTENT_RULES;
}

export async function getContentInventory(siteUrl: string) {
  return _getInventory(siteUrl);
}

export async function syncContentInventory(siteUrl: string, periodDays?: number) {
  return _syncInventoryFromGsc(siteUrl, { periodDays });
}

export async function updateContentInventoryItem(
  siteUrl: string,
  url: string,
  patch: Record<string, unknown>
) {
  return _upsertInventoryItem(siteUrl, url, patch);
}

export async function researchProjectKeywords(project: BlogProject, periodDays?: number) {
  return researchKeywordsForProject(project, { periodDays });
}

export async function listOpportunities(filter?: { clientSite?: string; status?: OpportunityStatus }) {
  return _listOpportunities(filter);
}

export async function getOpportunity(id: string) {
  return _getOpportunity(id);
}

export async function ignoreOpportunity(id: string) {
  return _markIgnoredOpportunity(id);
}

export async function convertOpportunityToBlogProject(id: string) {
  return _convertToBlogProject(id);
}

// Escanea el sitio del cliente y persiste el backlog resultante (con dedupe contra lo que ya
// estaba abierto) — es lo que trae "la data lista de entrada" en vez de arrancar de un
// formulario vacío.
export async function scanClientOpportunities(clientSite: string, periodDays?: number) {
  const result = await scanOpportunities(clientSite, { periodDays });
  const opportunities = result.insufficientData ? [] : await syncScanResults(clientSite, result.clusters);
  return {
    opportunities,
    insufficientData: result.insufficientData,
    message: result.message || null,
  };
}
