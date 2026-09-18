"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { CONTENT_TYPE_LABELS, type BlogProject, type ContentType } from "@/lib/blog-types";

const CONTENT_TYPES = Object.keys(CONTENT_TYPE_LABELS) as ContentType[];

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function EditBlogProjectForm({ project }: { project: BlogProject }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workingTitle, setWorkingTitle] = useState(project.workingTitle || "");
  const [title, setTitle] = useState(project.title || "");
  const [topic, setTopic] = useState(project.topic || "");
  const [targetService, setTargetService] = useState(project.targetService || "");
  const [targetLocation, setTargetLocation] = useState(project.targetLocation || "");
  const [targetAudience, setTargetAudience] = useState(project.targetAudience || "");
  const [searchIntent, setSearchIntent] = useState(project.searchIntent || "");
  const [contentType, setContentType] = useState<ContentType | "">(project.contentType || "");
  const [primaryKeyword, setPrimaryKeyword] = useState(project.primaryKeyword || "");
  const [secondaryKeywords, setSecondaryKeywords] = useState(project.secondaryKeywords.join(", "));
  const [questionKeywords, setQuestionKeywords] = useState(project.questionKeywords.join(", "));
  const [semanticKeywords, setSemanticKeywords] = useState(project.semanticKeywords.join(", "));
  const [opportunityReason, setOpportunityReason] = useState(project.opportunityReason || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/blog-projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingTitle: workingTitle || null,
          title: title || null,
          topic: topic || null,
          targetService: targetService || null,
          targetLocation: targetLocation || null,
          targetAudience: targetAudience || null,
          searchIntent: searchIntent || null,
          contentType: contentType || null,
          primaryKeyword: primaryKeyword || null,
          secondaryKeywords: splitList(secondaryKeywords),
          questionKeywords: splitList(questionKeywords),
          semanticKeywords: splitList(semanticKeywords),
          opportunityReason: opportunityReason || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
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
      <Section title="Datos del proyecto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Working title">
            <Input value={workingTitle} onChange={setWorkingTitle} />
          </Field>
          <Field label="Título final">
            <Input value={title} onChange={setTitle} placeholder="Se define al aprobar el draft" />
          </Field>
          <Field label="Tema">
            <Input value={topic} onChange={setTopic} />
          </Field>
          <Field label="Tipo de contenido recomendado">
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
            >
              <option value="">Sin definir</option>
              {CONTENT_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {CONTENT_TYPE_LABELS[ct]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Servicio target">
            <Input value={targetService} onChange={setTargetService} />
          </Field>
          <Field label="Ubicación target">
            <Input value={targetLocation} onChange={setTargetLocation} />
          </Field>
          <Field label="Audiencia">
            <Input value={targetAudience} onChange={setTargetAudience} />
          </Field>
          <Field label="Intención de búsqueda">
            <Input value={searchIntent} onChange={setSearchIntent} />
          </Field>
        </div>
      </Section>

      <Section title="Keywords">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Keyword principal">
            <Input value={primaryKeyword} onChange={setPrimaryKeyword} />
          </Field>
          <Field label="Keywords secundarias" hint="separadas por coma">
            <Input value={secondaryKeywords} onChange={setSecondaryKeywords} />
          </Field>
          <Field label="Keywords tipo pregunta" hint="separadas por coma">
            <Input value={questionKeywords} onChange={setQuestionKeywords} />
          </Field>
          <Field label="Keywords semánticas / soporte" hint="separadas por coma">
            <Input value={semanticKeywords} onChange={setSemanticKeywords} />
          </Field>
        </div>
      </Section>

      <Section title="Oportunidad">
        <Field label="Por qué es una oportunidad" hint="evidencia/razón — editable a mano hasta que el motor automático esté disponible">
          <textarea
            value={opportunityReason}
            onChange={(e) => setOpportunityReason(e.target.value)}
            rows={3}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
          />
        </Field>
      </Section>

      {error && <div className="text-sm text-danger">{error}</div>}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded bg-accent text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saved && <Check className="w-4 h-4" />}
        Guardar cambios
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
      <h2 className="text-sm font-medium text-muted uppercase tracking-wide">{title}</h2>
      {children}
    </div>
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
