"use client";

import { useState } from "react";
import { Megaphone, Search, Globe, FileText, Layers } from "lucide-react";
import type { CampaignDetail } from "@/lib/types";
import { AdGroupsTable } from "./AdGroupsTable";
import { AdsList } from "./AdsList";
import { KeywordsTable } from "./KeywordsTable";
import { GeoTable } from "./GeoTable";
import { SearchTermsTable } from "./SearchTermsTable";

type Tab = "adGroups" | "ads" | "keywords" | "geo" | "searchTerms";

const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: "adGroups", label: "Ad groups", icon: Layers },
  { id: "ads", label: "Ads", icon: Megaphone },
  { id: "keywords", label: "Keywords", icon: Search },
  { id: "geo", label: "Ubicaciones", icon: Globe },
  { id: "searchTerms", label: "Search terms", icon: FileText },
];

export function CampaignTabs({
  detail,
  currency,
}: {
  detail: CampaignDetail;
  currency: string | null;
}) {
  const counts: Record<Tab, number> = {
    adGroups: detail.adGroups.length,
    ads: detail.ads.length,
    keywords: detail.keywords.length,
    geo: detail.geo.length,
    searchTerms: detail.searchTerms.length,
  };

  const firstWithData = TABS.find((t) => counts[t.id] > 0)?.id ?? "adGroups";
  const [active, setActive] = useState<Tab>(firstWithData);

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-border mb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          const count = counts[t.id];
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  isActive ? "bg-accent/20 text-accent" : "bg-bg text-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        {active === "adGroups" && <AdGroupsTable adGroups={detail.adGroups} currency={currency} />}
        {active === "ads" && <AdsList ads={detail.ads} currency={currency} />}
        {active === "keywords" && (
          <KeywordsTable keywords={detail.keywords} currency={currency} />
        )}
        {active === "geo" && <GeoTable geo={detail.geo} currency={currency} />}
        {active === "searchTerms" && (
          <SearchTermsTable searchTerms={detail.searchTerms} currency={currency} />
        )}
      </div>
    </div>
  );
}
