import type { SitePerformance } from "./gsc-types";

export type OpportunityType = "blog_topic" | "quick_win" | "low_ctr";

export type ContentOpportunity = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  type: OpportunityType;
};

export type ContentOpportunities = {
  blogTopics: ContentOpportunity[];
  quickWins: ContentOpportunity[];
  lowCtr: ContentOpportunity[];
  siteCtr: number;
};

export function classifyContentOpportunities(data: SitePerformance): ContentOpportunities {
  const siteCtr =
    data.totals.current.impressions > 0
      ? data.totals.current.clicks / data.totals.current.impressions
      : 0;

  const blogPageUrls = new Set(data.blogPages.map((p) => p.page.toLowerCase()));

  function hasBlogPage(query: string): boolean {
    const word = query.toLowerCase().split(" ")[0];
    for (const url of blogPageUrls) {
      if (url.includes(word)) return true;
    }
    return false;
  }

  const blogTopics: ContentOpportunity[] = data.queries
    .filter((q) => q.impressions >= 30 && q.position > 10 && !hasBlogPage(q.query))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20)
    .map((q) => ({ query: q.query, impressions: q.impressions, clicks: q.clicks, ctr: q.ctr, position: q.position, type: "blog_topic" }));

  const quickWins: ContentOpportunity[] = data.queries
    .filter((q) => q.position >= 2 && q.position <= 10 && q.ctr < siteCtr * 0.6)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map((q) => ({ query: q.query, impressions: q.impressions, clicks: q.clicks, ctr: q.ctr, position: q.position, type: "quick_win" }));

  const lowCtr: ContentOpportunity[] = data.queries
    .filter((q) => q.impressions >= 100 && q.ctr < 0.02 && q.position < 15)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map((q) => ({ query: q.query, impressions: q.impressions, clicks: q.clicks, ctr: q.ctr, position: q.position, type: "low_ctr" }));

  return { blogTopics, quickWins, lowCtr, siteCtr };
}

export function difficultyFromPosition(position: number): { label: string; cls: string } {
  if (position <= 20) return { label: "Baja", cls: "text-success bg-success/10" };
  if (position <= 40) return { label: "Media", cls: "text-warning bg-warning/10" };
  return { label: "Alta", cls: "text-danger bg-danger/10" };
}
