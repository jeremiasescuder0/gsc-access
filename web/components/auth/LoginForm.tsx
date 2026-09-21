"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

type Status = "idle" | "submitting" | "error";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting") return; // evita múltiples requests si se clickea/entera rápido
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Usuario o contraseña incorrectos.");
        setStatus("error");
        return;
      }

      // Redirect duro: fuerza que el (app) layout vuelva a correr el chequeo de sesión server-side.
      window.location.href = "/";
    } catch {
      setError("No se pudo conectar. Reintentá.");
      setStatus("error");
    }
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="username" className="text-xs font-medium text-muted uppercase tracking-wide">
          Usuario
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={submitting}
          className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text placeholder-muted focus:outline-none focus:border-accent disabled:opacity-60"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-medium text-muted uppercase tracking-wide">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text placeholder-muted focus:outline-none focus:border-accent disabled:opacity-60"
        />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 text-sm text-danger">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-accent text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
