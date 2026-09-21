import { NextResponse } from "next/server";
import { listBlogProjects, createBlogProject } from "@/lib/blog-data";
import type { BlogProjectStatus } from "@/lib/blog-types";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: Request) => {
  const url = new URL(req.url);
  const clientSite = url.searchParams.get("clientSite") || undefined;
  const status = (url.searchParams.get("status") as BlogProjectStatus | null) || undefined;

  try {
    const items = await listBlogProjects({ clientSite, status });
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (req: Request) => {
  try {
    const body = await req.json();
    if (!body.clientSite) {
      return NextResponse.json({ error: "clientSite es requerido" }, { status: 400 });
    }
    const project = await createBlogProject(body);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
