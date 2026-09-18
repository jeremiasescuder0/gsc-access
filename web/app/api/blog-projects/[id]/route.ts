import { NextResponse } from "next/server";
import { getBlogProject, updateBlogProject } from "@/lib/blog-data";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const project = await getBlogProject(id);
    if (!project) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const patch = await req.json();
    const project = await updateBlogProject(id, patch);
    return NextResponse.json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
