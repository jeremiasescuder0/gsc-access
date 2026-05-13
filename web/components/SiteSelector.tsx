import Link from "next/link";
import { Globe, AlertCircle } from "lucide-react";
import type { Site } from "@/lib/gsc-types";

const PERMISSION_LABELS: Record<string, string> = {
  siteOwner: "owner",
  siteFullUser: "full user",
  siteRestrictedUser: "restricted user",
  siteUnverifiedUser: "sin acceso verificado",
};

function isAccessible(level: string): boolean {
  return level === "siteOwner" || level === "siteFullUser" || level === "siteRestrictedUser";
}

export function SiteSelector({
  sites,
  currentSiteUrl,
}: {
  sites: Site[];
  currentSiteUrl?: string;
}) {
  if (sites.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-muted">
        Sin sitios en Google Search Console. Verificá que la cuenta autenticada tenga sitios
        agregados en{" "}
        <a
          href="https://search.google.com/search-console"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Search Console
        </a>
        .
      </div>
    );
  }

  const accessible = sites.filter((s) => isAccessible(s.permissionLevel));
  const unverified = sites.filter((s) => !isAccessible(s.permissionLevel));

  return (
    <div className="space-y-4">
      {unverified.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-warning">Sitios sin acceso verificado</div>
              <div className="text-muted text-xs mt-1">
                La cuenta autenticada figura como{" "}
                <code className="text-accent">siteUnverifiedUser</code> en {unverified.length}{" "}
                sitio{unverified.length > 1 ? "s" : ""}. GSC no devuelve data hasta verificar la
                propiedad (DNS, HTML tag, o desde el GSC del dueño concederte permisos de full
                user).
              </div>
            </div>
          </div>
        </div>
      )}

      {accessible.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted uppercase tracking-wide">
            Sitios con acceso ({accessible.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accessible.map((s) => (
              <SiteCard
                key={s.siteUrl}
                site={s}
                isCurrent={currentSiteUrl === s.siteUrl}
                disabled={false}
              />
            ))}
          </div>
        </div>
      )}

      {unverified.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted uppercase tracking-wide">
            Sin acceso verificado ({unverified.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unverified.map((s) => (
              <SiteCard key={s.siteUrl} site={s} isCurrent={false} disabled />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SiteCard({
  site,
  isCurrent,
  disabled,
}: {
  site: Site;
  isCurrent: boolean;
  disabled: boolean;
}) {
  const label = PERMISSION_LABELS[site.permissionLevel] || site.permissionLevel;
  const href = `/organic/${encodeURIComponent(site.siteUrl)}`;
  return (
    <Link
      href={href}
      className={`flex items-start gap-3 text-left p-4 rounded-lg border transition ${
        isCurrent
          ? "border-accent bg-accent/10"
          : disabled
          ? "border-border bg-surface opacity-60 hover:opacity-100 hover:border-warning"
          : "border-border bg-surface hover:border-accent"
      }`}
    >
      <Globe className={`w-4 h-4 shrink-0 mt-0.5 ${disabled ? "text-muted" : "text-accent"}`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-text truncate">{site.siteUrl}</div>
        <div className={`text-xs mt-0.5 ${disabled ? "text-warning" : "text-muted"}`}>
          {label}
        </div>
      </div>
    </Link>
  );
}
