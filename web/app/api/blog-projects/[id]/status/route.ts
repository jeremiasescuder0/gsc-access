import { NextResponse } from "next/server";
import { transitionBlogProjectStatus } from "@/lib/blog-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const body = await req.json();
    if (!body.status) {
      return NextResponse.json({ error: "status es requerido" }, { status: 400 });
    }
    const project = await transitionBlogProjectStatus(id, body.status, body.note || "");
    return NextResponse.json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
