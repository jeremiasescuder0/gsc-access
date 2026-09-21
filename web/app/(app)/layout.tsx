import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Nav } from "@/components/Nav";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getCurrentSession } from "@/lib/auth/session";

// Chequeo AUTORITATIVO — corre en Node.js runtime, valida contra el store de sesiones (no
// confía en la sola presencia de la cookie como hace el middleware). Cubre todas las páginas
// privadas de una sola vez porque todas viven bajo este route group; /login queda afuera.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-text hover:text-accent transition shrink-0"
          >
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="font-semibold tracking-tight">Insights</span>
          </Link>
          <Nav />
          <div className="flex items-center gap-4">
            <div className="text-xs text-muted hidden md:block">Gemini 2.5 Flash</div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </>
  );
}
