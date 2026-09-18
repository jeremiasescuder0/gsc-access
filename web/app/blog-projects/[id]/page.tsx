import Link from "next/link";
import { ChevronLeft, FileEdit, ClipboardCheck, LineChart, type LucideIcon } from "lucide-react";
import { getBlogProject, getBlogProjectTransitions } from "@/lib/blog-data";
import { StatusChanger } from "@/components/blog-projects/StatusChanger";
import { EditBlogProjectForm } from "@/components/blog-projects/EditBlogProjectForm";
import { KeywordResearchPanel } from "@/components/blog-projects/KeywordResearchPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BlogProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, transitions] = await Promise.all([getBlogProject(id), getBlogProjectTransitions()]);

  if (!project) {
    return (
      <div className="space-y-4">
        <Link href="/blog-projects" className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition">
          <ChevronLeft className="w-4 h-4" /> Volver a Blog Projects
        </Link>
        <div className="rounded-lg border border-danger bg-surface p-6 text-sm text-danger">
          Blog Project no encontrado.
        </div>
      </div>
    );
  }

  const allowedNext = (transitions.allowedTransitions[project.status] || []) as typeof transitions.statuses;

  return (
    <div className="space-y-6">
      <Link href="/blog-projects" className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition">
        <ChevronLeft className="w-4 h-4" /> Volver a Blog Projects
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            {project.workingTitle || project.title || "(sin título)"}
          </h1>
          <p className="text-sm text-muted">
            {project.clientName || project.clientSite} · creado {new Date(project.createdAt).toLocaleDateString("es-AR")}
          </p>
        </div>
        <StatusChanger projectId={project.id} status={project.status} allowedNext={allowedNext} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EditBlogProjectForm project={project} />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <h2 className="text-sm font-medium text-muted uppercase tracking-wide">Historial de estado</h2>
            <ul className="space-y-2">
              {[...project.statusHistory].reverse().map((h, i) => (
                <li key={i} className="text-xs">
                  <div className="text-text font-medium">{h.status}</div>
                  <div className="text-muted">
                    {new Date(h.at).toLocaleString("es-AR")}
                    {h.note ? ` · ${h.note}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <KeywordResearchPanel project={project} />

          <PhaseNotice
            icon={FileEdit}
            title="Brief y Draft (Writer)"
            body="Generar el brief estructurado y el artículo a partir de las keywords elegidas arriba todavía no está conectado — se agrega en la próxima fase."
          />
          <PhaseNotice
            icon={ClipboardCheck}
            title="Auditoría y revisión"
            body="El auditor independiente (rúbrica de 100 puntos) y el ciclo de revisión automática se agregan junto con el Writer."
          />
          <PhaseNotice
            icon={LineChart}
            title="Performance post-publicación"
            body="El tracking de Search Console para artículos publicados y las recomendaciones de refresh se agregan en una fase posterior."
          />
        </div>
      </div>
    </div>
  );
}

function PhaseNotice({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted" />
        <h3 className="text-sm font-medium text-text">{title}</h3>
      </div>
      <p className="text-xs text-muted">{body}</p>
    </div>
  );
}
