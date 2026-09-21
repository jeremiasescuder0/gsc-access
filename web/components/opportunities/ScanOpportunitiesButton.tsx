"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

export function ScanOpportunitiesButton({ clientSite }: { clientSite: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function scan() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientSite)}/opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo escanear oportunidades");
      if (data.insufficientData) setMessage(data.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={scan}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-2 rounded bg-accent text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        Escanear oportunidades
      </button>
      {error && <div className="text-xs text-danger">{error}</div>}
      {message && <div className="text-xs text-warning">{message}</div>}
    </div>
  );
}
