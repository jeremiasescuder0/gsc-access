import { NextResponse } from "next/server";
import { getGa4Properties } from "@/lib/ga4-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Propiedades GA4 a las que la cuenta autenticada tiene acceso — alimenta el selector del
// perfil del cliente para mapear cliente ↔ propiedad.
export const GET = withAuth(async () => {
  try {
    const properties = await getGa4Properties();
    return NextResponse.json({ properties });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const needsReauth = /insufficient|scope|permission|403/i.test(message);
    return NextResponse.json(
      {
        error: message,
        hint: needsReauth
          ? "La cuenta autenticada no tiene el scope de Analytics todavía. Corré `npm run auth` de nuevo y actualizá GOOGLE_REFRESH_TOKEN en Vercel."
          : undefined,
      },
      { status: 502 }
    );
  }
});
