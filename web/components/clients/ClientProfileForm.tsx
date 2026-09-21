"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import type { ClientContentProfile } from "@/lib/blog-types";
import type { Ga4Property } from "@/lib/ga4-types";

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ClientProfileForm({
  profile,
  ga4Properties,
  ga4Error,
}: {
  profile: ClientContentProfile;
  ga4Properties: Ga4Property[];
  ga4Error: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ga4PropertyId, setGa4PropertyId] = useState(profile.ga4PropertyId || "");
  const [ga4ConversionEvents, setGa4ConversionEvents] = useState((profile.ga4ConversionEvents || []).join(", "));
  const [brandName, setBrandName] = useState(profile.brandName);
  const [website, setWebsite] = useState(profile.website || "");
  const [primaryServices, setPrimaryServices] = useState(profile.primaryServices.join(", "));
  const [locations, setLocations] = useState(profile.locations.join(", "));
  const [targetAudience, setTargetAudience] = useState(profile.targetAudience || "");
  const [preferredTone, setPreferredTone] = useState(profile.preferredTone || "");
  const [minLength, setMinLength] = useState(profile.defaultArticleLength?.[0]?.toString() || "");
  const [maxLength, setMaxLength] = useState(profile.defaultArticleLength?.[1]?.toString() || "");
  const [wordsToAvoid, setWordsToAvoid] = useState(profile.wordsToAvoid.join(", "));
  const [claimsToAvoid, setClaimsToAvoid] = useState(profile.claimsToAvoid.join(", "));
  const [firstPersonPlural, setFirstPersonPlural] = useState(profile.firstPersonPlural);
  const [ctaStyle, setCtaStyle] = useState(profile.ctaStyle || "");
  const [contentRestrictions, setContentRestrictions] = useState(profile.contentRestrictions.join(", "));
  const [internalServicePages, setInternalServicePages] = useState(profile.internalServicePages.join(", "));
  const [otherInstructions, setOtherInstructions] = useState(profile.otherInstructions || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const min = minLength ? Number(minLength) : null;
      const max = maxLength ? Number(maxLength) : null;
      const res = await fetch(`/api/clients/${encodeURIComponent(profile.gscSite)}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          website: website || null,
          primaryServices: splitList(primaryServices),
          locations: splitList(locations),
          targetAudience: targetAudience || null,
          preferredTone: preferredTone || null,
          defaultArticleLength: min && max ? [min, max] : null,
          wordsToAvoid: splitList(wordsToAvoid),
          claimsToAvoid: splitList(claimsToAvoid),
          firstPersonPlural,
          ctaStyle: ctaStyle || null,
          contentRestrictions: splitList(contentRestrictions),
          internalServicePages: splitList(internalServicePages),
          otherInstructions: otherInstructions || null,
          ga4PropertyId: ga4PropertyId || null,
          ga4ConversionEvents: splitList(ga4ConversionEvents),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el perfil");
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-bg/40 p-4 space-y-4">
        <div className="text-xs font-medium text-muted uppercase tracking-wide">Google Analytics 4</div>
        <Field
          label="Propiedad GA4"
          hint={
            ga4Error
              ? `No se pudieron listar las propiedades: ${ga4Error}`
              : "Propiedades a las que tiene acceso la cuenta autenticada de la app"
          }
        >
          <select
            value={ga4PropertyId}
            onChange={(e) => setGa4PropertyId(e.target.value)}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
          >
            <option value="">Sin asignar</option>
            {ga4Properties.map((p) => (
              <option key={p.propertyId} value={p.propertyId}>
                {p.accountName} › {p.propertyName} ({p.propertyId})
              </option>
            ))}
            {ga4PropertyId && !ga4Properties.some((p) => p.propertyId === ga4PropertyId) && (
              <option value={ga4PropertyId}>{ga4PropertyId} (asignada, no visible en el listado actual)</option>
            )}
          </select>
        </Field>
        <Field label="Key events que cuentan como conversión" hint="nombres exactos de GA4 separados por coma, ej: generate_lead, form_submit, phone_click. Vacío = todos los key events">
          <Input value={ga4ConversionEvents} onChange={setGa4ConversionEvents} placeholder="generate_lead, form_submit" />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre de marca">
          <Input value={brandName} onChange={setBrandName} />
        </Field>
        <Field label="Website">
          <Input value={website} onChange={setWebsite} placeholder="https://..." />
        </Field>
      </div>

      <Field label="Servicios principales" hint="separados por coma">
        <Input value={primaryServices} onChange={setPrimaryServices} />
      </Field>

      <Field label="Ubicaciones" hint="separadas por coma">
        <Input value={locations} onChange={setLocations} />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Audiencia target">
          <Input value={targetAudience} onChange={setTargetAudience} />
        </Field>
        <Field label="Tono preferido">
          <Input value={preferredTone} onChange={setPreferredTone} placeholder="ej: cercano y profesional" />
        </Field>
      </div>

      <Field label="Extensión por defecto del artículo" hint="override de las reglas globales (800-1000) — dejar vacío para usar el default">
        <div className="flex items-center gap-2">
          <Input value={minLength} onChange={setMinLength} placeholder="min" />
          <span className="text-muted text-sm">–</span>
          <Input value={maxLength} onChange={setMaxLength} placeholder="max" />
          <span className="text-muted text-xs">palabras</span>
        </div>
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Palabras a evitar" hint="separadas por coma">
          <Input value={wordsToAvoid} onChange={setWordsToAvoid} />
        </Field>
        <Field label="Afirmaciones a evitar" hint="separadas por coma">
          <Input value={claimsToAvoid} onChange={setClaimsToAvoid} />
        </Field>
      </div>

      <Field label="CTA">
        <Input value={ctaStyle} onChange={setCtaStyle} placeholder="ej: agendar consulta, llamar ahora" />
      </Field>

      <Field label="Restricciones de contenido" hint="separadas por coma">
        <Input value={contentRestrictions} onChange={setContentRestrictions} />
      </Field>

      <Field label="Páginas de servicio internas" hint="URLs separadas por coma — usadas para linking interno">
        <Input value={internalServicePages} onChange={setInternalServicePages} />
      </Field>

      <Field label="Otras instrucciones">
        <textarea
          value={otherInstructions}
          onChange={(e) => setOtherInstructions(e.target.value)}
          rows={3}
          className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={firstPersonPlural}
          onChange={(e) => setFirstPersonPlural(e.target.checked)}
          className="accent-accent"
        />
        Permitir lenguaje en primera persona del plural (&quot;nosotros&quot;)
      </label>

      {error && <div className="text-sm text-danger">{error}</div>}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded bg-accent text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saved && <Check className="w-4 h-4" />}
        Guardar perfil
      </button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted uppercase tracking-wide">{label}</label>
      {children}
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text placeholder-muted focus:outline-none focus:border-accent"
    />
  );
}
