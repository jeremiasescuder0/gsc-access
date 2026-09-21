import { Database } from "lucide-react";
import type { BlogProject } from "@/lib/blog-types";
import { formatNumber, formatPosition } from "@/lib/format";

// Muestra la evidencia de ORIGEN del proyecto (de dónde salió — normalmente de convertir una
// Opportunity escaneada). Sólo lectura, a propósito: es historial de por qué existe el
// proyecto, no algo que se edite acá. Distinto del panel de "Investigar keywords", que opera
// sobre evidence.keywordResearch — ver la nota en blog-types.ts sobre por qué están separados.
export function OriginEvidencePanel({ project }: { project: BlogProject }) {
  const gsc = project.evidence?.gsc;
  if (!gsc || !Array.isArray(gsc.queries) || gsc.queries.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <h2 className="text-sm font-medium text-muted uppercase tracking-wide flex items-center gap-1.5">
        <Database className="w-4 h-4" />
        Evidencia de origen
      </h2>
      <p className="text-xs text-muted">
        {project.sourceOpportunityId
          ? "Queries de Search Console que sustentaron la oportunidad original de este proyecto."
          : "Queries de Search Console asociadas a este proyecto."}
      </p>
      <div className="text-xs text-muted">
        {gsc.queries.length} queries · {formatNumber(gsc.totalImpressions)} impresiones combinadas · posición promedio{" "}
        {formatPosition(gsc.avgPosition)}
      </div>
      <div className="space-y-1">
        {gsc.queries.map((q) => (
          <div key={q.query} className="flex items-center justify-between text-xs border-b border-border last:border-0 py-1">
            <span className="text-text truncate pr-2">{q.query}</span>
            <span className="text-muted shrink-0">
              {formatNumber(q.impressions)} impr · pos {formatPosition(q.position)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
