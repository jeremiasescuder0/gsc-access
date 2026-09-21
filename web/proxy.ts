import { NextResponse, type NextRequest } from "next/server";

// Chequeo LIVIANO de sólo presencia de cookie — corre en Edge Runtime, sin acceso a
// filesystem/KV. NO es la autoridad de seguridad: sólo da un redirect rápido para mejor UX
// antes de renderizar nada. La validación real (¿la sesión existe en el store? ¿no expiró?)
// pasa en Node.js runtime en web/app/(app)/layout.tsx (páginas) y en withAuth() (API) — ver
// web/lib/auth/session.ts. Esto evita depender de Edge Runtime para la verificación
// autoritativa, que en local usa el backend de archivos (sin fs en Edge) y en producción KV.
const SESSION_COOKIE_NAME = "session_id";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!hasCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Todo salvo assets estáticos de Next y el favicon.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
