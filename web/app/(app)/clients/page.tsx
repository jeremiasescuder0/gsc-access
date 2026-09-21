import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { listClientProfiles } from "@/lib/blog-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientsPage() {
  const clients = await listClientProfiles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Clientes</h1>
        <p className="text-sm text-muted">
          Perfil de contenido por cliente — marca, tono, restricciones. Se combina con las reglas
          globales para armar los prompts de Gemini sin repetirlas en cada blog.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => (
          <Link
            key={c.gscSite}
            href={`/clients/${encodeURIComponent(c.gscSite)}`}
            className="rounded-lg border border-border bg-surface p-4 hover:border-accent transition space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-text">{c.clientName}</div>
              {c.isConfigured ? (
                <span className="flex items-center gap-1 text-xs text-success">
                  <CheckCircle2 className="w-3.5 h-3.5" /> configurado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Circle className="w-3.5 h-3.5" /> por defecto
                </span>
              )}
            </div>
            <div className="text-xs text-muted">{c.industry || "sin rubro definido"}</div>
            <div className="text-xs text-muted">{c.adsCustomerId ? "GSC + Ads" : "solo GSC"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
