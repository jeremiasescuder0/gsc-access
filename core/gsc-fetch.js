require("./env");
const { google } = require("googleapis");
const { getOAuthClient } = require("./oauth-client");

// GSC reporta con ~2-3 días de delay. Usamos endDate = hoy - 3 para datos estables.
const GSC_DELAY_DAYS = 3;

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
  const endCurrent = dateMinus(now, GSC_DELAY_DAYS);
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

async function getSearchConsole() {
  const auth = await getOAuthClient();
  return google.searchconsole({ version: "v1", auth });
}

async function listSites() {
  const sc = await getSearchConsole();
  const res = await sc.sites.list();
  const entries = res.data.siteEntry || [];
  return entries.map((s) => ({
    siteUrl: s.siteUrl,
    permissionLevel: s.permissionLevel,
  }));
}

async function queryRange(sc, siteUrl, range, dimensions, rowLimit = 100) {
  const res = await sc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions,
      rowLimit,
      dataState: "all",
    },
  });
  return res.data.rows || [];
}

function aggregateTotals(rows) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.clicks += r.clicks || 0;
      acc.impressions += r.impressions || 0;
      return acc;
    },
    { clicks: 0, impressions: 0 }
  );
  totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  // Promedio ponderado de posición por impresiones
  const weighted = rows.reduce((s, r) => s + (r.position || 0) * (r.impressions || 0), 0);
  totals.position = totals.impressions > 0 ? weighted / totals.impressions : 0;
  return totals;
}

function formatRows(rows, keyName) {
  return rows.map((r) => ({
    [keyName]: r.keys[0],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  }));
}

function indexBy(rows, keyName) {
  const map = new Map();
  for (const r of rows) {
    map.set(r[keyName], r);
  }
  return map;
}

function buildDeltaList(currentRows, previousRows, keyName) {
  const prevMap = indexBy(previousRows, keyName);
  return currentRows.map((curr) => {
    const prev = prevMap.get(curr[keyName]);
    return {
      ...curr,
      previous: prev || null,
      delta: prev
        ? {
            clicks: curr.clicks - prev.clicks,
            impressions: curr.impressions - prev.impressions,
            ctr: curr.ctr - prev.ctr,
            position: curr.position - prev.position,
          }
        : null,
    };
  });
}

function detectOpportunities(queries) {
  // Queries en posiciones 11-30 con buen volumen → casi en page 1
  return queries
    .filter((q) => q.position >= 11 && q.position <= 30 && q.impressions >= 100)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);
}

function detectBlogPages(pages, blogPattern = "/blog/") {
  return pages.filter((p) => (p.page || "").includes(blogPattern));
}

async function fetchSitePerformance(siteUrl, options = {}) {
  const periodDays = options.periodDays || 30;
  const blogPattern = options.blogPattern || "/blog/";
  const ranges = buildRanges(periodDays);

  const sc = await getSearchConsole();

  const [
    currQueriesRaw,
    prevQueriesRaw,
    yoyQueriesRaw,
    currPagesRaw,
    prevPagesRaw,
    yoyPagesRaw,
    currTotalsRaw,
    prevTotalsRaw,
    yoyTotalsRaw,
  ] = await Promise.all([
    queryRange(sc, siteUrl, ranges.current, ["query"], 100),
    queryRange(sc, siteUrl, ranges.previous, ["query"], 100),
    queryRange(sc, siteUrl, ranges.yearOverYear, ["query"], 100),
    queryRange(sc, siteUrl, ranges.current, ["page"], 100),
    queryRange(sc, siteUrl, ranges.previous, ["page"], 100),
    queryRange(sc, siteUrl, ranges.yearOverYear, ["page"], 100),
    queryRange(sc, siteUrl, ranges.current, ["date"], 100),
    queryRange(sc, siteUrl, ranges.previous, ["date"], 100),
    queryRange(sc, siteUrl, ranges.yearOverYear, ["date"], 100),
  ]);

  const currQueries = formatRows(currQueriesRaw, "query");
  const prevQueries = formatRows(prevQueriesRaw, "query");
  const yoyQueries = formatRows(yoyQueriesRaw, "query");

  const currPages = formatRows(currPagesRaw, "page");
  const prevPages = formatRows(prevPagesRaw, "page");
  const yoyPages = formatRows(yoyPagesRaw, "page");

  const totals = {
    current: aggregateTotals(currTotalsRaw.map((r) => ({ clicks: r.clicks, impressions: r.impressions, position: r.position }))),
    previous: aggregateTotals(prevTotalsRaw.map((r) => ({ clicks: r.clicks, impressions: r.impressions, position: r.position }))),
    yearOverYear: aggregateTotals(yoyTotalsRaw.map((r) => ({ clicks: r.clicks, impressions: r.impressions, position: r.position }))),
  };

  totals.deltaPrev = {
    clicks: totals.current.clicks - totals.previous.clicks,
    impressions: totals.current.impressions - totals.previous.impressions,
    ctr: totals.current.ctr - totals.previous.ctr,
    position: totals.current.position - totals.previous.position,
  };
  totals.deltaYoY = {
    clicks: totals.current.clicks - totals.yearOverYear.clicks,
    impressions: totals.current.impressions - totals.yearOverYear.impressions,
    ctr: totals.current.ctr - totals.yearOverYear.ctr,
    position: totals.current.position - totals.yearOverYear.position,
  };

  const queriesWithDelta = buildDeltaList(currQueries, prevQueries, "query");
  const pagesWithDelta = buildDeltaList(currPages, prevPages, "page");

  const opportunities = detectOpportunities(currQueries);
  const blogPages = detectBlogPages(pagesWithDelta, blogPattern);

  // Top blogs por queries que les traen tráfico — buscamos queries que coincidan con paths blog
  // Para evitar otra query, solo reportamos paths que matchean.

  return {
    siteUrl,
    ranges,
    blogPattern,
    totals,
    queries: queriesWithDelta,
    queriesYoY: yoyQueries,
    pages: pagesWithDelta,
    pagesYoY: yoyPages,
    opportunities,
    blogPages,
  };
}

module.exports = { listSites, fetchSitePerformance, buildRanges };
