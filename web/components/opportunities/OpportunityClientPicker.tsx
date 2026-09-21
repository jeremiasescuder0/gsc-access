"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function OpportunityClientPicker({
  clients,
}: {
  clients: { gscSite: string; clientName: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setClient(gscSite: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (gscSite) params.set("clientSite", gscSite);
    else params.delete("clientSite");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={searchParams.get("clientSite") || ""}
      onChange={(e) => setClient(e.target.value)}
      className="bg-bg border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
    >
      <option value="">Elegí un cliente</option>
      {clients.map((c) => (
        <option key={c.gscSite} value={c.gscSite}>
          {c.clientName}
        </option>
      ))}
    </select>
  );
}
