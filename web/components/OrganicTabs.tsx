"use client";

import { useState } from "react";
import { Search, FileText, Target, BookOpen, Lightbulb } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { SitePerformance } from "@/lib/gsc-types";
import { classifyContentOpportunities } from "@/lib/content-opportunities";
import { QueriesTable } from "./QueriesTable";
import { PagesTable } from "./PagesTable";
import { OpportunitiesTable } from "./OpportunitiesTable";
import { ContentOpportunitiesTable } from "./ContentOpportunitiesTable";

type Tab = "queries" | "pages" | "opportunities" | "blog" | "contenido";

const TABS: { id: Tab; label: string; icon: typeof Search }[] = [
  { id: "queries", label: "Queries", icon: Search },
  { id: "pages", label: "Páginas", icon: FileText },
  { id: "opportunities", label: "Oportunidades", icon: Target },
  { id: "blog", label: "Blog", icon: BookOpen },
  { id: "contenido", label: "Contenido", icon: Lightbulb },
];

export function OrganicTabs({ data }: { data: SitePerformance }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const contentOps = classifyContentOpportunities(data);
  const contentTotal = contentOps.blogTopics.length + contentOps.quickWins.length + contentOps.lowCtr.length;

  const counts: Record<Tab, number> = {
    queries: data.queries.length,
    pages: data.pages.length,
    opportunities: data.opportunities.length,
    blog: data.blogPages.length,
    contenido: contentTotal,
  };

  const [active, setActive] = useState<Tab>("queries");
  const [patternInput, setPatternInput] = useState(data.blogPattern);

  function applyPattern() {
    const p = patternInput.trim() || "/blog/";
    const params = new URLSearchParams(searchParams.toString());
    params.set("blogPattern", p);
    router.push(`${pathname}?${params.toString()}`);
  }

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
        {active === "queries" && <QueriesTable queries={data.queries} limit={50} />}
        {active === "pages" && <PagesTable pages={data.pages} limit={50} />}
        {active === "opportunities" && (
          <OpportunitiesTable opportunities={data.opportunities} />
        )}
        {active === "contenido" && <ContentOpportunitiesTable data={data} />}
        {active === "blog" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted shrink-0">Patrón de URL:</span>
              <input
                value={patternInput}
                onChange={(e) => setPatternInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyPattern()}
                placeholder="/blog/"
                className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs text-text placeholder-muted focus:outline-none focus:border-accent font-mono"
              />
              <button
                onClick={applyPattern}
                className="px-3 py-1 text-xs rounded bg-accent text-white hover:bg-blue-600 transition"
              >
                Aplicar
              </button>
            </div>
            {data.blogPages.length === 0 ? (
              <div className="text-sm text-muted py-2">
                Ninguna página matchea <code className="text-accent">{data.blogPattern}</code>. Cambiá el patrón arriba.
              </div>
            ) : (
              <PagesTable pages={data.blogPages} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
