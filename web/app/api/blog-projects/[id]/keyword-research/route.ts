import { NextResponse } from "next/server";
import { getBlogProject, updateBlogProject, researchProjectKeywords } from "@/lib/blog-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
// El clustering hace 1 llamada a Gemini sobre hasta 50 queries — puede tardar más que el
// default de Next en instancias frías.
export const maxDuration = 90;

export const POST = withAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const project = await getBlogProject(id);
    if (!project) return NextResponse.json({ error: "Blog Project no encontrado" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const periodDays = Number(body.periodDays) || undefined;

    const result = await researchProjectKeywords(project, periodDays);

    // Guardamos en evidence.keywordResearch (NO en evidence.gsc/gemini — esos son la evidencia
    // de ORIGEN del proyecto, con otra forma, y vienen de convertir una Opportunity si aplica).
    // Mezclarlos rompía el panel cuando el proyecto nacía de una Opportunity.
    const updated = await updateBlogProject(id, {
      evidence: {
        ...project.evidence,
        keywordResearch: { gsc: result.evidenceGsc, gemini: result.evidenceGemini },
      },
    });

    return NextResponse.json({
      project: updated,
      insufficientData: result.insufficientData,
      message: result.message || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // 502: la falla es de un servicio externo (GSC o Gemini), no del pedido en sí.
    return NextResponse.json({ error: message }, { status: 502 });
  }
});
