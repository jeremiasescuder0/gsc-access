import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, type CoreMessage } from "ai";
import {
  getAccountById,
  getAllAccounts,
  getCampaignDetail,
  summarizeAccount,
} from "@/lib/ads-data";
import { getSitePerformance } from "@/lib/gsc-data";
import { getGa4Overview } from "@/lib/ga4-data";
import { withAuth } from "@/lib/auth/with-auth";

export const maxDuration = 60;

const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const SYSTEM_BASE = `Sos un estratega senior de marketing digital (Google Ads, SEO y Google Analytics) con 10+ años de experiencia analizando cuentas de agencia. Respondés SIEMPRE en español rioplatense, sin emojis, con tono directo y profesional.

Reglas de contenido:
- Citá números concretos extraídos del JSON, nunca inventes métricas.
- Si la data es insuficiente para responder, decilo explícitamente en vez de especular.
- Si te piden recomendaciones, ordenalas por impacto esperado.
- Para ROAS: usá conversionsValue/cost*100 (porcentaje). Para CPA: cost/conversions.
- CTR viene como decimal en la data (0.05 = 5%).
- searchImpressionShare = 0.0999 suele indicar dato limitado/placeholder, no IS real bajo.

Reglas para análisis de copy (headlines y descriptions):
- Un headline débil es genérico ("Somos los mejores", "Llamanos hoy"), demasiado largo (>30 chars), o duplica a otro.
- Un headline fuerte incluye: keyword principal, propuesta de valor concreta, o CTA específico.
- Al auditar headlines, señalá: cuáles son redundantes entre sí, cuáles no aprovechan los 30 chars, y cuáles no comunican diferenciación.
- Las descriptions deben cubrir: beneficio principal, prueba social o credencial, y CTA. Si no lo hacen, señalalo.
- Cuando sugerís reemplazos, respetá el límite de 30 chars para headlines y 90 chars para descriptions.
- Los headlines pinneados en posición 1 o 2 son críticos — si son débiles, es una prioridad de primer nivel.

Reglas de formato (Markdown):
- Usá Markdown estándar: **negrita** para énfasis, listas con "-" (no "*"), y headings "##" sólo cuando hagan falta secciones largas.
- NO anides listas más de un nivel. Si necesitás detallar, usá negrita inline en lugar de sub-bullets.
- NO uses "*   " ni viñetas con asterisco. Usá guiones "- ".
- Respuestas cortas: párrafos directos sin listas. Listas sólo si hay 3+ items paralelos.
- Sin saludos ni "Aquí tienes..." al principio. Entrá directo al análisis.`;

function buildAccountContext(account: Awaited<ReturnType<typeof getAccountById>>) {
  if (!account) return "";
  const summary = summarizeAccount(account);
  return `\n\nCONTEXTO DE LA CUENTA ACTIVA:
Nombre: ${account.account}
ID: ${account.accountId}
Moneda: ${account.currency || "N/A"}
Resumen: ${JSON.stringify(summary, null, 2)}

CAMPAÑAS (últimos 30 días):
${JSON.stringify(account.campaigns, null, 2)}

AD GROUPS:
${JSON.stringify(account.adGroups, null, 2)}

SEARCH TERMS (top 30 por costo):
${JSON.stringify(account.searchTerms, null, 2)}

CONVERSIONES:
${JSON.stringify(account.conversions, null, 2)}`;
}

