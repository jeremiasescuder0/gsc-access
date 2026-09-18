"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CONTENT_TYPE_LABELS, type ContentType } from "@/lib/blog-types";

const CONTENT_TYPES = Object.keys(CONTENT_TYPE_LABELS) as ContentType[];

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function NewBlogProjectForm({
  clients,
}: {
  clients: { gscSite: string; clientName: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientSite, setClientSite] = useState(clients[0]?.gscSite || "");
  const [workingTitle, setWorkingTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [targetService, setTargetService] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [searchIntent, setSearchIntent] = useState("");
  const [contentType, setContentType] = useState<ContentType | "">("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [questionKeywords, setQuestionKeywords] = useState("");
  const [semanticKeywords, setSemanticKeywords] = useState("");
  const [opportunityReason, setOpportunityReason] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientSite) {
      setError("Elegí un cliente");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/blog-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSite,
          workingTitle: workingTitle || null,
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
      if (!res.ok) throw new Error(data.error || "No se pudo crear el Blog Project");
      router.push(`/blog-projects/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Field label="Cliente" required>
        <select
          value={clientSite}
          onChange={(e) => setClientSite(e.target.value)}
          className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
        >
          {clients.map((c) => (
            <option key={c.gscSite} value={c.gscSite}>
              {c.clientName}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Working title">
        <Input value={workingTitle} onChange={setWorkingTitle} placeholder="Título de trabajo, se puede cambiar después" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Servicio target">
          <Input value={targetService} onChange={setTargetService} />
        </Field>
        <Field label="Ubicación target">
          <Input value={targetLocation} onChange={setTargetLocation} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Audiencia">
          <Input value={targetAudience} onChange={setTargetAudience} />
        </Field>
        <Field label="Intención de búsqueda">
          <Input value={searchIntent} onChange={setSearchIntent} placeholder="informational, commercial, ..." />
        </Field>
      </div>

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

      <Field label="Por qué es una oportunidad" hint="evidencia/razón manual — el motor de oportunidades automático llega en una fase siguiente">
        <textarea
          value={opportunityReason}
          onChange={(e) => setOpportunityReason(e.target.value)}
          rows={3}
          className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
        />
      </Field>

      {error && <div className="text-sm text-danger">{error}</div>}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded bg-accent text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Crear Blog Project
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted uppercase tracking-wide">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
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
