import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { listBlogProjects, listClientProfiles } from "@/lib/blog-data";
import type { BlogProjectStatus } from "@/lib/blog-types";
import { StatusBadge } from "@/components/blog-projects/StatusBadge";
import { BlogProjectFilters } from "@/components/blog-projects/BlogProjectFilters";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BlogProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientSite?: string; status?: string }>;
}) {
  const { clientSite, status } = await searchParams;

  const [clients, projects] = await Promise.all([
    listClientProfiles(),
    listBlogProjects({ clientSite, status: status as BlogProjectStatus | undefined }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Blog Projects</h1>
          <p className="text-sm text-muted">
            Workflow de investigación, creación y auditoría de contenido SEO por cliente.
          </p>
        </div>
        <Link
          href="/blog-projects/new"
          className="flex items-center gap-1.5 px-3 py-2 rounded bg-accent text-white text-sm font-medium hover:bg-blue-600 transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo Blog Project
        </Link>
      </div>

      <Suspense>
        <BlogProjectFilters clients={clients.map((c) => ({ gscSite: c.gscSite, clientName: c.clientName }))} />
      </Suspense>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
          Sin Blog Projects {clientSite || status ? "para este filtro" : "todavía"}.{" "}
          <Link href="/blog-projects/new" className="text-accent hover:underline">
            Crear el primero
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/blog-projects/${p.id}`}
              className="rounded-lg border border-border bg-surface p-4 hover:border-accent transition space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium text-text line-clamp-2">
                  {p.workingTitle || p.title || "(sin título)"}
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="text-xs text-muted">{p.clientName || p.clientSite}</div>
              {p.primaryKeyword && (
                <div className="text-xs text-muted truncate">
                  <span className="text-accent">kw:</span> {p.primaryKeyword}
                </div>
              )}
              {p.topic && <div className="text-xs text-muted truncate">{p.topic}</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
