// Puente server-side hacia core/store/*.js y core/keyword-research.js. Import ESTÁTICO a
// propósito — ver la nota en gsc-data.ts sobre por qué el dynamic import con pathToFileURL no
// se traza en el build de Vercel.
import * as blogProjectsModule from "../../core/store/blog-projects.js";
import * as clientProfilesModule from "../../core/store/client-profiles.js";
import * as contentInventoryModule from "../../core/store/content-inventory.js";
import * as keywordResearchModule from "../../core/keyword-research.js";
import * as jsonStoreModule from "../../core/store/json-store.js";
import type {
  BlogProject,
  BlogProjectInput,
  BlogProjectStatus,
  ClientContentProfile,
  GlobalContentRules,
  ContentInventory,
  KeywordResearchGscEvidence,
  KeywordResearchGeminiEvidence,
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
