import { NextResponse } from "next/server";
import { getBlogProject, updateBlogProject, researchProjectKeywords } from "@/lib/blog-data";

export const dynamic = "force-dynamic";
// El clustering hace 1 llamada a Gemini sobre hasta 50 queries — puede tardar más que el
// default de Next en instancias frías.
export const maxDuration = 90;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const project = await getBlogProject(id);
    if (!project) return NextResponse.json({ error: "Blog Project no encontrado" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const periodDays = Number(body.periodDays) || undefined;

    const result = await researchProjectKeywords(project, periodDays);

    // Guardamos la evidencia (GSC + interpretación de Gemini) aunque el usuario todavía no haya
    // decidido aplicar las keywords sugeridas — así queda el rastro de qué se investigó y cuándo.
    const updated = await updateBlogProject(id, {
      evidence: {
        ...project.evidence,
        gsc: result.evidenceGsc,
        gemini: result.evidenceGemini,
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
}
