// Tipos que reflejan la forma de los registros que persiste core/store/*.js.
// Mantener sincronizado a mano con blog-projects.js / client-profiles.js / content-inventory.js
// (no hay generación automática de tipos desde CommonJS en este repo).

export type BlogProjectStatus =
  | "opportunity"
  | "research"
  | "brief_ready"
  | "brief_approved"
  | "draft_ready"
  | "audit_required"
  | "revision_required"
  | "human_review"
  | "approved"
  | "published"
  | "refresh_opportunity"
  | "archived";

export const BLOG_PROJECT_STATUSES: BlogProjectStatus[] = [
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

export const STATUS_LABELS: Record<BlogProjectStatus, string> = {
  opportunity: "Oportunidad",
  research: "Investigación",
  brief_ready: "Brief listo",
  brief_approved: "Brief aprobado",
  draft_ready: "Borrador listo",
  audit_required: "Auditoría pendiente",
  revision_required: "Requiere revisión",
  human_review: "Revisión humana",
  approved: "Aprobado",
  published: "Publicado",
  refresh_opportunity: "Oportunidad de refresh",
  archived: "Archivado",
};

export type ContentType =
  | "new_blog"
  | "update_existing_blog"
  | "optimize_service_page"
  | "faq"
  | "ignore";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  new_blog: "Blog nuevo",
  update_existing_blog: "Actualizar contenido existente",
  optimize_service_page: "Optimizar página de servicio",
  faq: "FAQ",
  ignore: "Ignorar",
};

export type StatusHistoryEntry = { status: BlogProjectStatus; at: string; note: string };

export type EvidenceBlock = {
  gsc: unknown | null;
  ads: unknown | null;
  gemini: unknown | null;
  manual: unknown | null;
};

export type CannibalizationInfo = {
  level: "none" | "low" | "medium" | "high";
  competingUrls: string[];
  recommendation: string;
  reasoning: string;
} | null;

export type ContentBrief = {
  client: string;
  website: string | null;
  blogGoal: string;
  targetAudience: string | null;
  primaryKeyword: string;
  secondaryKeywords: string[];
  questionKeywords: string[];
  searchIntent: string | null;
  location: string | null;
  coreTopics: string[];
  suggestedH1: string;
  suggestedStructure: { heading: string; level: "h2" | "h3"; notes?: string }[];
  internalPagesToSupport: string[];
  suggestedInternalAnchors: string[];
  aeoGeoOpportunities: string[];
  brandNotes: string | null;
  thingsToAvoid: string[];
  sourceDataSummary: string;
  approved: boolean;
  approvedAt: string | null;
} | null;

export type BlogDraft = {
  version: number;
  content: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  suggestedInternalLinks: { anchor: string; url: string }[];
  suggestedImageConcept: string;
  generatedAt: string;
} | null;

export type AuditCategories = {
  search_intent: number;
  primary_keyword: number;
  secondary_keywords: number;
  structure: number;
  readability: number;
  aeo_geo: number;
  naturalness: number;
};

export type AuditStatus = "pass" | "minor_changes" | "major_changes";

export type AuditResult = {
  version: number;
  score: number;
  status: AuditStatus;
  categories: AuditCategories;
  missingKeywords: string[];
  overusedKeywords: string[];
  readabilityIssues: string[];
  weakSections: string[];
  aeoOpportunities: string[];
  internalLinkOpportunities: string[];
  requiredFixes: string[];
  revisionBrief: string;
  auditedAt: string;
};

export type HumanReview = {
  decision: "approved" | "changes_requested";
  reviewedAt: string;
  reviewedBy: string | null;
  notes: string | null;
} | null;

export type PerformanceSnapshot = {
  capturedAt: string;
  periodLabel: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  queries: { query: string; clicks: number; impressions: number; position: number }[];
};

export type RefreshOpportunity = {
  reason: string;
  detectedAt: string;
  signals: string[];
} | null;