async function buildCampaignContext(accountId: string, campaignId: string) {
  const [account, detail] = await Promise.all([
    getAccountById(accountId),
    getCampaignDetail(accountId, campaignId),
  ]);
  if (!detail.campaign) return "";

  const accountHeader = account
    ? `Cuenta: ${account.account} (${account.accountId}) · Moneda: ${account.currency || "N/A"}\n`
    : "";

  const channelType = String(detail.campaign.channelType ?? "");
  const isPMax = channelType === "PERFORMANCE_MAX" || channelType === "10";

  const adsSection = isPMax
    ? `ASSET GROUPS (Performance Max — reemplazan a los ad groups):
${JSON.stringify(detail.assetGroups ?? [], null, 2)}

ASSETS (headlines, descriptions, imágenes, videos, CTAs — agrupados por asset group):
${JSON.stringify(detail.assets ?? [], null, 2)}`
    : `AD GROUPS DE LA CAMPAÑA:
${JSON.stringify(detail.adGroups, null, 2)}

ADS (headlines, descriptions, paths — cada anuncio con métricas):
${JSON.stringify(detail.ads, null, 2)}

KEYWORDS ACTIVAS (con quality score si aplica, match type, métricas):
${JSON.stringify(detail.keywords, null, 2)}

SEARCH TERMS (top 50 por costo):
${JSON.stringify(detail.searchTerms, null, 2)}`;

  return `\n\nCONTEXTO DE LA CAMPAÑA ACTIVA (zoom-in completo):
${accountHeader}Campaña: ${detail.campaign.name} (ID ${detail.campaign.id})
Tipo: ${detail.campaign.channelType}${isPMax ? " (Performance Max)" : ""} · Puja: ${detail.campaign.biddingStrategyType}
Budget diario: ${detail.campaign.dailyBudget}

MÉTRICAS DE LA CAMPAÑA:
${JSON.stringify(detail.campaign, null, 2)}

${adsSection}

UBICACIONES GEO (top por costo):
${JSON.stringify(detail.geo, null, 2)}

Cuando te pregunten sobre atributos específicos (headlines, keywords, assets, ubicaciones, etc.), respondé con los items concretos del JSON. Para decisiones de optimización (pausar, ajustar puja, agregar negativas, cambiar headlines/assets), justificá con métricas exactas.
${isPMax ? "\nNota: esta campaña es Performance Max. No tiene keywords ni search terms directos — usá assets y asset groups para el análisis de copy." : ""}`;
}

async function buildPortfolioContext() {
  const accounts = await getAllAccounts();
  const summaries = accounts.map(summarizeAccount);
  return `\n\nCONTEXTO DEL PORTFOLIO (sin cuenta específica):
${JSON.stringify(summaries, null, 2)}`;
}

async function buildOrganicContext(siteUrl: string) {
  const data = await getSitePerformance(siteUrl);
  return `\n\nCONTEXTO ORGÁNICO (Google Search Console):
Sitio: ${siteUrl}
Período actual: ${data.ranges.current.startDate} → ${data.ranges.current.endDate}
Período previo: ${data.ranges.previous.startDate} → ${data.ranges.previous.endDate}
Mismo período año anterior: ${data.ranges.yearOverYear.startDate} → ${data.ranges.yearOverYear.endDate}

TOTALES (current vs previous vs year-over-year + deltas):
${JSON.stringify(data.totals, null, 2)}

QUERIES TOP (con comparativa vs período previo):
${JSON.stringify(data.queries.slice(0, 50), null, 2)}

PÁGINAS TOP (con comparativa vs período previo):
${JSON.stringify(data.pages.slice(0, 30), null, 2)}

OPORTUNIDADES (queries en posición 11-30 con ≥100 impresiones — casi en página 1, ganables sin necesidad de mucha autoridad de dominio):
${JSON.stringify(data.opportunities, null, 2)}

PÁGINAS DE BLOG (filtradas por patrón ${data.blogPattern}):
${JSON.stringify(data.blogPages.slice(0, 30), null, 2)}

Reglas para análisis SEO:
- CTR viene como decimal (0.05 = 5%).
- Position más baja es mejor (1 = top).
- Si una query subió de posición 25 a 15, eso es bueno aunque "delta.position" sea negativo.
- Para recomendaciones de contenido, priorizá oportunidades (pos 11-30 con buen volumen) sobre keywords donde el sitio rankea posición 50+ (difícil pelear con baja autoridad).
- Para identificar patrones en blogs, agrupá por temas/subdirectorios visibles en las URLs.`;
}

