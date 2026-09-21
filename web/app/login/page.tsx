import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Si ya hay sesión válida, no tiene sentido mostrar el form de nuevo.
  const session = await getCurrentSession();
  if (session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Sparkles className="w-8 h-8 text-accent" />
          <h1 className="text-xl font-semibold tracking-tight text-text">Insights</h1>
          <p className="text-sm text-muted">Ingresá para continuar</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
