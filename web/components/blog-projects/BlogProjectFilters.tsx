"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { BLOG_PROJECT_STATUSES, STATUS_LABELS } from "@/lib/blog-types";

export function BlogProjectFilters({
  clients,
}: {
  clients: { gscSite: string; clientName: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={searchParams.get("clientSite") || ""}
        onChange={(e) => setParam("clientSite", e.target.value)}
        className="bg-bg border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
      >
        <option value="">Todos los clientes</option>
        {clients.map((c) => (
          <option key={c.gscSite} value={c.gscSite}>
            {c.clientName}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("status") || ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="bg-bg border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
      >
        <option value="">Todos los estados</option>
        {BLOG_PROJECT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
