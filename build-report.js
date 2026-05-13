const fs = require("fs");
const path = require("path");

// ─── Utilidades ───────────────────────────────────────────────────────────────

const escape = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));

const fmtMoney = (n, currency = "USD") => {
  const v = Number(n) || 0;
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
};

const fmtInt = (n) => new Intl.NumberFormat("es-AR").format(Math.round(Number(n) || 0));
const fmtPct = (n, digits = 2) => `${((Number(n) || 0) * 100).toFixed(digits)}%`;
const fmtPctRaw = (n, digits = 1) => `${(Number(n) || 0).toFixed(digits)}%`;
const fmtNum = (n, digits = 2) => (Number(n) || 0).toFixed(digits);

function classifyCtr(ctr) {
  const v = Number(ctr) || 0;
  if (v >= 0.03) return "good";
  if (v >= 0.01) return "warn";
  return "bad";
}

function classifyRoas(roas) {
  const v = Number(roas) || 0;
  if (v >= 200) return "good";
  if (v >= 100) return "warn";
  if (v > 0) return "bad";
  return "muted";
}

// ─── Markdown-ish renderer para los textos de Gemini ──────────────────────────

function formatInline(text) {
  return escape(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function isHeading(line) {
  if (/^\d+[\.\)]\s+[A-ZÁÉÍÓÚÑ]/.test(line)) return true;
  if (/^[A-ZÁÉÍÓÚÑ0-9\s\-:]{8,}$/.test(line) && line.length < 80) return true;
  if (/^#{1,6}\s+/.test(line)) return true;
  return false;
}

function formatAnalysis(text) {
  if (!text) return '<p class="empty">Sin análisis disponible.</p>';
  if (text.startsWith("⚠")) {
    return `<div class="error-banner">${escape(text)}</div>`;
  }

  const lines = text.split(/\r?\n/);
  let html = "";
  let inList = false;

  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }

    if (/^[-•*]\s+/.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${formatInline(line.replace(/^[-•*]\s+/, ""))}</li>`;
      continue;
    }

    closeList();

    if (isHeading(line)) {
      const clean = line.replace(/^#{1,6}\s+/, "");
      html += `<h4>${formatInline(clean)}</h4>`;
      continue;
    }

    html += `<p>${formatInline(line)}</p>`;
  }

  closeList();
  return html || '<p class="empty">Sin contenido.</p>';
}

const ANOMALY_TYPES = {
  CTR_BAJO: { label: "CTR bajo", color: "warn" },
  CPA_ALTO: { label: "CPA alto", color: "bad" },
  ROAS_NEGATIVO: { label: "ROAS negativo", color: "bad" },
  SEARCH_TERM_IRRELEVANTE: { label: "Search term irrelevante", color: "warn" },
  PRESUPUESTO_LIMITADO: { label: "Presupuesto limitado", color: "info" },
  IMPRESSION_SHARE_BAJO: { label: "Impression share bajo", color: "warn" },
};

const IMPACT_CLASS = { alto: "bad", medio: "warn", bajo: "info" };

function formatAnomalies(text) {
  if (!text) return '<p class="empty">Sin análisis disponible.</p>';
  if (text.startsWith("⚠")) return `<div class="error-banner">${escape(text)}</div>`;
  if (/^sin anomal[ií]as detectadas\.?$/i.test(text.trim())) {
    return `<div class="no-anomalies"><span class="dot"></span> Sin anomalías detectadas en los últimos 30 días.</div>`;
  }

  const blocks = text.split(/\n(?=\s*ANOMAL[IÍ]A\s*#?\s*\d+)/i).filter((b) => /ANOMAL[IÍ]A/i.test(b));

  if (blocks.length === 0) {
    return `<div class="anomaly-fallback">${formatAnalysis(text)}</div>`;
  }

  const cards = blocks.map((block) => {
    const lines = block.split(/\r?\n/);
    const headerLine = lines.find((l) => /ANOMAL[IÍ]A/i.test(l)) || "ANOMALÍA";
    const fields = {};
    for (const line of lines) {
      const m = line.match(/^\s*[-•*]?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?):\s*(.+)$/);
      if (m) {
        fields[m[1].trim().toLowerCase()] = m[2].trim();
      }
    }

    const tipo = (fields["tipo"] || "").toUpperCase().replace(/[^A-Z_]/g, "");
    const meta = ANOMALY_TYPES[tipo] || { label: tipo || "Anomalía", color: "warn" };
    const impactoRaw = (fields["impacto"] || "").toLowerCase();
    const impactoClass = IMPACT_CLASS[impactoRaw] || "muted";

    return `
      <article class="anomaly-card border-${meta.color}">
        <header>
          <span class="badge badge-${meta.color}">${escape(meta.label)}</span>
          ${impactoRaw ? `<span class="badge badge-impact-${impactoClass}">Impacto ${escape(impactoRaw)}</span>` : ""}
          <span class="anomaly-num">${escape(headerLine.trim())}</span>
        </header>
        <dl>
          ${
            fields["elemento afectado"]
              ? `<dt>Elemento</dt><dd>${escape(fields["elemento afectado"])}</dd>`
              : ""
          }
          ${
            fields["métrica observada"] || fields["metrica observada"]
              ? `<dt>Observado</dt><dd>${escape(fields["métrica observada"] || fields["metrica observada"])}</dd>`
              : ""
          }
          ${
            fields["umbral esperado"]
              ? `<dt>Esperado</dt><dd>${escape(fields["umbral esperado"])}</dd>`
              : ""
          }
        </dl>
        ${
          fields["acción concreta"] || fields["accion concreta"]
            ? `<div class="action"><span>Acción:</span> ${escape(fields["acción concreta"] || fields["accion concreta"])}</div>`
            : ""
        }
      </article>
    `;
  });

  return `<div class="anomaly-grid">${cards.join("")}</div>`;
}

// ─── Cálculos ─────────────────────────────────────────────────────────────────

function aggregateAccount(acct) {
  const camps = acct.campaigns || [];
  const cost = camps.reduce((s, c) => s + (c.cost || 0), 0);
  const clicks = camps.reduce((s, c) => s + (c.clicks || 0), 0);
  const impressions = camps.reduce((s, c) => s + (c.impressions || 0), 0);
  const conversions = camps.reduce((s, c) => s + (c.conversions || 0), 0);
  const conversionsValue = camps.reduce((s, c) => s + (c.conversionsValue || 0), 0);
  return {
    cost,
    clicks,
    impressions,
    conversions,
    conversionsValue,
    ctr: impressions ? clicks / impressions : 0,
    roas: cost ? (conversionsValue / cost) * 100 : 0,
    cpa: conversions ? cost / conversions : 0,
  };
}

function aggregatePortfolio(accounts) {
  const totals = {
    cost: 0,
    clicks: 0,
    impressions: 0,
    conversions: 0,
    conversionsValue: 0,
  };
  const currencies = new Set();
  for (const acct of accounts) {
    const a = aggregateAccount(acct);
    totals.cost += a.cost;
    totals.clicks += a.clicks;
    totals.impressions += a.impressions;
    totals.conversions += a.conversions;
    totals.conversionsValue += a.conversionsValue;
    if (acct.currency) currencies.add(acct.currency);
  }
  return {
    ...totals,
    ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
    roas: totals.cost ? (totals.conversionsValue / totals.cost) * 100 : 0,
    currency: currencies.size === 1 ? [...currencies][0] : null,
  };
}

// ─── Renderers ────────────────────────────────────────────────────────────────

function renderTable(headers, rows, opts = {}) {
  const ths = headers
    .map(
      (h) =>
        `<th class="${h.align || "left"} ${h.sortable === false ? "" : "sortable"}" data-key="${escape(h.key)}">${escape(
          h.label
        )}</th>`
    )
    .join("");

  if (!rows.length) {
    return `<div class="empty-table">Sin datos para este período.</div>`;
  }

  const trs = rows
    .map((row) => {
      const tds = headers
        .map((h) => {
          const cell = h.render ? h.render(row) : row[h.key];
          return `<td class="${h.align || "left"}">${cell ?? ""}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  return `
    <div class="table-wrap">
      <input type="search" class="table-filter" placeholder="Filtrar..." aria-label="Filtrar tabla">
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>
      ${opts.note ? `<p class="table-note">${escape(opts.note)}</p>` : ""}
    </div>
  `;
}

function renderCampaignsTable(account) {
  const cur = account.currency || "USD";
  const headers = [
    { key: "name", label: "Campaña", render: (r) => escape(r.name || "—") },
    {
      key: "channelType",
      label: "Tipo",
      render: (r) => `<span class="chip">${escape(r.channelType || "—")}</span>`,
    },
    { key: "impressions", label: "Impr.", align: "right", render: (r) => fmtInt(r.impressions) },
    { key: "clicks", label: "Clicks", align: "right", render: (r) => fmtInt(r.clicks) },
    {
      key: "ctr",
      label: "CTR",
      align: "right",
      render: (r) => `<span class="metric metric-${classifyCtr(r.ctr)}">${fmtPct(r.ctr)}</span>`,
    },
    {
      key: "cost",
      label: "Costo",
      align: "right",
      render: (r) => fmtMoney(r.cost, cur),
    },
    {
      key: "avgCpc",
      label: "CPC promedio",
      align: "right",
      render: (r) => fmtMoney(r.avgCpc, cur),
    },
    { key: "conversions", label: "Conv.", align: "right", render: (r) => fmtNum(r.conversions, 1) },
    {
      key: "conversionsValue",
      label: "Valor conv.",
      align: "right",
      render: (r) => fmtMoney(r.conversionsValue, cur),
    },
    {
      key: "roas",
      label: "ROAS",
      align: "right",
      render: (r) =>
        `<span class="metric metric-${classifyRoas(r.roas)}">${fmtPctRaw(r.roas, 0)}</span>`,
    },
    {
      key: "searchImpressionShare",
      label: "Impr. share",
      align: "right",
      render: (r) =>
        r.searchImpressionShare != null && r.searchImpressionShare !== ""
          ? fmtPct(r.searchImpressionShare, 1)
          : "—",
    },
  ];
  return renderTable(headers, account.campaigns || [], {
    note: "Top 20 campañas ordenadas por costo (últimos 30 días).",
  });
}

function renderSearchTermsTable(account) {
  const cur = account.currency || "USD";
  const headers = [
    {
      key: "searchTerm",
      label: "Search term",
      render: (r) => escape(r.searchTerm || "—"),
    },
    {
      key: "campaign",
      label: "Campaña",
      render: (r) => escape(r.campaign || "—"),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => `<span class="chip">${escape(r.status || "—")}</span>`,
    },
    { key: "impressions", label: "Impr.", align: "right", render: (r) => fmtInt(r.impressions) },
    { key: "clicks", label: "Clicks", align: "right", render: (r) => fmtInt(r.clicks) },
    {
      key: "ctr",
      label: "CTR",
      align: "right",
      render: (r) => `<span class="metric metric-${classifyCtr(r.ctr)}">${fmtPct(r.ctr)}</span>`,
    },
    {
      key: "cost",
      label: "Costo",
      align: "right",
      render: (r) => fmtMoney(r.cost, cur),
    },
    { key: "conversions", label: "Conv.", align: "right", render: (r) => fmtNum(r.conversions, 1) },
  ];
  return renderTable(headers, account.searchTerms || [], {
    note: "Top 30 search terms con más de 10 impresiones.",
  });
}

function renderAdGroupsTable(account) {
  const cur = account.currency || "USD";
  const headers = [
    { key: "name", label: "Ad group", render: (r) => escape(r.name || "—") },
    { key: "campaign", label: "Campaña", render: (r) => escape(r.campaign || "—") },
    { key: "impressions", label: "Impr.", align: "right", render: (r) => fmtInt(r.impressions) },
    { key: "clicks", label: "Clicks", align: "right", render: (r) => fmtInt(r.clicks) },
    {
      key: "ctr",
      label: "CTR",
      align: "right",
      render: (r) => `<span class="metric metric-${classifyCtr(r.ctr)}">${fmtPct(r.ctr)}</span>`,
    },
    {
      key: "cost",
      label: "Costo",
      align: "right",
      render: (r) => fmtMoney(r.cost, cur),
    },
    {
      key: "avgCpc",
      label: "CPC promedio",
      align: "right",
      render: (r) => fmtMoney(r.avgCpc, cur),
    },
    { key: "conversions", label: "Conv.", align: "right", render: (r) => fmtNum(r.conversions, 1) },
  ];
  return renderTable(headers, account.adGroups || [], {
    note: "Top 20 ad groups por costo.",
  });
}

function renderConversionsTable(account) {
  const cur = account.currency || "USD";
  const headers = [
    { key: "name", label: "Acción de conversión", render: (r) => escape(r.name || "—") },
    {
      key: "category",
      label: "Categoría",
      render: (r) => `<span class="chip">${escape(r.category || "—")}</span>`,
    },
    { key: "conversions", label: "Conv.", align: "right", render: (r) => fmtNum(r.conversions, 1) },
    { key: "allConversions", label: "All conv.", align: "right", render: (r) => fmtNum(r.allConversions, 1) },
    {
      key: "conversionsValue",
      label: "Valor",
      align: "right",
      render: (r) => fmtMoney(r.conversionsValue, cur),
    },
    {
      key: "valuePerConversion",
      label: "Valor / conv.",
      align: "right",
      render: (r) => fmtMoney(r.valuePerConversion, cur),
    },
  ];
  return renderTable(headers, account.conversions || []);
}

function renderAccount(account, index) {
  const a = aggregateAccount(account);
  const cur = account.currency || "USD";
  const id = `acc-${escape(account.accountId)}`;
  const tabsId = `tabs-${escape(account.accountId)}`;

  return `
    <details class="account" ${index === 0 ? "open" : ""} id="${id}">
      <summary>
        <div class="account-header">
          <div class="account-name">
            <h3>${escape(account.account || "(sin nombre)")}</h3>
            <span class="account-id">${escape(account.accountId)}${
              account.currency ? ` · ${escape(account.currency)}` : ""
            }</span>
          </div>
          <div class="account-kpis">
            <span><strong>${fmtMoney(a.cost, cur)}</strong><em>gasto</em></span>
            <span><strong>${fmtNum(a.conversions, 0)}</strong><em>conv.</em></span>
            <span class="metric-${classifyRoas(a.roas)}"><strong>${fmtPctRaw(a.roas, 0)}</strong><em>ROAS</em></span>
            <span class="metric-${classifyCtr(a.ctr)}"><strong>${fmtPct(a.ctr, 1)}</strong><em>CTR</em></span>
            <span><strong>${fmtMoney(a.cpa, cur)}</strong><em>CPA</em></span>
          </div>
        </div>
      </summary>

      <div class="account-body">
        <div class="block block-anomalies">
          <h4><span class="block-icon">⚠</span> Anomalías detectadas</h4>
          ${formatAnomalies(account.analysis?.anomalies)}
        </div>

        <div class="block block-performance">
          <h4><span class="block-icon">▤</span> Análisis de performance</h4>
          <div class="ai-prose">${formatAnalysis(account.analysis?.performance)}</div>
        </div>

        <div class="block block-tables">
          <h4><span class="block-icon">▦</span> Datos crudos</h4>
          <div class="tabs" id="${tabsId}">
            <button class="tab-btn active" data-target="${tabsId}-camp">Campañas <span class="count">${(account.campaigns || []).length}</span></button>
            <button class="tab-btn" data-target="${tabsId}-st">Search terms <span class="count">${(account.searchTerms || []).length}</span></button>
            <button class="tab-btn" data-target="${tabsId}-ag">Ad groups <span class="count">${(account.adGroups || []).length}</span></button>
            <button class="tab-btn" data-target="${tabsId}-conv">Conversiones <span class="count">${(account.conversions || []).length}</span></button>
          </div>
          <div class="tab-panel active" id="${tabsId}-camp">${renderCampaignsTable(account)}</div>
          <div class="tab-panel" id="${tabsId}-st">${renderSearchTermsTable(account)}</div>
          <div class="tab-panel" id="${tabsId}-ag">${renderAdGroupsTable(account)}</div>
          <div class="tab-panel" id="${tabsId}-conv">${renderConversionsTable(account)}</div>
        </div>
      </div>
    </details>
  `;
}

function renderCrossAccountSummaryTable(summary) {
  const headers = [
    { key: "account", label: "Cuenta", render: (r) => escape(r.account) },
    { key: "currency", label: "Moneda", render: (r) => escape(r.currency || "—") },
    {
      key: "totalCost",
      label: "Gasto",
      align: "right",
      render: (r) => fmtMoney(r.totalCost, r.currency || "USD"),
    },
    {
      key: "totalClicks",
      label: "Clicks",
      align: "right",
      render: (r) => fmtInt(r.totalClicks),
    },
    {
      key: "totalConversions",
      label: "Conv.",
      align: "right",
      render: (r) => fmtNum(r.totalConversions, 1),
    },
    {
      key: "avgCtr",
      label: "CTR",
      align: "right",
      render: (r) => `<span class="metric metric-${classifyCtr(r.avgCtr)}">${fmtPct(r.avgCtr, 2)}</span>`,
    },
    {
      key: "topCampaign",
      label: "Top campaña",
      render: (r) => escape(r.topCampaign || "—"),
    },
  ];
  return renderTable(headers, summary || []);
}

function renderCrossAccount(crossAccount) {
  if (!crossAccount) return "";
  return `
    <section class="cross-account">
      <header class="section-header">
        <h2>Análisis cross-account</h2>
        <p>Comparativa entre las ${(crossAccount.summary || []).length} cuentas del MCC</p>
      </header>
      <div class="cross-summary">
        <h3>Resumen agregado por cuenta</h3>
        ${renderCrossAccountSummaryTable(crossAccount.summary)}
      </div>
      <div class="ai-block">
        <h3>Insights de Gemini</h3>
        <div class="ai-prose">${formatAnalysis(crossAccount.analysis)}</div>
      </div>
    </section>
  `;
}

function renderHero(report, agg) {
  const dateStr = new Date(report.generatedAt).toLocaleString("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const currency = agg.currency || "USD";
  const currencyNote = !agg.currency ? '<span class="warn-note">monedas mixtas</span>' : "";

  return `
    <section class="hero">
      <div class="hero-meta">
        <span class="hero-date">${escape(dateStr)}</span>
        <span class="hero-period">Últimos 30 días</span>
      </div>
      <h2>Resumen del portfolio</h2>
      <div class="kpi-grid">
        <div class="kpi">
          <span class="kpi-label">Cuentas activas</span>
          <strong class="kpi-value">${report.accountsCount || 0}</strong>
        </div>
        <div class="kpi">
          <span class="kpi-label">Inversión total ${currencyNote}</span>
          <strong class="kpi-value">${fmtMoney(agg.cost, currency)}</strong>
        </div>
        <div class="kpi">
          <span class="kpi-label">Conversiones</span>
          <strong class="kpi-value">${fmtNum(agg.conversions, 0)}</strong>
        </div>
        <div class="kpi">
          <span class="kpi-label">Clicks</span>
          <strong class="kpi-value">${fmtInt(agg.clicks)}</strong>
        </div>
        <div class="kpi">
          <span class="kpi-label">Impresiones</span>
          <strong class="kpi-value">${fmtInt(agg.impressions)}</strong>
        </div>
        <div class="kpi">
          <span class="kpi-label">CTR promedio</span>
          <strong class="kpi-value metric-${classifyCtr(agg.ctr)}">${fmtPct(agg.ctr, 2)}</strong>
        </div>
        <div class="kpi">
          <span class="kpi-label">ROAS promedio</span>
          <strong class="kpi-value metric-${classifyRoas(agg.roas)}">${fmtPctRaw(agg.roas, 0)}</strong>
        </div>
        <div class="kpi">
          <span class="kpi-label">Valor de conv.</span>
          <strong class="kpi-value">${fmtMoney(agg.conversionsValue, currency)}</strong>
        </div>
      </div>
    </section>
  `;
}

function renderAccountNav(accounts) {
  if (!accounts.length) return "";
  const items = accounts
    .map((acct) => {
      const a = aggregateAccount(acct);
      return `<a href="#acc-${escape(acct.accountId)}" class="nav-chip">
        <span class="chip-name">${escape(acct.account)}</span>
        <span class="chip-cost">${fmtMoney(a.cost, acct.currency || "USD")}</span>
      </a>`;
    })
    .join("");
  return `<nav class="account-nav"><span class="nav-label">Saltar a:</span>${items}</nav>`;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", system-ui, sans-serif;
    color: var(--text);
    background: var(--bg);
    font-size: 14px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }

  :root[data-theme="dark"] {
    --bg: #0a0a0c;
    --bg-elev: #131318;
    --bg-elev-2: #1b1b22;
    --bg-hover: #20202a;
    --border: #26262f;
    --border-strong: #3a3a45;
    --text: #ececf0;
    --text-dim: #9596a3;
    --text-muted: #66666f;
    --accent: #8a73ff;
    --accent-bg: rgba(138, 115, 255, 0.12);
    --good: #3ddc97;
    --good-bg: rgba(61, 220, 151, 0.12);
    --warn: #f9b256;
    --warn-bg: rgba(249, 178, 86, 0.12);
    --bad: #ff6e6e;
    --bad-bg: rgba(255, 110, 110, 0.12);
    --info: #5ab9ff;
    --info-bg: rgba(90, 185, 255, 0.12);
    --muted: #767682;
    --muted-bg: rgba(118, 118, 130, 0.1);
    --shadow: 0 1px 0 rgba(255,255,255,0.02), 0 8px 28px rgba(0,0,0,0.45);
  }

  :root[data-theme="light"] {
    --bg: #f7f7f9;
    --bg-elev: #ffffff;
    --bg-elev-2: #f1f1f4;
    --bg-hover: #ebebef;
    --border: #e3e3e8;
    --border-strong: #c8c8d0;
    --text: #1a1a22;
    --text-dim: #5e5e6a;
    --text-muted: #888893;
    --accent: #6845e0;
    --accent-bg: rgba(104, 69, 224, 0.10);
    --good: #1c8c5b;
    --good-bg: rgba(28, 140, 91, 0.10);
    --warn: #b67200;
    --warn-bg: rgba(182, 114, 0, 0.12);
    --bad: #c83838;
    --bad-bg: rgba(200, 56, 56, 0.10);
    --info: #2476c7;
    --info-bg: rgba(36, 118, 199, 0.10);
    --muted: #7a7a85;
    --muted-bg: rgba(122, 122, 133, 0.10);
    --shadow: 0 1px 0 rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.06);
  }

  /* TOPBAR */
  .topbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(10, 10, 12, 0.85);
    backdrop-filter: saturate(140%) blur(12px);
    -webkit-backdrop-filter: saturate(140%) blur(12px);
    border-bottom: 1px solid var(--border);
  }
  :root[data-theme="light"] .topbar { background: rgba(247,247,249,0.85); }
  .topbar-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 14px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .brand { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .logo {
    color: var(--accent);
    font-size: 22px;
    line-height: 1;
    transform: translateY(2px);
  }
  .brand h1 { font-size: 17px; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
  .brand .subtitle { color: var(--text-dim); font-size: 13px; }
  .actions { display: flex; gap: 8px; align-items: center; }
  .icon-btn {
    background: var(--bg-elev);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
    transition: background .15s, border-color .15s;
  }
  .icon-btn:hover { background: var(--bg-hover); border-color: var(--border-strong); }

  main { max-width: 1400px; margin: 0 auto; padding: 32px; }

  /* HERO */
  .hero {
    margin-bottom: 40px;
  }
  .hero-meta { display: flex; gap: 12px; margin-bottom: 8px; color: var(--text-dim); font-size: 13px; }
  .hero-period {
    background: var(--accent-bg);
    color: var(--accent);
    padding: 2px 10px;
    border-radius: 999px;
    font-weight: 500;
  }
  .hero h2 {
    font-size: 28px;
    font-weight: 600;
    margin: 0 0 24px;
    letter-spacing: -0.02em;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  .kpi {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 18px;
    transition: border-color .15s, transform .15s;
  }
  .kpi:hover { border-color: var(--border-strong); }
  .kpi-label {
    display: block;
    font-size: 12px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
  }
  .kpi-value {
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.02em;
    display: block;
  }
  .warn-note {
    display: inline-block;
    margin-left: 6px;
    background: var(--warn-bg);
    color: var(--warn);
    padding: 1px 8px;
    border-radius: 4px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* ACCOUNT NAV */
  .account-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 24px;
  }
  .nav-label { color: var(--text-dim); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
  .nav-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--text);
    text-decoration: none;
    transition: border-color .15s, background .15s;
  }
  .nav-chip:hover { border-color: var(--accent); background: var(--accent-bg); color: var(--accent); }
  .nav-chip .chip-cost { color: var(--text-dim); font-size: 12px; }
  .nav-chip:hover .chip-cost { color: var(--accent); }

  /* SECTION HEADERS */
  .section-header {
    margin-bottom: 16px;
  }
  .section-header h2 {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 4px;
    letter-spacing: -0.01em;
  }
  .section-header p { margin: 0; color: var(--text-dim); }

  /* CROSS ACCOUNT */
  .cross-account {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 28px;
    margin-bottom: 40px;
  }
  .cross-summary { margin-bottom: 28px; }
  .cross-summary h3, .ai-block h3 {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    margin: 0 0 12px;
  }

  /* ACCOUNTS LIST */
  .accounts-section h2 {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 16px;
    letter-spacing: -0.01em;
  }
  .accounts-section h2 .count {
    color: var(--text-dim);
    font-weight: 400;
    margin-left: 8px;
  }

  .account {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 14px;
    margin-bottom: 12px;
    transition: border-color .15s;
    overflow: hidden;
  }
  .account[open] { border-color: var(--border-strong); }
  .account > summary {
    list-style: none;
    cursor: pointer;
    padding: 18px 22px;
    user-select: none;
  }
  .account > summary::-webkit-details-marker { display: none; }
  .account > summary::before {
    content: "▸";
    display: inline-block;
    margin-right: 12px;
    color: var(--text-dim);
    transition: transform .2s;
    font-size: 11px;
  }
  .account[open] > summary::before { transform: rotate(90deg); }
  .account-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
  }
  .account-name { display: inline-flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .account-name h3 { font-size: 18px; font-weight: 600; margin: 0; letter-spacing: -0.01em; display: inline; }
  .account-id { color: var(--text-muted); font-size: 12px; font-family: ui-monospace, monospace; }
  .account-kpis { display: flex; gap: 18px; flex-wrap: wrap; }
  .account-kpis > span {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1.2;
  }
  .account-kpis > span > strong { font-size: 14px; font-weight: 600; }
  .account-kpis > span > em {
    font-style: normal;
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 2px;
  }

  .account-body { border-top: 1px solid var(--border); padding: 24px 22px; }
  .block { margin-bottom: 28px; }
  .block:last-child { margin-bottom: 0; }
  .block h4 {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    margin: 0 0 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .block-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: var(--bg-elev-2);
    font-size: 12px;
  }
  .block-anomalies h4 .block-icon { color: var(--warn); background: var(--warn-bg); }
  .block-performance h4 .block-icon { color: var(--accent); background: var(--accent-bg); }
  .block-tables h4 .block-icon { color: var(--info); background: var(--info-bg); }

  /* AI PROSE */
  .ai-prose, .ai-block .ai-prose {
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px 24px;
  }
  .ai-prose h4 {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
    margin: 18px 0 8px;
  }
  .ai-prose h4:first-child { margin-top: 0; }
  .ai-prose p { margin: 0 0 10px; color: var(--text); }
  .ai-prose p:last-child { margin-bottom: 0; }
  .ai-prose ul { margin: 4px 0 12px; padding-left: 20px; }
  .ai-prose li { margin-bottom: 4px; }
  .ai-prose strong { color: var(--text); }
  .ai-prose code {
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 0.9em;
    background: var(--bg-hover);
    padding: 1px 6px;
    border-radius: 4px;
  }
  .ai-prose .empty { color: var(--text-muted); font-style: italic; }

  /* ANOMALIES */
  .no-anomalies {
    background: var(--good-bg);
    color: var(--good);
    padding: 14px 18px;
    border-radius: 12px;
    border: 1px solid var(--good);
    border-color: color-mix(in srgb, var(--good) 30%, transparent);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .no-anomalies .dot {
    width: 8px; height: 8px; border-radius: 50%; background: var(--good);
  }

  .anomaly-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 12px;
  }
  .anomaly-card {
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    border-left: 3px solid var(--warn);
    border-radius: 10px;
    padding: 14px 16px;
  }
  .anomaly-card.border-bad { border-left-color: var(--bad); }
  .anomaly-card.border-warn { border-left-color: var(--warn); }
  .anomaly-card.border-info { border-left-color: var(--info); }
  .anomaly-card header { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .anomaly-num {
    color: var(--text-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-left: auto;
  }
  .anomaly-card dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 0; font-size: 13px; }
  .anomaly-card dt { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; align-self: center; }
  .anomaly-card dd { margin: 0; color: var(--text); }
  .anomaly-card .action {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--border);
    font-size: 13px;
  }
  .anomaly-card .action span {
    display: inline-block;
    color: var(--text-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-right: 6px;
  }
  .anomaly-fallback { background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; }

  .badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .badge-bad { background: var(--bad-bg); color: var(--bad); }
  .badge-warn { background: var(--warn-bg); color: var(--warn); }
  .badge-info { background: var(--info-bg); color: var(--info); }
  .badge-impact-bad { background: var(--bad-bg); color: var(--bad); }
  .badge-impact-warn { background: var(--warn-bg); color: var(--warn); }
  .badge-impact-info { background: var(--info-bg); color: var(--info); }
  .badge-impact-muted { background: var(--muted-bg); color: var(--muted); }

  /* TABS */
  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .tab-btn {
    background: transparent;
    color: var(--text-dim);
    border: none;
    padding: 8px 14px;
    border-radius: 8px 8px 0 0;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: color .15s, border-color .15s;
  }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { color: var(--text); border-bottom-color: var(--accent); }
  .tab-btn .count {
    background: var(--bg-elev-2);
    color: var(--text-dim);
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 500;
  }
  .tab-btn.active .count { background: var(--accent-bg); color: var(--accent); }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  /* TABLES */
  .table-wrap { display: flex; flex-direction: column; gap: 10px; }
  .table-filter {
    align-self: flex-start;
    width: 280px;
    max-width: 100%;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 13px;
  }
  .table-filter:focus { outline: none; border-color: var(--accent); }
  .table-scroll { overflow-x: auto; border-radius: 8px; border: 1px solid var(--border); }
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .data-table th {
    background: var(--bg-elev-2);
    color: var(--text-dim);
    text-align: left;
    padding: 10px 14px;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .data-table th.right { text-align: right; }
  .data-table th.sortable { cursor: pointer; user-select: none; }
  .data-table th.sortable:hover { color: var(--text); }
  .data-table th.sort-asc::after { content: " ↑"; color: var(--accent); }
  .data-table th.sort-desc::after { content: " ↓"; color: var(--accent); }
  .data-table td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--bg-hover); }
  .data-table td.right { text-align: right; font-variant-numeric: tabular-nums; }
  .data-table td.left { text-align: left; }
  .table-note { color: var(--text-muted); font-size: 11px; margin: 0; padding-left: 4px; }
  .empty-table { color: var(--text-muted); font-style: italic; padding: 20px; text-align: center; background: var(--bg-elev-2); border: 1px dashed var(--border); border-radius: 8px; }

  /* METRIC PILLS */
  .metric { font-weight: 600; }
  .metric-good, .kpi-value.metric-good, .account-kpis .metric-good > strong { color: var(--good); }
  .metric-warn, .kpi-value.metric-warn, .account-kpis .metric-warn > strong { color: var(--warn); }
  .metric-bad, .kpi-value.metric-bad, .account-kpis .metric-bad > strong { color: var(--bad); }
  .metric-muted, .account-kpis .metric-muted > strong { color: var(--text-muted); }

  /* CHIPS */
  .chip {
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 2px 8px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* ERRORS */
  .error-banner {
    background: var(--bad-bg);
    border: 1px solid var(--bad);
    border-color: color-mix(in srgb, var(--bad) 35%, transparent);
    color: var(--bad);
    padding: 14px 18px;
    border-radius: 10px;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.5;
    word-break: break-word;
  }

  /* FOOTER */
  footer {
    text-align: center;
    color: var(--text-muted);
    padding: 40px 32px;
    font-size: 12px;
    border-top: 1px solid var(--border);
    margin-top: 60px;
  }
  footer a { color: var(--text-dim); text-decoration: none; }

  /* PRINT */
  @media print {
    .topbar, .actions, .table-filter, .account-nav, .icon-btn { display: none !important; }
    body { background: white; color: black; }
    .account, .cross-account, .kpi { break-inside: avoid; }
    details { page-break-inside: avoid; }
    .account[open] > summary::before, .account > summary::before { display: none; }
    details > div { display: block !important; }
    .tab-panel { display: block !important; page-break-before: auto; margin-bottom: 20px; }
    .tabs { display: none; }
  }

  /* MOBILE */
  @media (max-width: 720px) {
    main, .topbar-content { padding-left: 16px; padding-right: 16px; }
    .account-header { flex-direction: column; align-items: flex-start; gap: 12px; }
    .account-kpis { gap: 14px; }
    .hero h2 { font-size: 22px; }
    .kpi-value { font-size: 20px; }
  }
`;

// ─── JS embebido ──────────────────────────────────────────────────────────────

const SCRIPT = `
  (function() {
    // Theme toggle
    const root = document.documentElement;
    const stored = localStorage.getItem('gsc-theme');
    if (stored) root.setAttribute('data-theme', stored);
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('gsc-theme', next);
      document.getElementById('theme-toggle').textContent = next === 'dark' ? '☀' : '☾';
    });
    const initialIcon = root.getAttribute('data-theme') === 'dark' ? '☀' : '☾';
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.textContent = initialIcon;

    // Tabs
    document.querySelectorAll('.tabs').forEach(group => {
      group.addEventListener('click', e => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        const target = btn.getAttribute('data-target');
        group.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        const container = group.parentElement;
        container.querySelectorAll(':scope > .tab-panel').forEach(p => {
          p.classList.toggle('active', p.id === target);
        });
      });
    });

    // Table filter
    document.querySelectorAll('.table-filter').forEach(input => {
      input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        const tbody = input.closest('.table-wrap').querySelector('tbody');
        if (!tbody) return;
        tbody.querySelectorAll('tr').forEach(tr => {
          tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      });
    });

    // Sort tables
    document.querySelectorAll('.data-table').forEach(table => {
      const headers = table.querySelectorAll('th.sortable');
      headers.forEach((th, idx) => {
        th.addEventListener('click', () => {
          const tbody = table.tBodies[0];
          const rows = Array.from(tbody.rows);
          const isAsc = th.classList.contains('sort-asc');
          headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
          th.classList.add(isAsc ? 'sort-desc' : 'sort-asc');
          rows.sort((a, b) => {
            const aText = a.cells[idx]?.innerText.trim() || '';
            const bText = b.cells[idx]?.innerText.trim() || '';
            const aNum = parseFloat(aText.replace(/[^\\d.\\-]/g, ''));
            const bNum = parseFloat(bText.replace(/[^\\d.\\-]/g, ''));
            const isNum = !isNaN(aNum) && !isNaN(bNum);
            if (isNum) return isAsc ? aNum - bNum : bNum - aNum;
            return isAsc ? aText.localeCompare(bText) : bText.localeCompare(aText);
          });
          rows.forEach(r => tbody.appendChild(r));
        });
      });
    });

    // Expand/collapse all
    document.getElementById('expand-all')?.addEventListener('click', () => {
      const allOpen = [...document.querySelectorAll('details.account')].every(d => d.open);
      document.querySelectorAll('details.account').forEach(d => d.open = !allOpen);
      document.getElementById('expand-all').textContent = !allOpen ? 'Colapsar todo' : 'Expandir todo';
    });
  })();
`;

// ─── Entry points ────────────────────────────────────────────────────────────

function buildHTML(report) {
  const accounts = (report.accounts || []).slice().sort((a, b) => {
    const ag = aggregateAccount(b).cost - aggregateAccount(a).cost;
    return ag;
  });
  const agg = aggregatePortfolio(accounts);
  const dateForTitle = new Date(report.generatedAt || Date.now()).toLocaleDateString("es-AR");

  const body = `
    <header class="topbar">
      <div class="topbar-content">
        <div class="brand">
          <span class="logo">●</span>
          <h1>GSC Access</h1>
          <span class="subtitle">Reporte Google Ads · ${escape(dateForTitle)}</span>
        </div>
        <div class="actions">
          <button id="expand-all" class="icon-btn">Expandir todo</button>
          <button id="theme-toggle" class="icon-btn" title="Cambiar tema">☀</button>
        </div>
      </div>
    </header>
    <main>
      ${renderHero(report, agg)}
      ${renderAccountNav(accounts)}
      ${renderCrossAccount(report.crossAccount)}
      <section class="accounts-section">
        <h2>Cuentas <span class="count">(${accounts.length})</span></h2>
        ${accounts.map((a, i) => renderAccount(a, i)).join("")}
      </section>
    </main>
    <footer>
      Generado por <strong>gsc-access</strong> · ${escape(new Date(report.generatedAt || Date.now()).toISOString())}
    </footer>
  `;

  return `<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reporte Ads · ${escape(dateForTitle)}</title>
  <style>${STYLES}</style>
</head>
<body>
${body}
<script>${SCRIPT}</script>
</body>
</html>`;
}

function buildReport(jsonPathOrReport, outPath) {
  const report =
    typeof jsonPathOrReport === "string"
      ? JSON.parse(fs.readFileSync(jsonPathOrReport, "utf8"))
      : jsonPathOrReport;

  const html = buildHTML(report);

  let target = outPath;
  if (!target) {
    if (typeof jsonPathOrReport === "string") {
      target = jsonPathOrReport.replace(/\.json$/i, ".html");
    } else {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      target = `report-ads-${ts}.html`;
    }
  }

  fs.writeFileSync(target, html);
  return path.resolve(target);
}

function findLatestJsonReport(dir = ".") {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^report-ads-.*\.json$/.test(f))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.name;
}

if (require.main === module) {
  const arg = process.argv[2];
  let jsonPath = arg;
  if (!jsonPath) {
    jsonPath = findLatestJsonReport();
    if (!jsonPath) {
      console.error("❌ No encontré ningún report-ads-*.json en el directorio actual.");
      console.error("   Corré primero: npm run analyze-ads");
      process.exit(1);
    }
    console.log(`📄 Usando el más reciente: ${jsonPath}`);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ No existe el archivo: ${jsonPath}`);
    process.exit(1);
  }

  const outPath = buildReport(jsonPath);
  console.log(`✅ HTML generado: ${outPath}`);
  console.log(`   Abrilo con doble click o desde el browser.`);
}

module.exports = { buildReport, buildHTML };
