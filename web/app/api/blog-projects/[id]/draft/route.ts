import { NextResponse } from "next/server";
import { generateProjectDraft, saveProjectDraft } from "@/lib/blog-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
// El Writer genera 1000+ palabras en una sola llamada a Gemini — es la llamada más larga de la app.
export const maxDuration = 150;

// POST: genera (o regenera) el artículo con el Writer.
export const POST = withAuth(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const project = await generateProjectDraft(id);
    return NextResponse.json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isClientError = /keyword principal|no encontrado/i.test(message);
    return NextResponse.json({ error: message }, { status: isClientError ? 400 : 502 });
  }
});

// PATCH: guarda ediciones manuales de la preview (contenido Markdown, título, meta, slug).
export const PATCH = withAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const body = await req.json();
    const allowed = ["content", "title", "metaTitle", "metaDescription", "slug", "suggestedImageConcept"] as const;
    const patch: Record<string, string> = {};
    for (const key of allowed) {
      if (typeof body[key] === "string") patch[key] = body[key];
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nada para guardar" }, { status: 400 });
    }
    const project = await saveProjectDraft(id, patch);
    return NextResponse.json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
