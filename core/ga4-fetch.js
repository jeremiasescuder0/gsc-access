// Google Analytics 4 — Data API (reportes) + Admin API (listar propiedades). Mismo molde que
// core/gsc-fetch.js: rangos actual / previo / año anterior, totales con deltas, y desgloses
// por dimensión. Usa el mismo OAuth client (scope analytics.readonly, ver core/auth.js).
//
// Todo lo que sale de acá son HECHOS de Google (sección 19 del spec, provenance) — la
// interpretación la hace Gemini en otra capa.
require("./env");
const { google } = require("googleapis");
const { getOAuthClient } = require("./oauth-client");

// GA4 termina de procesar los reportes estándar con ~24-48 h de demora.
const GA4_DELAY_DAYS = 2;

function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

function dateMinus(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function buildRanges(periodDays = 30) {
  const now = new Date();
  const endCurrent = dateMinus(now, GA4_DELAY_DAYS);
  const startCurrent = dateMinus(endCurrent, periodDays - 1);
  const endPrev = dateMinus(startCurrent, 1);
  const startPrev = dateMinus(endPrev, periodDays - 1);
  const endYoY = dateMinus(endCurrent, 365);
  const startYoY = dateMinus(startCurrent, 365);
  return {
    current: { startDate: toDateString(startCurrent), endDate: toDateString(endCurrent) },
    previous: { startDate: toDateString(startPrev), endDate: toDateString(endPrev) },
    yearOverYear: { startDate: toDateString(startYoY), endDate: toDateString(endYoY) },
  };
}

async function getDataApi() {
  const auth = await getOAuthClient();
  return google.analyticsdata({ version: "v1beta", auth });
}

async function getAdminApi() {
  const auth = await getOAuthClient();
  return google.analyticsadmin({ version: "v1beta", auth });
}

// Propiedades GA4 a las que la cuenta autenticada tiene acceso — para mapear cliente ↔
// propiedad desde la UI sin tocar código.
async function listGa4Properties() {
  const admin = await getAdminApi();
  const properties = [];
  let pageToken;
  do {
    const res = await admin.accountSummaries.list({ pageSize: 200, pageToken });
    for (const account of res.data.accountSummaries || []) {
      for (const p of account.propertySummaries || []) {
        properties.push({
          propertyId: (p.property || "").replace("properties/", ""),
          propertyName: p.displayName || p.property,
          accountName: account.displayName || account.account,
        });
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return properties.sort((a, b) => a.accountName.localeCompare(b.accountName) || a.propertyName.localeCompare(b.propertyName));
}

// Wrapper genérico de runReport. metrics/dimensions son nombres de la API de GA4
// (ej. "sessions", "engagedSessions", "sessionDefaultChannelGroup", "landingPagePlusQueryString").
async function runReport(propertyId, { range, metrics, dimensions = [], limit = 100, orderBy = null, dimensionFilter = null }) {
  const data = await getDataApi();
  const requestBody = {
    dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
    metrics: metrics.map((name) => ({ name })),
    dimensions: dimensions.map((name) => ({ name })),
    limit,
    keepEmptyRows: false,
  };
  if (orderBy) requestBody.orderBys = [orderBy];
  if (dimensionFilter) requestBody.dimensionFilter = dimensionFilter;

  const res = await data.properties.runReport({ property: `properties/${propertyId}`, requestBody });
  const dimHeaders = (res.data.dimensionHeaders || []).map((h) => h.name);
  const metHeaders = (res.data.metricHeaders || []).map((h) => h.name);
  return (res.data.rows || []).map((row) => {
    const out = {};
    dimHeaders.forEach((name, i) => (out[name] = row.dimensionValues[i].value));
    metHeaders.forEach((name, i) => (out[name] = Number(row.metricValues[i].value) || 0));
    return out;
  });
}

const TOTAL_METRICS = [
  "sessions",
  "totalUsers",
  "newUsers",
  "engagedSessions",
  "engagementRate",
  "userEngagementDuration",
  "screenPageViews",
  "keyEvents",
];

function emptyTotals() {
  return {
    sessions: 0,
    totalUsers: 0,
    newUsers: 0,
    engagedSessions: 0,
    engagementRate: 0,
    avgEngagementTime: 0,
    screenPageViews: 0,
    keyEvents: 0,
  };
}

async function fetchTotals(propertyId, range) {
  const rows = await runReport(propertyId, { range, metrics: TOTAL_METRICS });
  if (!rows.length) return emptyTotals();
  const r = rows[0];
  return {
    sessions: r.sessions,
    totalUsers: r.totalUsers,
    newUsers: r.newUsers,
    engagedSessions: r.engagedSessions,
    engagementRate: r.engagementRate,
    // Tiempo medio de engagement por sesión, en segundos.
    avgEngagementTime: r.sessions > 0 ? r.userEngagementDuration / r.sessions : 0,
    screenPageViews: r.screenPageViews,
    keyEvents: r.keyEvents,
  };
}

function delta(curr, prev) {
  const out = {};
  for (const k of Object.keys(curr)) out[k] = curr[k] - (prev[k] || 0);
  return out;
}

// Resumen completo de una propiedad para el dashboard — una sola función, varias llamadas a la
// API en paralelo (cuidado con las cuotas por propiedad/hora: el caller cachea 10 min).
async function fetchPropertyOverview(propertyId, options = {}) {
  const periodDays = options.periodDays || 30;
  const ranges = buildRanges(periodDays);

  const [totalsCurrent, totalsPrevious, totalsYoY, channels, landingPages, devices, daily, keyEventsByName] =
    await Promise.all([
      fetchTotals(propertyId, ranges.current),
      fetchTotals(propertyId, ranges.previous),
      fetchTotals(propertyId, ranges.yearOverYear),
      runReport(propertyId, {
        range: ranges.current,
        metrics: ["sessions", "engagedSessions", "engagementRate", "keyEvents"],
        dimensions: ["sessionDefaultChannelGroup"],
        orderBy: { metric: { metricName: "sessions" }, desc: true },
      }),
      runReport(propertyId, {
        range: ranges.current,
        metrics: ["sessions", "engagedSessions", "engagementRate", "userEngagementDuration", "keyEvents"],
        dimensions: ["landingPagePlusQueryString"],
        limit: 50,
        orderBy: { metric: { metricName: "sessions" }, desc: true },
      }),
      runReport(propertyId, {
        range: ranges.current,
        metrics: ["sessions", "engagementRate", "keyEvents"],
        dimensions: ["deviceCategory"],
        orderBy: { metric: { metricName: "sessions" }, desc: true },
      }),
      runReport(propertyId, {
        range: ranges.current,
        metrics: ["sessions", "keyEvents"],
        dimensions: ["date"],
        limit: 400,
        orderBy: { dimension: { dimensionName: "date" } },
      }),
      runReport(propertyId, {
        range: ranges.current,
        metrics: ["eventCount"],
        dimensions: ["eventName"],
        limit: 50,
        orderBy: { metric: { metricName: "eventCount" }, desc: true },
        dimensionFilter: { filter: { fieldName: "isKeyEvent", stringFilter: { value: "true" } } },
      }).catch(() => []), // isKeyEvent no está disponible en todas las propiedades; no es crítico
    ]);

  return {
    propertyId,
    ranges,
    totals: {
      current: totalsCurrent,
      previous: totalsPrevious,
      yearOverYear: totalsYoY,
      deltaPrev: delta(totalsCurrent, totalsPrevious),
      deltaYoY: delta(totalsCurrent, totalsYoY),
    },
    channels: channels.map((r) => ({
      channel: r.sessionDefaultChannelGroup,
      sessions: r.sessions,
      engagedSessions: r.engagedSessions,
      engagementRate: r.engagementRate,
      keyEvents: r.keyEvents,
    })),
    landingPages: landingPages.map((r) => ({
      page: r.landingPagePlusQueryString,
      sessions: r.sessions,
      engagedSessions: r.engagedSessions,
      engagementRate: r.engagementRate,
      avgEngagementTime: r.sessions > 0 ? r.userEngagementDuration / r.sessions : 0,
      keyEvents: r.keyEvents,
    })),
    devices: devices.map((r) => ({
      device: r.deviceCategory,
      sessions: r.sessions,
      engagementRate: r.engagementRate,
      keyEvents: r.keyEvents,
    })),
    daily: daily.map((r) => ({ date: r.date, sessions: r.sessions, keyEvents: r.keyEvents })),
    keyEventsByName: keyEventsByName.map((r) => ({ eventName: r.eventName, count: r.eventCount })),
  };
}

// Métricas de una URL puntual (para el tracking post-publicación de blogs). pagePath es el path
// sin dominio, ej. "/blog/what-fails-a-dot-inspection/".
async function fetchPagePerformance(propertyId, pagePath, range) {
  const rows = await runReport(propertyId, {
    range,
    metrics: ["sessions", "totalUsers", "engagedSessions", "engagementRate", "userEngagementDuration", "keyEvents"],
    dimensions: ["pagePath"],
    dimensionFilter: { filter: { fieldName: "pagePath", stringFilter: { matchType: "EXACT", value: pagePath } } },
    limit: 1,
  });
  if (!rows.length) return { sessions: 0, totalUsers: 0, engagedSessions: 0, engagementRate: 0, avgEngagementTime: 0, keyEvents: 0 };
  const r = rows[0];
  return {
    sessions: r.sessions,
    totalUsers: r.totalUsers,
    engagedSessions: r.engagedSessions,
    engagementRate: r.engagementRate,
    avgEngagementTime: r.sessions > 0 ? r.userEngagementDuration / r.sessions : 0,
    keyEvents: r.keyEvents,
  };
}

module.exports = { buildRanges, listGa4Properties, runReport, fetchPropertyOverview, fetchPagePerformance };
