"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Loader2, Check, Pencil } from "lucide-react";
import type { ContentInventory, ContentInventoryItem } from "@/lib/blog-types";
import { formatNumber, formatPercent, formatPosition } from "@/lib/format";

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

export function ContentInventoryPanel({ siteUrl }: { siteUrl: string }) {
  const [inventory, setInventory] = useState<ContentInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encoded = encodeURIComponent(siteUrl);

  const load = useCallback(
    async (sync: boolean) => {
      sync ? setSyncing(true) : setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/organic/${encoded}/inventory${sync ? "?sync=1" : ""}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo cargar el inventario");
        setInventory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [encoded]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  async function saveItem(url: string, patch: Partial<ContentInventoryItem>) {
    const res = await fetch(`/api/organic/${encoded}/inventory`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, patch }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo guardar");
    setInventory(data);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando inventario...
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-danger py-2">{error}</div>;
  }

  const items = inventory?.items || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted">
          {inventory?.syncedAt
            ? `Sincronizado ${new Date(inventory.syncedAt).toLocaleString("es-AR")} · ${items.length} URLs`
            : "Sin sincronizar todavía"}
        </div>
        <button
          onClick={() => load(true)}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 transition"
        >
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Sincronizar desde GSC
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-muted py-4">
          Sin URLs todavía. Usá &quot;Sincronizar desde GSC&quot; para poblar el inventario con las
          páginas que Google ya indexó (últimos 90 días).
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-3 py-2 font-medium">URL</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Tema / keyword</th>
                <th className="px-3 py-2 font-medium text-right">Clicks</th>
                <th className="px-3 py-2 font-medium text-right">Impr.</th>
                <th className="px-3 py-2 font-medium text-right">CTR</th>
                <th className="px-3 py-2 font-medium text-right">Pos.</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <InventoryRow key={item.url} item={item} onSave={(patch) => saveItem(item.url, patch)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InventoryRow({
  item,
  onSave,
}: {
  item: ContentInventoryItem;
  onSave: (patch: Partial<ContentInventoryItem>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pageType, setPageType] = useState(item.pageType);
  const [mainTopic, setMainTopic] = useState(item.mainTopic || "");
  const [primaryKeyword, setPrimaryKeyword] = useState(item.primaryKeyword || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ pageType, mainTopic: mainTopic || null, primaryKeyword: primaryKeyword || null });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const metrics = item.gscMetrics;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-bg/40 align-top">
      <td className="px-3 py-2 max-w-[220px]">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text hover:text-accent transition truncate inline-block max-w-full"
          title={item.url}
        >
          {shortenUrl(item.url)}
        </a>
        {metrics?.stale && <div className="text-muted mt-0.5">sin tráfico reciente</div>}
      </td>
      <td className="px-3 py-2">
        {editing ? (
          <input
            value={pageType}
            onChange={(e) => setPageType(e.target.value)}
            className="w-24 bg-bg border border-border rounded px-1.5 py-1 text-text focus:outline-none focus:border-accent"
          />
        ) : (
          <span className="text-muted">{item.pageType}</span>
        )}
      </td>
      <td className="px-3 py-2 min-w-[180px]">
        {editing ? (
          <div className="space-y-1">
            <input
              value={mainTopic}
              onChange={(e) => setMainTopic(e.target.value)}
              placeholder="tema"
              className="w-full bg-bg border border-border rounded px-1.5 py-1 text-text focus:outline-none focus:border-accent"
            />
            <input
              value={primaryKeyword}
              onChange={(e) => setPrimaryKeyword(e.target.value)}
              placeholder="keyword principal"
              className="w-full bg-bg border border-border rounded px-1.5 py-1 text-text focus:outline-none focus:border-accent"
            />
          </div>
        ) : (
          <div>
            <div className="text-text">{item.mainTopic || "—"}</div>
            {item.primaryKeyword && <div className="text-accent">{item.primaryKeyword}</div>}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right text-muted">{metrics ? formatNumber(metrics.clicks) : "—"}</td>
      <td className="px-3 py-2 text-right text-muted">{metrics ? formatNumber(metrics.impressions) : "—"}</td>
      <td className="px-3 py-2 text-right text-muted">{metrics ? formatPercent(metrics.ctr) : "—"}</td>
      <td className="px-3 py-2 text-right text-muted">{metrics ? formatPosition(metrics.position) : "—"}</td>
      <td className="px-3 py-2 text-right">
        {editing ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-accent hover:underline disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Guardar"}
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="text-muted hover:text-accent transition">
            {saved ? <Check className="w-3.5 h-3.5 text-success" /> : <Pencil className="w-3.5 h-3.5" />}
          </button>
        )}
      </td>
    </tr>
  );
}
