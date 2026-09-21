import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getClientProfile, getGlobalContentRules } from "@/lib/blog-data";
import { getGa4Properties } from "@/lib/ga4-data";
import { ClientProfileForm } from "@/components/clients/ClientProfileForm";
import type { Ga4Property } from "@/lib/ga4-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: encoded } = await params;
  const gscSite = decodeURIComponent(encoded);

  const [profile, globalRules] = await Promise.all([getClientProfile(gscSite), getGlobalContentRules()]);

  // El listado de propiedades GA4 es opcional: si la cuenta todavía no tiene el scope de
  // Analytics (o falla la API), el perfil sigue siendo editable y se muestra el motivo.
  let ga4Properties: Ga4Property[] = [];
  let ga4Error: string | null = null;
  try {
    ga4Properties = await getGa4Properties();
  } catch (err) {
    ga4Error = err instanceof Error ? err.message : String(err);
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition">
          <ChevronLeft className="w-4 h-4" /> Volver a clientes
        </Link>
        <div className="rounded-lg border border-danger bg-surface p-6 text-sm text-danger">Cliente no encontrado.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition">
        <ChevronLeft className="w-4 h-4" /> Volver a clientes
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">{profile.clientName}</h1>
        <p className="text-sm text-muted">
          {profile.industry || "sin rubro definido"} · {profile.gscSite}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClientProfileForm profile={profile} ga4Properties={ga4Properties} ga4Error={ga4Error} />
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 space-y-3 h-fit">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide">
            Reglas globales de contenido
          </h2>
          <p className="text-xs text-muted">
            Aplican a todos los clientes salvo que el perfil de arriba las sobreescriba. Se editan
            en <code className="text-accent">core/store/client-profiles.js</code>.
          </p>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="text-muted">Idioma</dt>
              <dd className="text-text">{globalRules.language}</dd>
            </div>
            <div>
              <dt className="text-muted">Extensión</dt>
              <dd className="text-text">
                {globalRules.wordCountRange[0]}–{globalRules.wordCountRange[1]} palabras
              </dd>
            </div>
            <div>
              <dt className="text-muted">Balance SEO/AEO</dt>
              <dd className="text-text">
                {globalRules.seoAeoBalance.seo}% SEO / {globalRules.seoAeoBalance.aeo}% AEO
              </dd>
            </div>
            <div>
              <dt className="text-muted">Estructura</dt>
              <dd className="text-text">
                <ul className="list-disc pl-4 space-y-0.5">
                  {globalRules.structure.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt className="text-muted">Estilo</dt>
              <dd className="text-text">
                <ul className="list-disc pl-4 space-y-0.5">
                  {globalRules.style.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt className="text-muted">Restricciones</dt>
              <dd className="text-text">
                <ul className="list-disc pl-4 space-y-0.5">
                  {globalRules.restrictions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt className="text-muted">CTA</dt>
              <dd className="text-text">{globalRules.cta}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
