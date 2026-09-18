// Inventario de contenido por sitio (sección 4 del spec). Se usa para detección de
// cannibalización, análisis de content gaps, y decidir si un opportunity debe convertirse en
// blog nuevo o en actualización de algo existente.
//
// Las URLs se toman de las páginas que Google Search Console ya reporta con impresiones —
// no se crawlea el sitio: GSC es una fuente mejor (URLs que Google realmente indexó y
// muestra), como pide el spec. Un archivo por sitio: data/content-inventory/<site>.json.

const { readJson, writeJson } = require("./json-store");
const { fetchSitePerformance } = require("../gsc-fetch");

function slugSite(siteUrl) {
  return siteUrl
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9.-]+/gi, "_");
}

function keyFor(siteUrl) {
  return `content-inventory/${slugSite(siteUrl)}`;
}

function guessPageType(url) {
  const u = url.toLowerCase();
  if (u.includes("/blog/")) return "blog_post";
  if (/\/(services?|servicios?)\//.test(u)) return "service_page";
  if (/\bfaq/.test(u)) return "faq";
  const segments = u.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "").split("/").filter(Boolean);
  if (segments.length === 0) return "home";
  return "other";
}

async function getInventory(siteUrl) {
  return readJson(keyFor(siteUrl), { siteUrl, syncedAt: null, items: [] });
}

// Reconstruye el inventario desde las páginas indexadas en GSC, preservando cualquier campo
// cargado a mano (título, tema, keyword) para URLs ya conocidas. Las URLs que existían antes
// pero salieron del período GSC no se borran — quedan marcadas como "stale" (sin tráfico
// reciente) en vez de desaparecer, para no perder trabajo manual previo.
async function syncInventoryFromGsc(siteUrl, { periodDays = 90 } = {}) {
  const data = await fetchSitePerformance(siteUrl, { periodDays });
  const existing = await getInventory(siteUrl);
  const existingByUrl = new Map(existing.items.map((i) => [i.url, i]));

  const freshUrls = new Set(data.pages.map((p) => p.page));

  const items = data.pages.map((p) => {
    const prev = existingByUrl.get(p.page);
    return {
      url: p.page,
      title: prev?.title || null,
      pageType: prev?.pageType || guessPageType(p.page),
      mainTopic: prev?.mainTopic || null,
      targetService: prev?.targetService || null,
      primaryKeyword: prev?.primaryKeyword || null,
      publicationDate: prev?.publicationDate || null,
      relatedKeywordClusters: prev?.relatedKeywordClusters || [],
      gscMetrics: {
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: p.ctr,
        position: p.position,
      },
      notes: prev?.notes || null,
    };
  });

  for (const item of existing.items) {
    if (!freshUrls.has(item.url)) {
      items.push({
        ...item,
        gscMetrics: item.gscMetrics ? { ...item.gscMetrics, stale: true } : null,
      });
    }
  }

  const record = { siteUrl, syncedAt: new Date().toISOString(), items };
  await writeJson(keyFor(siteUrl), record);
  return record;
}

// Edición manual de un item (título, tipo de página, tema, keyword, notas). No pisa
// gscMetrics — eso solo lo actualiza syncInventoryFromGsc.
async function upsertInventoryItem(siteUrl, url, patch = {}) {
  const inventory = await getInventory(siteUrl);
  const { gscMetrics: _ignore, url: _ignoreUrl, ...safePatch } = patch;
  const idx = inventory.items.findIndex((i) => i.url === url);
  if (idx === -1) {
    inventory.items.push({
      url,
      title: null,
      pageType: guessPageType(url),
      mainTopic: null,
      targetService: null,
      primaryKeyword: null,
      publicationDate: null,
      relatedKeywordClusters: [],
      gscMetrics: null,
      notes: null,
      ...safePatch,
    });
  } else {
    inventory.items[idx] = { ...inventory.items[idx], ...safePatch };
  }
  await writeJson(keyFor(siteUrl), inventory);
  return inventory;
}

module.exports = { getInventory, syncInventoryFromGsc, upsertInventoryItem };
