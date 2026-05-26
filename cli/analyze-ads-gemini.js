require("dotenv").config();
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { fetchAllAccountsData } = require("../core/ads-fetch");
const { buildReport } = require("./build-report");

const { GEMINI_API_KEY } = process.env;
if (!GEMINI_API_KEY) {
  console.error("❌ Falta GEMINI_API_KEY en .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function header(title) {
  const line = "─".repeat(72);
  return `\n${line}\n${title}\n${line}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isRetryableError(err) {
  const msg = err?.message || String(err);
  const status = err?.status || err?.response?.status;
  if (status === 429 || status === 503 || status === 500 || status === 502 || status === 504) return true;
  return /\b(429|500|502|503|504)\b|rate.?limit|quota|resource.?exhausted|too many requests|service unavailable|high demand|internal error|temporarily/i.test(msg);
}

async function analyze(prompt, label, { maxAttempts = 4, baseDelayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const isLast = attempt === maxAttempts;
      if (!isRetryableError(err) || isLast) {
        return `⚠️  Error generando análisis (${label}): ${err?.message || err}`;
      }
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `⏳ ${label}: error transitorio (intento ${attempt}/${maxAttempts}). Reintentando en ${delay / 1000}s...`
      );
      await sleep(delay);
    }
  }
}

function performancePrompt(account) {
  return `Actuá como un senior Google Ads strategist con 10+ años de experiencia. Analizá la performance de esta cuenta y respondé EN ESPAÑOL.

Cuenta: ${account.account} (${account.accountId})
Moneda: ${account.currency || "N/A"}
Período: últimos 30 días

Devolvé un análisis con esta estructura exacta (usá títulos en mayúsculas):

1. RESUMEN EJECUTIVO
   - Estado general de la cuenta en 3-4 líneas.

2. CAMPAÑAS TOP PERFORMERS
   - Listá las que mejor convierten/escalan, con métricas concretas (cost, conversions, ROAS, CTR).

3. CAMPAÑAS CON PROBLEMAS
   - Las que están sangrando presupuesto, con CPA alto, ROAS bajo o CTR pobre. Citá métricas.

4. GRUPOS A OPTIMIZAR
   - Ad groups que requieren intervención (pausar, ajustar puja, revisar copy).

5. RECOMENDACIONES DE PRESUPUESTO
   - Dónde aumentar y dónde recortar, con justificación numérica.

6. PRÓXIMOS 3 PASOS PRIORITARIOS
   - Acciones concretas y ejecutables, ordenadas por impacto esperado.

Sé específico con números. No uses generalidades. Si la data es insuficiente para alguna sección, decílo explícitamente.

DATA (JSON):
${JSON.stringify(
    {
      campaigns: account.campaigns,
      adGroups: account.adGroups,
      conversions: account.conversions,
      searchTerms: account.searchTerms,
    },
    null,
    2
  )}
`;
}

function anomalyPrompt(account) {
  return `Actuá como un sistema de monitoreo de cuentas de Google Ads. Analizá esta data y detectá ÚNICAMENTE anomalías reales (no inventes problemas si no existen). Respondé EN ESPAÑOL.

Cuenta: ${account.account} (${account.accountId})
Período: últimos 30 días

Tipos de anomalía a buscar:
- CTR_BAJO: CTR muy por debajo del promedio razonable según el tipo de campaña.
- CPA_ALTO: costo por conversión desproporcionado vs. el resto de la cuenta.
- ROAS_NEGATIVO: gasto sin retorno, o retorno por debajo del costo.
- SEARCH_TERM_IRRELEVANTE: queries que no calzan con la intención y consumen budget.
- PRESUPUESTO_LIMITADO: campañas con conversiones buenas pero impression share / clics limitados.
- IMPRESSION_SHARE_BAJO: search_impression_share notablemente bajo en campañas relevantes.

Por cada anomalía, devolvé un bloque con este formato:

ANOMALÍA #N
- Tipo: <CTR_BAJO|CPA_ALTO|ROAS_NEGATIVO|SEARCH_TERM_IRRELEVANTE|PRESUPUESTO_LIMITADO|IMPRESSION_SHARE_BAJO>
- Elemento afectado: <nombre exacto del campaign / ad group / search term>
- Métrica observada: <valor concreto con unidad>
- Umbral esperado: <valor de referencia razonable>
- Impacto: <bajo|medio|alto>
- Acción concreta: <una acción ejecutable y específica>

Si no encontrás anomalías reales después de revisar la data, respondé exactamente:
"Sin anomalías detectadas"

DATA (JSON):
${JSON.stringify(
    {
      campaigns: account.campaigns,
      adGroups: account.adGroups,
      searchTerms: account.searchTerms,
      conversions: account.conversions,
    },
    null,
    2
  )}
`;
}

function crossAccountPrompt(summary) {
  return `Actuá como un head of paid media que supervisa varias cuentas de una agencia. Tenés un resumen agregado de cada cuenta de los últimos 30 días. Respondé EN ESPAÑOL.

Devolvé un análisis con esta estructura:

1. RANKING POR EFICIENCIA
   - Ordená las cuentas de mejor a peor combinando ROAS real (campo "roas", ya viene en %) y CTR (campo "avgCtr", viene como decimal — multiplicalo por 100). Justificá brevemente con números concretos.

2. CUENTA CON MEJOR PERFORMANCE
   - Nombre + por qué destaca + qué se puede replicar.

3. CUENTA QUE MÁS NECESITA ATENCIÓN
   - Nombre + qué está pasando + nivel de urgencia.

4. PATRONES CROSS-ACCOUNT
   - Tendencias que se repiten en varias cuentas (positivas o negativas).

5. OPORTUNIDADES DE ESCALA
   - Dónde hay margen para aumentar inversión con confianza.

6. SUGERENCIA DE BUDGET REALLOCATION
   - Recomendación concreta: de qué cuenta sacar X% y a cuál mandarlo, con razón.

DATA (JSON, una entrada por cuenta):
${JSON.stringify(summary, null, 2)}
`;
}

function summarizeAccount(account) {
  const totalCost = account.campaigns.reduce((s, c) => s + (c.cost || 0), 0);
  const totalConversions = account.campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const totalConversionsValue = account.campaigns.reduce((s, c) => s + (c.conversionsValue || 0), 0);
  const totalClicks = account.campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalImpressions = account.campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const roas = totalCost > 0 ? (totalConversionsValue / totalCost) * 100 : 0;
  const cpa = totalConversions > 0 ? totalCost / totalConversions : 0;
  const topCampaign = [...account.campaigns].sort((a, b) => (b.cost || 0) - (a.cost || 0))[0];
  return {
    account: account.account,
    accountId: account.accountId,
    currency: account.currency,
    totalCost,
    totalConversions,
    totalConversionsValue,
    totalClicks,
    avgCtr,
    roas,
    cpa,
    topCampaign: topCampaign?.name || null,
  };
}

async function run() {
  console.log(header("🚀 ANÁLISIS DE GOOGLE ADS — INICIO"));

  const accounts = await fetchAllAccountsData();

  if (accounts.length === 0) {
    console.error("❌ No se obtuvo data de ninguna cuenta. Abortando.");
    process.exit(1);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    accountsCount: accounts.length,
    accounts: [],
  };

  for (const account of accounts) {
    console.log(header(`📊 CUENTA: ${account.account} (${account.accountId})`));

    const [performance, anomalies] = await Promise.all([
      analyze(performancePrompt(account), "performance"),
      analyze(anomalyPrompt(account), "anomalías"),
    ]);

    console.log(header("🔥 PERFORMANCE"));
    console.log(performance);

    console.log(header("⚠️  ANOMALÍAS"));
    console.log(anomalies);

    report.accounts.push({
      ...account,
      analysis: { performance, anomalies },
    });
  }

  if (accounts.length > 1) {
    const summary = accounts.map(summarizeAccount);
    console.log(header("🌐 ANÁLISIS CROSS-ACCOUNT"));
    const cross = await analyze(crossAccountPrompt(summary), "cross-account");
    console.log(cross);
    report.crossAccount = { summary, analysis: cross };
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `report-ads-${ts}.json`;
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(header(`💾 Reporte JSON: ${filename}`));

  try {
    const htmlPath = buildReport(report, filename.replace(/\.json$/, ".html"));
    console.log(`📊 Reporte HTML: ${htmlPath}`);
    console.log(`   Abrilo con doble click para ver el dashboard.`);
  } catch (err) {
    console.error(`⚠️  No pude generar el HTML: ${err.message}`);
  }
}

run().catch((err) => {
  console.error("\n❌ Error fatal:", err.message);
  process.exit(1);
});
