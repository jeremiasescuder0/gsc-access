import type { Geo } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent, roasColor } from "@/lib/format";

const locationTypeLabel: Record<string, string> = {
  LOCATION_OF_PRESENCE: "presencia",
  AREA_OF_INTEREST: "interés",
};

export function GeoTable({ geo, currency }: { geo: Geo[]; currency: string | null }) {
  if (geo.length === 0) {
    return <div className="text-sm text-muted py-4">Sin datos geográficos.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Ubicación</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium text-right">Costo</th>
            <th className="px-4 py-3 font-medium text-right">Conv.</th>
            <th className="px-4 py-3 font-medium text-right">ROAS</th>
            <th className="px-4 py-3 font-medium text-right">CTR</th>
            <th className="px-4 py-3 font-medium text-right">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {geo.map((g, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/40">
              <td className="px-4 py-3 font-medium text-text">{g.location}</td>
              <td className="px-4 py-3 text-xs text-muted">
                {(g.locationType && locationTypeLabel[g.locationType]) ||
                  g.locationType?.toLowerCase() ||
                  "—"}
              </td>
              <td className="px-4 py-3 text-right">{formatCurrency(g.cost, currency)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(g.conversions, 1)}</td>
              <td className={`px-4 py-3 text-right font-medium ${roasColor(g.roas)}`}>
                {g.cost > 0 ? `${formatNumber(g.roas, 0)}%` : "—"}
              </td>
              <td className="px-4 py-3 text-right">{formatPercent(g.ctr, 2)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(g.clicks, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
