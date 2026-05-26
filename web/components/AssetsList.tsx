"use client";

import { useState } from "react";
import type { Asset } from "@/lib/types";

const FIELD_TYPE_LABELS: Record<string, string> = {
  HEADLINE: "Headline",
  LONG_HEADLINE: "Long Headline",
  DESCRIPTION: "Description",
  BUSINESS_NAME: "Business Name",
  MARKETING_IMAGE: "Imagen principal",
  SQUARE_MARKETING_IMAGE: "Imagen cuadrada",
  PORTRAIT_MARKETING_IMAGE: "Imagen vertical",
  LOGO: "Logo",
  SQUARE_LOGO: "Logo cuadrado",
  LANDSCAPE_LOGO: "Logo apaisado",
  YOUTUBE_VIDEO: "Video YouTube",
  CALL_TO_ACTION_SELECTION: "Call to Action",
  SITELINK: "Sitelink",
  CALLOUT: "Callout",
  STRUCTURED_SNIPPET: "Structured Snippet",
  PRICE: "Price",
  PROMOTION: "Promotion",
};

const ASSET_ORDER = [
  "HEADLINE",
  "LONG_HEADLINE",
  "DESCRIPTION",
  "BUSINESS_NAME",
  "CALL_TO_ACTION_SELECTION",
  "MARKETING_IMAGE",
  "SQUARE_MARKETING_IMAGE",
  "PORTRAIT_MARKETING_IMAGE",
  "LOGO",
  "SQUARE_LOGO",
  "LANDSCAPE_LOGO",
  "YOUTUBE_VIDEO",
  "SITELINK",
  "CALLOUT",
];

function fieldLabel(fieldType: string | number | null): string {
  if (fieldType == null) return "—";
  const key = String(fieldType);
  return FIELD_TYPE_LABELS[key] ?? key.toLowerCase().replace(/_/g, " ");
}

function charLimit(fieldType: string | number | null): number | null {
  const key = String(fieldType);
  if (key === "HEADLINE") return 30;
  if (key === "LONG_HEADLINE") return 90;
  if (key === "DESCRIPTION") return 90;
  if (key === "BUSINESS_NAME") return 25;
  return null;
}

function sortAssets(assets: Asset[]): Asset[] {
  return [...assets].sort((a, b) => {
    const ai = ASSET_ORDER.indexOf(String(a.fieldType));
    const bi = ASSET_ORDER.indexOf(String(b.fieldType));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function groupByType(assets: Asset[]): Map<string, Asset[]> {
  const map = new Map<string, Asset[]>();
  for (const asset of assets) {
    const key = String(asset.fieldType ?? "OTHER");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(asset);
  }
  return map;
}

export function AssetsList({
  assets,
  assetGroupFilter,
}: {
  assets: Asset[];
  assetGroupFilter?: string | null;
}) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(assetGroupFilter ?? null);

  const groups = [...new Set(assets.map((a) => a.assetGroupName).filter(Boolean))] as string[];
  const filtered = selectedGroup
    ? assets.filter((a) => a.assetGroupName === selectedGroup)
    : assets;

  const sorted = sortAssets(filtered);
  const grouped = groupByType(sorted);

  if (assets.length === 0) {
    return (
      <div className="text-sm text-muted py-4">
        Sin assets. Esta campaña puede ser de tipo Search o no tiene datos disponibles.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedGroup(null)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              selectedGroup === null
                ? "bg-accent text-bg border-accent"
                : "border-border text-muted hover:text-text"
            }`}
          >
            Todos
          </button>
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                selectedGroup === g
                  ? "bg-accent text-bg border-accent"
                  : "border-border text-muted hover:text-text"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {[...grouped.entries()].map(([type, typeAssets]) => {
        const limit = charLimit(type);
        const isText = typeAssets.some((a) => a.text);
        const isImage = typeAssets.some((a) => a.imageUrl);
        const isVideo = typeAssets.some((a) => a.youtubeId);

        return (
          <div key={type} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">
                {fieldLabel(type)}
              </span>
              <span className="text-xs text-muted">({typeAssets.length})</span>
              {limit && (
                <span className="text-xs text-muted">· límite {limit} caracteres</span>
              )}
            </div>

            <div className="rounded-lg border border-border bg-surface divide-y divide-border">
              {typeAssets.map((asset, i) => {
                const overLimit = limit && asset.text && asset.text.length > limit;
                return (
                  <div key={i} className="px-4 py-3 flex items-start gap-3">
                    {isText && (
                      <div className="flex-1">
                        <span className={overLimit ? "text-danger" : "text-text"}>
                          {asset.text || "—"}
                        </span>
                        {limit && asset.text && (
                          <span className={`ml-2 text-xs ${overLimit ? "text-danger" : "text-muted"}`}>
                            {asset.text.length}/{limit}
                          </span>
                        )}
                      </div>
                    )}
                    {isImage && asset.imageUrl && (
                      <div className="flex-1">
                        <img
                          src={asset.imageUrl}
                          alt={fieldLabel(type)}
                          className="max-h-24 rounded object-cover"
                        />
                      </div>
                    )}
                    {isVideo && asset.youtubeId && (
                      <div className="flex-1 text-sm text-accent">
                        YouTube: {asset.youtubeId}
                      </div>
                    )}
                    {asset.callToAction && (
                      <div className="flex-1 text-sm text-text">{asset.callToAction}</div>
                    )}
                    {asset.assetGroupName && groups.length > 1 && (
                      <span className="text-xs text-muted shrink-0">{asset.assetGroupName}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
