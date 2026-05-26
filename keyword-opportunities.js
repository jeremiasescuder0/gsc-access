require("dotenv").config();
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { listSites, fetchSitePerformance } = require("./gsc-fetch");
const { fetchAccountSearchTerms } = require("./ads-fetch");
const { getClientByGscSite } = require("./clients");

// Usage:
//   node keyword-opportunities.js                   → analiza todos los sitios
//   node keyword-opportunities.js sc-domain:sitio   → solo ese sitio
//   node keyword-opportunities.js sc-domain:sitio --days=60

const { GEMINI_API_KEY } = process.env;
if (!GEMINI_API_KEY) {
  console.error("Falta GEMINI_API_KEY en .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs() {
  const args = process.argv.slice(2);
  let siteUrl = null;
  let days = 30;
  for (const arg of args) {
    if (arg.startsWith("--days=")) {
      days = parseInt(arg.split("=")[1], 10) || 30;
    } else if (arg.startsWith("sc-domain:") || arg.startsWith("http")) {
      siteUrl = arg;
    }
  }
  return { siteUrl, days };
}

function avgCtr(queries) {
  const totalImpr = queries.reduce((s, q) => s + q.impressions, 0);
  const totalClicks = queries.reduce((s, q) => s + q.clicks, 0);
  return totalImpr > 0 ? totalClicks / totalImpr : 0;
}

// Clasifica oportunidades desde GSC — solo quick wins y CTR bajo
// Los blog topics ahora vienen de Ads (exploración del rubro)
function classifyGscOpportunities(data) {
  const queries = data.queries;
  const siteCtr = avgCtr(queries);

  const quickWins = queries
    .filter((q) => q.position >= 2 && q.position <= 10 && q.ctr < siteCtr * 0.6)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  const lowCtr = queries
    .filter((q) => q.impressions >= 100 && q.ctr < 0.02 && q.position < 15)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  return { quickWins, lowCtr, siteCtr };
}

// Deduplicar y limpiar search terms de Ads
function prepareAdsKeywords(searchTerms, blogPages) {
  const blogUrls = blogPages.map((p) => p.page.toLowerCase());

  // Agrupa terms idénticos sumando impresiones
  const map = new Map();
  for (const st of searchTerms) {
    const key = st.searchTerm.toLowerCase().trim();
    if (!key || key.length < 3) continue;
    if (map.has(key)) {
      const existing = map.get(key);
      existing.impressions += st.impressions;
      existing.clicks += st.clicks;
      existing.conversions += st.conversions;
    } else {
      map.set(key, { ...st, searchTerm: key });
    }
  }

  return [...map.values()]
    .filter((st) => {
      // Excluir si ya hay blog que cubre el tema
      const word = st.searchTerm.split(" ")[0];
      return !blogUrls.some((url) => url.includes(word));
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 60);
}

function buildGeminiPrompt(siteUrl, client, gscOps, adsKeywords, blogPages, days) {
  const { quickWins, lowCtr, siteCtr } = gscOps;
  const hasAds = adsKeywords.length > 0;

  const industrySection = hasAds
    ? `FUENTE PRINCIPAL — KEYWORDS DEL RUBRO (Search Terms reales de campañas Google Ads):
Rubro del cliente: ${client?.industry || "no especificado"}
Estas son las búsquedas reales que hicieron usuarios relacionados con este negocio. Usalas para identificar temas de blog aunque el sitio no aparezca todavía en resultados orgánicos.

${JSON.stringify(adsKeywords.slice(0, 40).map((st) => ({
      keyword: st.searchTerm,
      impresiones_ads: st.impressions,
      clicks_ads: st.clicks,
      conversiones: st.conversions,
    })), null, 2)}`
    : `FUENTE ALTERNATIVA — QUERIES DE GSC (sin cuenta Ads vinculada):
Rubro del cliente: ${client?.industry || "no especificado"}
Este cliente no tiene cuenta Ads activa. Se usan las queries de GSC como referencia del rubro.`;

  return `Actuás como un estratega de contenido SEO especializado en blogs de negocios. Respondé EN ESPAÑOL.

Sitio: ${siteUrl}
Cliente: ${client?.name || siteUrl}
Período: últimos ${days} días
CTR promedio del sitio (GSC): ${(siteCtr * 100).toFixed(2)}%
Páginas de blog existentes (${blogPages.length}): ${blogPages.slice(0, 10).map((p) => p.page).join(", ") || "ninguna"}

---
${industrySection}

---
DATOS GSC — QUICK WINS (páginas que ya rankean bien pero CTR bajo):
${JSON.stringify(quickWins.slice(0, 8).map((q) => ({
    query: q.query,
    posicion: Math.round(q.position * 10) / 10,
    ctr: (q.ctr * 100).toFixed(2) + "%",
    impresiones: q.impressions,
  })), null, 2)}

DATOS GSC — ALERTAS CTR BAJO (alta exposición, casi sin clicks):
${JSON.stringify(lowCtr.slice(0, 8).map((q) => ({
    query: q.query,
    posicion: Math.round(q.position * 10) / 10,
    ctr: (q.ctr * 100).toFixed(2) + "%",
    impresiones: q.impressions,
  })), null, 2)}

---
Respondé con esta estructura:

RESUMEN DEL CLIENTE
(2-3 líneas: estado actual del contenido y oportunidad principal)

BLOG TOPICS RECOMENDADOS — EXPLORACIÓN DEL RUBRO (top 5-7)
Basate principalmente en los keywords del rubro (Ads o GSC según lo que haya). Priorizá temas con volumen real y que el sitio NO cubre todavía.
Por cada uno:
- Título sugerido: <título optimizado para SEO>
- Keyword principal: <term exacto de la fuente>
- Volumen estimado: <impresiones del período>
- Dificultad estimada: <baja|media|alta con justificación>
- Ángulo editorial: <educativo|comparativo|how-to|local — 1 línea>
- Por qué este tema: <por qué es relevante para el rubro y para el cliente>

QUICK WINS — OPTIMIZAR TÍTULOS/META (top 3, desde GSC)
Por cada uno:
- Query: <query>
- Problema: <por qué el CTR es bajo>
- Acción concreta: <qué cambiar en el title tag o meta description>

ALERTA CTR BAJO
(Las 2-3 más urgentes con acción específica — solo si las hay)

PRÓXIMOS 3 PASOS
(Ordenados por impacto, concretos y ejecutables)
`;
}

async function analyzeWithGemini(prompt, label, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (i === retries) return `Error generando análisis (${label}): ${err?.message || err}`;
      const delay = 2000 * 2 ** (i - 1);
      console.warn(`  Reintentando en ${delay / 1000}s... (${i}/${retries})`);
      await sleep(delay);
    }
  }
}

