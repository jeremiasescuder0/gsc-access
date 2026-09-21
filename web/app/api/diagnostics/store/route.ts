import { NextResponse } from "next/server";
import { runStoreSelfTest } from "@/lib/blog-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";

// Ida y vuelta real de escritura/lectura/borrado contra el backend de datos activo (Vercel KV o
// archivos locales). Pensada para confirmar después de un deploy que KV_REST_API_URL /
// KV_REST_API_TOKEN están bien conectadas, sin tener que adivinar mirando logs de Vercel.
export const GET = withAuth(async () => {
  try {
    const result = await runStoreSelfTest();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
