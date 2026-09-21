"use client";

import { useState } from "react";
import { Globe, MousePointerClick, Smartphone, Activity } from "lucide-react";
import type { Ga4Overview as Ga4OverviewData } from "@/lib/ga4-types";
import { Delta } from "@/components/Delta";
import { formatNumber, formatPercent } from "@/lib/format";
import { formatDuration, shortenPath, formatGa4Date } from "@/lib/ga4-format";

type Tab = "landing" | "channels" | "devices" | "events";

const TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: "landing", label: "Landing pages", icon: Globe },
  { id: "channels", label: "Canales", icon: Activity },
  { id: "devices", label: "Dispositivos", icon: Smartphone },
  { id: "events", label: "Key events", icon: MousePointerClick },
];

export function Ga4Overview({ data }: { data: Ga4OverviewData }) {
  const [tab, setTab] = useState<Tab>("landing");
  const t = data.totals;

  const counts: Record<Tab, number> = {
    landing: data.landingPages.length,
    channels: data.channels.length,
    devices: data.devices.length,
    events: data.keyEventsByName.length,
  };

  const maxDaily = Math.max(1, ...data.daily.map((d) => d.sessions));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Sesiones" value={formatNumber(t.current.sessions)} deltaPrev={t.deltaPrev.sessions} deltaYoY={t.deltaYoY.sessions} />
        <Kpi label="Usuarios" value={formatNumber(t.current.totalUsers)} deltaPrev={t.deltaPrev.totalUsers} deltaYoY={t.deltaYoY.totalUsers} />
        <Kpi
          label="Sesiones con engagement"
          value={formatNumber(t.current.engagedSessions)}
          deltaPrev={t.deltaPrev.engagedSessions}
          deltaYoY={t.deltaYoY.engagedSessions}
        />
        <Kpi
          label="Tasa de engagement"
          value={formatPercent(t.current.engagementRate, 1)}
          deltaPrev={t.deltaPrev.engagementRate}
          deltaYoY={t.deltaYoY.engagementRate}
          deltaType="percent"
        />
        <Kpi
          label="Tiempo medio"
          value={formatDuration(t.current.avgEngagementTime)}
          deltaPrev={t.deltaPrev.avgEngagementTime}
          deltaYoY={t.deltaYoY.avgEngagementTime}
        />
        <Kpi label="Key events" value={formatNumber(t.current.keyEvents)} deltaPrev={t.deltaPrev.keyEvents} deltaYoY={t.deltaYoY.keyEvents} />
      </div>

      {data.daily.length > 1 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs text-muted uppercase tracking-wide mb-3">Sesiones por día</div>
          <div className="flex items-end gap-[2px] h-24">
            {data.daily.map((d) => (
              <div
                key={d.date}
                title={`${formatGa4Date(d.date)}: ${d.sessions} sesiones · ${d.keyEvents} key events`}
                className="flex-1 bg-accent/60 hover:bg-accent rounded-t transition min-w-[2px]"
                style={{ height: `${Math.max(2, (d.sessions / maxDaily) * 100)}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted mt-1">
            <span>{formatGa4Date(data.daily[0].date)}</span>
            <span>{formatGa4Date(data.daily[data.daily.length - 1].date)}</span>
          </div>
        </div>
      )}

      <div>
        <div className="flex flex-wrap gap-1 border-b border-border mb-4">
          {TABS.map((tb) => {
            const Icon = tb.icon;
            const isActive = tab === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                  isActive ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tb.label}
                <span className={`text-xs px-1.5 py-0.5 rounded ${isActive ? "bg-accent/20 text-accent" : "bg-bg text-muted"}`}>
                  {counts[tb.id]}
                </span>
              </button>
            );
          })}
        </div>

        {tab === "landing" && (
          <Table
            headers={["Landing page", "Sesiones", "Engagement", "Tasa", "Tiempo", "Key events"]}
            rows={data.landingPages.map((r) => [
              <span key="p" className="font-mono text-xs text-text" title={r.page}>
                {shortenPath(r.page)}
              </span>,
              formatNumber(r.sessions),
              formatNumber(r.engagedSessions),
              formatPercent(r.engagementRate, 1),
              formatDuration(r.avgEngagementTime),
              formatNumber(r.keyEvents),
            ])}
          />
        )}
        {tab === "channels" && (
          <Table
            headers={["Canal", "Sesiones", "Engagement", "Tasa", "Key events"]}
            rows={data.channels.map((r) => [
              <span key="c" className="text-text">{r.channel}</span>,
              formatNumber(r.sessions),
              formatNumber(r.engagedSessions),
              formatPercent(r.engagementRate, 1),
              formatNumber(r.keyEvents),
            ])}
          />
        )}
        {tab === "devices" && (
          <Table
            headers={["Dispositivo", "Sesiones", "Tasa de engagement", "Key events"]}
            rows={data.devices.map((r) => [
              <span key="d" className="text-text capitalize">{r.device}</span>,
              formatNumber(r.sessions),
              formatPercent(r.engagementRate, 1),
              formatNumber(r.keyEvents),
            ])}
          />
        )}
        {tab === "events" &&
          (data.keyEventsByName.length === 0 ? (
            <div className="text-sm text-muted py-4">
              Esta propiedad no reporta key events por nombre en el período (o no tiene key events configurados en GA4).
            </div>
          ) : (
            <Table
              headers={["Key event", "Cantidad"]}
              rows={data.keyEventsByName.map((r) => [
                <span key="e" className="font-mono text-xs text-text">{r.eventName}</span>,
                formatNumber(r.count),
              ])}
            />
          ))}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  deltaPrev,
  deltaYoY,
  deltaType = "number",
}: {
  label: string;
  value: string;
  deltaPrev: number;
  deltaYoY: number;
  deltaType?: "number" | "percent";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="text-lg font-semibold text-text mb-2">{value}</div>
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted w-12">vs prev</span>
          <Delta value={deltaPrev} type={deltaType} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted w-12">vs YoY</span>
          <Delta value={deltaYoY} type={deltaType} />
        </div>
      </div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) return <div className="text-sm text-muted py-4">Sin datos para el período.</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted">
            {headers.map((h, i) => (
              <th key={h} className={`px-4 py-3 font-medium ${i === 0 ? "text-left" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/40">
              {cells.map((c, j) => (
                <td key={j} className={`px-4 py-3 ${j === 0 ? "text-left" : "text-right text-muted"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
