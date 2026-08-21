// Prompts y agregaciones de Ads compartidos entre el análisis completo (analyze-ads-gemini.js)
// y el digest semanal (ads-digest.js), para no duplicar umbrales/criterios entre ambos.

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

module.exports = { anomalyPrompt, crossAccountPrompt, summarizeAccount };
