import { STATUS_LABELS, type BlogProjectStatus } from "@/lib/blog-types";

const STATUS_STYLES: Record<BlogProjectStatus, string> = {
  opportunity: "text-muted bg-muted/10 border-muted/30",
  research: "text-accent bg-accent/10 border-accent/30",
  brief_ready: "text-accent bg-accent/10 border-accent/30",
  brief_approved: "text-accent bg-accent/10 border-accent/30",
  draft_ready: "text-accent bg-accent/10 border-accent/30",
  audit_required: "text-warning bg-warning/10 border-warning/30",
  revision_required: "text-warning bg-warning/10 border-warning/30",
  human_review: "text-warning bg-warning/10 border-warning/30",
  approved: "text-success bg-success/10 border-success/30",
  published: "text-success bg-success/10 border-success/30",
  refresh_opportunity: "text-warning bg-warning/10 border-warning/30",
  archived: "text-muted bg-muted/10 border-muted/30",
};

export function StatusBadge({ status }: { status: BlogProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
