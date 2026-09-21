import { NextResponse } from "next/server";
import { convertOpportunityToBlogProject } from "@/lib/blog-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const project = await convertOpportunityToBlogProject(id);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
