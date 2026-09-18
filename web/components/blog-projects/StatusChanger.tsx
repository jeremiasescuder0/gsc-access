"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { STATUS_LABELS, type BlogProjectStatus } from "@/lib/blog-types";
import { StatusBadge } from "./StatusBadge";

export function StatusChanger({
  projectId,
  status,
  allowedNext,
}: {
  projectId: string;
  status: BlogProjectStatus;
  allowedNext: BlogProjectStatus[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeTo(newStatus: BlogProjectStatus) {
    setOpen(false);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/blog-projects/${projectId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cambiar el estado");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        {allowedNext.length > 0 && (
          <button
            onClick={() => setOpen((v) => !v)}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-muted hover:text-accent transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
            Cambiar estado
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-10 mt-1 w-56 rounded-lg border border-border bg-surface shadow-lg py-1">
          {allowedNext.map((s) => (
            <button
              key={s}
              onClick={() => changeTo(s)}
              className="w-full text-left px-3 py-1.5 text-sm text-text hover:bg-bg transition"
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {error && <div className="text-xs text-danger mt-1">{error}</div>}
    </div>
  );
}
