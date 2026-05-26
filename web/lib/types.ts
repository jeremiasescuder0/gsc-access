export type Campaign = {
  id: string | null;
  name: string;
  status?: string | number;
  channelType?: string | number;
  biddingStrategyType?: string | number;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  avgCpc: number;
  searchImpressionShare: number | null;
  roas: number;
};

export type CampaignMeta = Campaign & {
  dailyBudget: number;
  budgetDeliveryMethod: string | null;
};

export type Ad = {
  adGroupAdResourceName: string | null;
  adGroup: string | null;
  adId: string | null;
  adType: string | number | null;
  status: string | number | null;
  finalUrls: string[];
  headlines: { text: string; pinned: string | number | null }[];
  descriptions: { text: string; pinned: string | number | null }[];
  path1: string | null;
  path2: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
};

export type Keyword = {
  text: string | null;
  matchType: string | null;
  adGroup: string | null;
  status: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  avgCpc: number;
  qualityScore: number | null;
  roas: number;
};

export type Geo = {
  criterionId: string | null;
  location: string;
  locationType: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  roas: number;
};

export type AssetGroup = {
  id: string | null;
  name: string | null;
  status: string | number | null;
  finalUrls: string[];
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
};

export type Asset = {
  assetId: string | null;
  fieldType: string | number | null;
  assetGroupId: string | null;
  assetGroupName: string | null;
  text: string | null;
  imageUrl: string | null;
  youtubeId: string | null;
  callToAction: string | null;
};

export type CampaignDetail = {
  campaign: CampaignMeta | null;
  adGroups: AdGroup[];
  ads: Ad[];
  keywords: Keyword[];
  geo: Geo[];
  searchTerms: SearchTerm[];
  assetGroups: AssetGroup[];
  assets: Asset[];
};

export type SearchTerm = {
  searchTerm: string;
  status?: string;
  campaign: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
};

export type AdGroup = {
  name: string;
  campaign: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  avgCpc: number;
};

export type Conversion = {
  name: string;
  category?: string;
  conversions: number;
  conversionsValue: number;
  valuePerConversion: number;
  allConversions: number;
};

export type Account = {
  account: string;
  accountId: string;
  currency: string | null;
  campaigns: Campaign[];
  searchTerms: SearchTerm[];
  adGroups: AdGroup[];
  conversions: Conversion[];
};

export type AccountSummary = {
  accountId: string;
  account: string;
  currency: string | null;
  totalCost: number;
  totalConversions: number;
  totalConversionsValue: number;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  roas: number;
  cpa: number;
  campaignsCount: number;
  hasActivity: boolean;
};
