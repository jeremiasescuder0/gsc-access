import type { PriorityLabel } from "@/lib/blog-types";

const STYLES: Record<PriorityLabel, string> = {
  high: "text-success bg-success/10 border-success/30",
  medium: "text-warning bg-warning/10 border-warning/30",
  low: "text-muted bg-muted/10 border-muted/30",
};

const LABELS: Record<PriorityLabel, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export function PriorityBadge({ priority }: { priority: PriorityLabel }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${STYLES[priority]}`}>
      Oportunidad {LABELS[priority]}
    </span>
  );
}