export type BlogProject = {
  id: string;
  clientSite: string;
  clientName: string | null;
  createdAt: string;
  updatedAt: string;
  status: BlogProjectStatus;
  statusHistory: StatusHistoryEntry[];

  title: string | null;
  workingTitle: string | null;
  topic: string | null;
  targetService: string | null;
  targetLocation: string | null;
  targetAudience: string | null;
  searchIntent: string | null;

  primaryKeyword: string | null;
  secondaryKeywords: string[];
  questionKeywords: string[];
  semanticKeywords: string[];

  sourceOpportunityId: string | null;
  opportunityReason: string | null;
  contentType: ContentType | null;

  evidence: EvidenceBlock;
  relatedExistingUrls: string[];
  cannibalization: CannibalizationInfo;
  recommendedInternalLinks: string[];

  brief: ContentBrief;
  briefHistory: ContentBrief[];

  draft: BlogDraft;
  draftHistory: BlogDraft[];

  audits: AuditResult[];
  revisionCount: number;

  finalContent: BlogDraft;
  humanReview: HumanReview;

  publication: { url: string | null; publishedAt: string | null };
  performance: PerformanceSnapshot[];
  refreshOpportunity: RefreshOpportunity;
};

export type BlogProjectInput = Partial<BlogProject> & { clientSite: string };

export type ClientContentProfile = {
  gscSite: string;
  clientName: string;
  industry?: string;
  adsCustomerId?: string | null;
  brandName: string;
  website: string | null;
  primaryServices: string[];
  locations: string[];
  targetAudience: string | null;
  preferredTone: string | null;
  defaultArticleLength: [number, number] | null;
  seoAeoBalance: { seo: number; aeo: number } | null;
  wordsToAvoid: string[];
  claimsToAvoid: string[];
  firstPersonPlural: boolean;
  ctaStyle: string | null;
  contentRestrictions: string[];
  internalServicePages: string[];
  otherInstructions: string | null;
  updatedAt: string | null;
  isConfigured: boolean;
};

export type GlobalContentRules = {
  language: string;
  wordCountRange: [number, number];
  seoAeoBalance: { seo: number; aeo: number };
  structure: string[];
  style: string[];
  restrictions: string[];
  cta: string;
};

export type ContentInventoryItem = {
  url: string;
  title: string | null;
  pageType: string;
  mainTopic: string | null;
  targetService: string | null;
  primaryKeyword: string | null;
  publicationDate: string | null;
  relatedKeywordClusters: string[];
  gscMetrics: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    stale?: boolean;
  } | null;
  notes: string | null;
};

export type ContentInventory = {
  siteUrl: string;
  syncedAt: string | null;
  items: ContentInventoryItem[];
};

// Forma de evidence.gsc / evidence.gemini después de correr la investigación de keywords
// (core/keyword-research.js). Ver sección 19 del spec — hecho de Google separado de
// interpretación de Gemini.
export type KeywordResearchGscEvidence = {
  fetchedAt: string;
  periodDays: number;
  range: { startDate: string; endDate: string };
  totalQueriesAvailable: number;
  filterMode: "topic_match" | "broad_fallback";
  queriesSentToGemini: { query: string; impressions: number; clicks: number; ctr: number; position: number }[];
};

export type KeywordCluster = {
  cluster_name: string;
  search_intent: string;
  queries: string[];
  topic: string;
  service_relevance: string;
  recommended_content_type: ContentType;
  reasoning_summary: string;
};

export type KeywordResearchGeminiEvidence = {
  model: string;
  generatedAt: string;
  clusters: KeywordCluster[];
  suggestedPrimaryKeyword: string;
  suggestedSecondaryKeywords: string[];
  suggestedQuestionKeywords: string[];
  suggestedSemanticKeywords: string[];
  suggestedContentType: ContentType | null;
  reasoningSummary: string;
};

export type KeywordResearchResult = {
  project: BlogProject;
  insufficientData: boolean;
  message: string | null;
};