// Contexto de Google Analytics 4. Cuando además hay siteUrl, se agrega el cruce con Search
// Console: GSC dice "Google mostró la página", GA4 dice "qué hizo la gente que entró".
async function buildAnalyticsContext(ga4PropertyId: string, siteUrl?: string) {
  const [ga4, gsc] = await Promise.all([
    getGa4Overview(ga4PropertyId, { periodDays: 30 }),
    siteUrl ? getSitePerformance(siteUrl).catch(() => null) : Promise.resolve(null),
  ]);

  let crossSection = "";
  if (gsc) {
    // Join por path: GSC devuelve URLs completas, GA4 devuelve paths (landingPagePlusQueryString).
    const toPath = (url: string) => {
      try {
        const u = new URL(url);
        return u.pathname + u.search;
      } catch {
        return url;
      }
    };
    const gscByPath = new Map(gsc.pages.map((p) => [toPath(p.page), p]));
    const joined = ga4.landingPages.map((lp) => {
      const g = gscByPath.get(lp.page);
      return {
        page: lp.page,
        gsc: g ? { impressions: g.impressions, clicks: g.clicks, ctr: g.ctr, position: g.position } : null,
        ga4: {
          sessions: lp.sessions,
          engagementRate: lp.engagementRate,
          avgEngagementTimeSec: Math.round(lp.avgEngagementTime),
          keyEvents: lp.keyEvents,
        },
      };
    });
    crossSection = `

CRUCE SEARCH CONSOLE ↔ ANALYTICS POR LANDING PAGE (mismo path; gsc=null significa que GSC no tiene esa página en su top 100 del período):
${JSON.stringify(joined, null, 2)}

TOTALES ORGÁNICOS DE SEARCH CONSOLE (para dimensionar la visibilidad): ${JSON.stringify(gsc.totals.current)}

Usá el cruce para detectar: páginas con impresiones/clicks pero sin key events (problema de conversión o intención), páginas con alto engagement pero pocas impresiones (oportunidad SEO), y desajustes entre clicks de GSC y sesiones orgánicas de GA4.`;
  }

  return `\n\nCONTEXTO DE GOOGLE ANALYTICS 4 (propiedad ${ga4PropertyId}):
Período actual: ${ga4.ranges.current.startDate} → ${ga4.ranges.current.endDate}
Período previo: ${ga4.ranges.previous.startDate} → ${ga4.ranges.previous.endDate}

TOTALES (current vs previous vs year-over-year + deltas; engagementRate es decimal 0-1; avgEngagementTime en segundos por sesión):
${JSON.stringify(ga4.totals, null, 2)}

CANALES (sessionDefaultChannelGroup):
${JSON.stringify(ga4.channels, null, 2)}

LANDING PAGES TOP (por sesiones):
${JSON.stringify(ga4.landingPages.slice(0, 30), null, 2)}

DISPOSITIVOS:
${JSON.stringify(ga4.devices, null, 2)}

KEY EVENTS POR NOMBRE (conversiones configuradas en GA4):
${JSON.stringify(ga4.keyEventsByName, null, 2)}
${crossSection}

Reglas para análisis de Analytics:
- "Key events" son las conversiones configuradas por el cliente en GA4. Si la lista por nombre está vacía, decí que no hay key events configurados en vez de asumir conversiones.
- Una tasa de engagement baja con muchas sesiones suele indicar tráfico poco calificado o una landing que no responde a la intención.
- Al recomendar, priorizá por impacto en key events y sesiones con engagement, no por sesiones brutas.
- GA4 tiene 24-48 h de demora; no interpretes los últimos 1-2 días como caída.`;
}

export const POST = withAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const messages: CoreMessage[] = body.messages || [];
    const accountId: string | undefined = body.accountId;
    const campaignId: string | undefined = body.campaignId;
    const siteUrl: string | undefined = body.siteUrl;
    const ga4PropertyId: string | undefined =
      typeof body.ga4PropertyId === "string" && /^\d+$/.test(body.ga4PropertyId) ? body.ga4PropertyId : undefined;

    let context = "";
    if (ga4PropertyId) {
      context = await buildAnalyticsContext(ga4PropertyId, siteUrl);
    } else if (siteUrl) {
      context = await buildOrganicContext(siteUrl);
    } else if (accountId && campaignId) {
      context = await buildCampaignContext(accountId, campaignId);
    } else if (accountId) {
      const account = await getAccountById(accountId);
      context = buildAccountContext(account);
    } else {
      context = await buildPortfolioContext();
    }

    const result = streamText({
      model: googleAI("gemini-2.5-flash"),
      system: SYSTEM_BASE + context,
      messages,
      temperature: 0.4,
      onError: ({ error }) => {
        console.error("[chat stream error]", error);
      },
    });

    return result.toDataStreamResponse({
      getErrorMessage: (err) => {
        console.error("[chat response error]", err);
        return err instanceof Error ? err.message : String(err);
      },
    });
  } catch (err) {
    console.error("[chat handler error]", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
