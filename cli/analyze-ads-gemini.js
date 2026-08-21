require("dotenv").config();
const fs = require("fs");
const { fetchAllAccountsData } = require("../core/ads-fetch");
const { buildReport } = require("./build-report");
const { generateWithRetry: analyze } = require("../core/gemini-client");
const { anomalyPrompt, crossAccountPrompt, summarizeAccount } = require("../core/ads-analysis");

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Falta GEMINI_API_KEY en .env");
  process.exit(1);
}

function header(title) {
  const line = "─".repeat(72);
  return `\n${line}\n${title}\n${line}`;
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
