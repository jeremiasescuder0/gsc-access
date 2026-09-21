"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Redirect duro (no router.push) para descartar cualquier estado de cliente en memoria.
      window.location.href = "/login";
    }
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs text-muted hover:text-danger transition disabled:opacity-50"
      aria-label="Cerrar sesión"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
      Salir
    </button>
  );
}
