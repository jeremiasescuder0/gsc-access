"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileEdit, Eye, Loader2, Check, RefreshCw, Sparkles, AlertTriangle } from "lucide-react";
import type { BlogProject, BlogDraft } from "@/lib/blog-types";
import { ArticlePreview } from "./ArticlePreview";

type Mode = "preview" | "edit";

function countWords(markdown: string) {
  return markdown
    .replace(/^#+\s+/gm, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function DraftPanel({ project }: { project: BlogProject }) {
  const router = useRouter();
  const [draft, setDraft] = useState<BlogDraft>(project.draft);
  const [mode, setMode] = useState<Mode>("preview");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos editables — estado local hasta que se guarda.
  const [content, setContent] = useState(project.draft?.content || "");
  const [metaTitle, setMetaTitle] = useState(project.draft?.metaTitle || "");
  const [metaDescription, setMetaDescription] = useState(project.draft?.metaDescription || "");
  const [slug, setSlug] = useState(project.draft?.slug || "");
  const [imageConcept, setImageConcept] = useState(project.draft?.suggestedImageConcept || "");

  const dirty =
    !!draft &&
    (content !== draft.content ||
      metaTitle !== draft.metaTitle ||
      metaDescription !== draft.metaDescription ||
      slug !== draft.slug ||
      imageConcept !== draft.suggestedImageConcept);

  function loadDraftIntoForm(d: NonNullable<BlogDraft>) {
    setDraft(d);
    setContent(d.content);
    setMetaTitle(d.metaTitle);
    setMetaDescription(d.metaDescription);
    setSlug(d.slug);
    setImageConcept(d.suggestedImageConcept);
  }

  async function generate() {
    if (draft && dirty && !confirm("Tenés cambios sin guardar. ¿Regenerar igual y descartarlos?")) return;
    if (draft && !confirm("Se va a generar una versión nueva. La actual queda guardada en el historial. ¿Seguir?")) return;
    setGenerating(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/blog-projects/${project.id}/draft`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo generar el artículo");
      if (data.draft) loadDraftIntoForm(data.draft);
      setMode("preview");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // El H1 del Markdown es la fuente de verdad del título.
      const h1 = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
      const res = await fetch(`/api/blog-projects/${project.id}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          title: h1 || draft?.title || "",
          metaTitle,
          metaDescription,
          slug,
          suggestedImageConcept: imageConcept,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      if (data.draft) loadDraftIntoForm(data.draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const words = countWords(content);

  if (!draft) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 space-y-3">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide flex items-center gap-1.5">
          <FileEdit className="w-4 h-4" />
          Artículo
        </h2>
        <p className="text-sm text-muted">
          Genera el blog completo en inglés con Gemini a partir de las keywords y la evidencia de este
          proyecto, las reglas globales de contenido y el perfil del cliente. Después lo podés editar
          acá mismo antes de mandarlo a revisión.
        </p>
        {!project.primaryKeyword && (
          <div className="flex items-start gap-2 text-xs text-warning">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            El proyecto no tiene keyword principal todavía. Cargala en el formulario o usá &quot;Investigar
            keywords&quot; antes de generar.
          </div>
        )}
        {error && <div className="text-sm text-danger">{error}</div>}
        <button
          onClick={generate}
          disabled={generating || !project.primaryKeyword}
          className="flex items-center gap-2 px-4 py-2 rounded bg-accent text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Generando artículo (puede tardar un minuto)..." : "Generar blog con Gemini"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide flex items-center gap-1.5">
            <FileEdit className="w-4 h-4" />
            Artículo
          </h2>
          <div className="text-xs text-muted mt-1">
            v{draft.version} · {words} palabras · generado {new Date(draft.generatedAt).toLocaleString("es-AR")}
            {draft.editedAt ? ` · editado a mano ${new Date(draft.editedAt).toLocaleString("es-AR")}` : " · sin ediciones manuales"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-border overflow-hidden">
            <button
              onClick={() => setMode("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                mode === "preview" ? "bg-accent/10 text-accent" : "text-muted hover:text-text"
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Vista previa
            </button>
            <button
              onClick={() => setMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                mode === "edit" ? "bg-accent/10 text-accent" : "text-muted hover:text-text"
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" /> Editar
            </button>
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-muted hover:text-accent hover:bg-accent/10 disabled:opacity-50 transition"
            title="Genera una versión nueva; la actual queda en el historial"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Regenerar
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-danger">{error}</div>}

      {mode === "preview" ? (
        <div className="rounded-lg border border-border bg-bg p-6 md:p-8">
          <ArticlePreview markdown={content} />
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          className="w-full min-h-[600px] bg-bg border border-border rounded p-4 text-sm text-text font-mono leading-6 focus:outline-none focus:border-accent"
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
        <Field label="Meta title" hint={`${metaTitle.length}/60`} warn={metaTitle.length > 60}>
          <input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
          />
        </Field>
        <Field label="Slug">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-accent"
          />
        </Field>
        <Field label="Meta description" hint={`${metaDescription.length}/160`} warn={metaDescription.length > 160}>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={3}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
          />
        </Field>
        <Field label="Concepto de imagen destacada">
          <textarea
            value={imageConcept}
            onChange={(e) => setImageConcept(e.target.value)}
            rows={3}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
          />
        </Field>
      </div>

      {draft.suggestedInternalLinks.length > 0 && (
        <div className="text-xs">
          <div className="text-muted uppercase tracking-wide font-medium mb-1">Links internos sugeridos</div>
          <ul className="space-y-0.5">
            {draft.suggestedInternalLinks.map((l, i) => (
              <li key={i} className="text-muted">
                <span className="text-text">{l.anchor || "(sin ancla)"}</span> → {l.url}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-4 py-2 rounded bg-accent text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saved && <Check className="w-4 h-4" />}
          Guardar cambios
        </button>
        {dirty && <span className="text-xs text-warning">Cambios sin guardar</span>}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  warn,
  children,
}: {
  label: string;
  hint?: string;
  warn?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted uppercase tracking-wide">{label}</label>
        {hint && <span className={`text-xs ${warn ? "text-warning" : "text-muted"}`}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
