import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listClientProfiles } from "@/lib/blog-data";
import { NewBlogProjectForm } from "@/components/blog-projects/NewBlogProjectForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewBlogProjectPage() {
  const clients = await listClientProfiles();

  return (
    <div className="space-y-6">
      <Link
        href="/blog-projects"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition"
      >
        <ChevronLeft className="w-4 h-4" /> Volver a Blog Projects
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Nuevo Blog Project</h1>
        <p className="text-sm text-muted">
          Carga manual. El motor de oportunidades (GSC + Ads + clustering con Gemini) para crear
          proyectos automáticamente se agrega en una fase siguiente.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-lg border border-danger bg-surface p-6 text-sm text-danger">
          No hay clientes configurados en core/clients.js.
        </div>
      ) : (
        <NewBlogProjectForm clients={clients.map((c) => ({ gscSite: c.gscSite, clientName: c.clientName }))} />
      )}
    </div>
  );
}
