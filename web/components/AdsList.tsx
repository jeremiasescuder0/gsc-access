import { Pin } from "lucide-react";
import type { Ad } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

function formatEnum(value: string | number | null | undefined): string {
  if (value == null) return "—";
  return String(value).toLowerCase().replace(/_/g, " ");
}

export function AdsList({ ads, currency }: { ads: Ad[]; currency: string | null }) {
  if (ads.length === 0) {
    return (
      <div className="text-sm text-muted py-4">
        Sin ads listados. Puede ser que la campaña sea Performance Max o que las queries de
        anuncios no aplican a este tipo de campaña.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ads.map((ad, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted">
                {ad.adGroup} · {formatEnum(ad.adType)} · {formatEnum(ad.status)}
              </div>
              {ad.finalUrls.length > 0 && (
                <div className="text-xs text-accent truncate mt-1">{ad.finalUrls[0]}</div>
              )}
            </div>
            <div className="text-right text-xs shrink-0">
              <div className="text-muted">Costo</div>
              <div className="font-medium text-text">{formatCurrency(ad.cost, currency)}</div>
            </div>
          </div>

          {ad.headlines.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-muted uppercase tracking-wide mb-1.5">
                Headlines ({ad.headlines.length})
              </div>
              <ul className="space-y-1">
                {ad.headlines.map((h, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    {h.pinned && String(h.pinned) !== "UNSPECIFIED" && String(h.pinned) !== "0" ? (
                      <Pin className="w-3 h-3 text-warning shrink-0" />
                    ) : (
                      <span className="w-3 h-3 shrink-0" />
                    )}
                    <span className="text-text">{h.text}</span>
                    {h.pinned && String(h.pinned) !== "UNSPECIFIED" && String(h.pinned) !== "0" && (
                      <span className="text-xs text-muted">({formatEnum(h.pinned)})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ad.descriptions.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-muted uppercase tracking-wide mb-1.5">
                Descriptions ({ad.descriptions.length})
              </div>
              <ul className="space-y-1">
                {ad.descriptions.map((d, j) => (
                  <li key={j} className="text-sm text-text">
                    {d.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3 text-xs pt-3 border-t border-border">
            <Stat label="Impresiones" value={formatNumber(ad.impressions, 0)} />
            <Stat label="Clicks" value={formatNumber(ad.clicks, 0)} />
            <Stat label="CTR" value={formatPercent(ad.ctr, 2)} />
            <Stat label="Conv." value={formatNumber(ad.conversions, 1)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted">{label}</div>
      <div className="text-text font-medium">{value}</div>
    </div>
  );
}