function line(char = "─", len = 72) { return char.repeat(len); }

async function processSite(siteUrl, days) {
  console.log(`\n${line()}`);
  const client = getClientByGscSite(siteUrl);
  console.log(`SITIO: ${siteUrl}${client ? ` (${client.name})` : ""}`);
  console.log(line());

  // Fetch GSC y Ads en paralelo cuando hay cuenta vinculada
  let gscData, adsSearchTerms = [];

  try {
    const tasks = [fetchSitePerformance(siteUrl, { periodDays: days })];

    if (client?.adsCustomerId) {
      tasks.push(
        fetchAccountSearchTerms(client.adsCustomerId).catch((err) => {
          console.warn(`  Ads search terms no disponibles: ${err.message}`);
          return [];
        })
      );
    }

    const [gsc, ads = []] = await Promise.all(tasks);
    gscData = gsc;
    adsSearchTerms = ads;
  } catch (err) {
    console.error(`  Error al obtener datos GSC: ${err.message}`);
    return null;
  }

  const gscOps = classifyGscOpportunities(gscData);
  const adsKeywords = prepareAdsKeywords(adsSearchTerms, gscData.blogPages);

  console.log(`  Queries GSC: ${gscData.queries.length}`);
  console.log(`  Search terms de Ads: ${adsSearchTerms.length} → ${adsKeywords.length} únicos sin blog`);
  console.log(`  Quick wins (GSC): ${gscOps.quickWins.length}`);
  console.log(`  Alertas CTR bajo (GSC): ${gscOps.lowCtr.length}`);
  console.log(`  Páginas de blog: ${gscData.blogPages.length}`);

  const hasMaterial = adsKeywords.length > 0 || gscOps.quickWins.length > 0 || gscData.queries.length > 0;
  if (!hasMaterial) {
    console.log("  Sin datos suficientes para analizar.");
    return null;
  }

  console.log(`\n  Fuente keywords: ${adsKeywords.length > 0 ? "Ads search terms (exploración del rubro)" : "GSC (sin cuenta Ads)"}`);
  console.log("  Enviando a Gemini...");

  const prompt = buildGeminiPrompt(siteUrl, client, gscOps, adsKeywords, gscData.blogPages, days);
  const analysis = await analyzeWithGemini(prompt, client?.name || siteUrl);

  console.log(`\n${line("=")}`);
  console.log(analysis);

  return {
    siteUrl,
    clientName: client?.name || null,
    industry: client?.industry || null,
    keywordSource: adsKeywords.length > 0 ? "ads_search_terms" : "gsc",
    ranges: gscData.ranges,
    adsKeywordsCount: adsKeywords.length,
    gscOps,
    analysis,
  };
}

async function run() {
  const { siteUrl: targetSite, days } = parseArgs();

  let sites;
  if (targetSite) {
    sites = [targetSite];
  } else {
    console.log("Listando sitios desde GSC...");
    const all = await listSites();
    sites = all.map((s) => s.siteUrl);
    console.log(`Sitios encontrados: ${sites.length}`);
  }

  const results = [];
  for (const site of sites) {
    const result = await processSite(site, days);
    if (result) results.push(result);
  }

  if (results.length === 0) {
    console.log("\nSin resultados para guardar.");
    return;
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `keyword-opportunities-${ts}.json`;
  fs.writeFileSync(filename, JSON.stringify({ generatedAt: new Date().toISOString(), days, results }, null, 2));
  console.log(`\n${line()}`);
  console.log(`Reporte guardado: ${filename}`);

  // Resumen por fuente
  const withAds = results.filter((r) => r.keywordSource === "ads_search_terms").length;
  const withGsc = results.filter((r) => r.keywordSource === "gsc").length;
  console.log(`Fuente keywords — Ads: ${withAds} sitios | Solo GSC: ${withGsc} sitios`);
}

run().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
