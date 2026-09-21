import { NextResponse } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { getSitePerformance } from "@/lib/gsc-data";
import { withAuth } from "@/lib/auth/with-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SPAM_PATTERNS = [
  "casino", "slot", "slots", "gambling", "poker", "bet", "betting",
  "bonus", "jackpot", "roulette", "blackjack", "baccarat", "sportsbetting",
  "forex", "crypto invest", "pill", "viagra", "cialis", "pharmacy",
  "payday loan", "cheap", "buy now", "discount",
];

function isSpamQuery(query: string): boolean {
  const q = query.toLowerCase();
  return SPAM_PATTERNS.some((p) => q.includes(p));
}

function isSpamPage(page: string): boolean {
  const url = page.toLowerCase();
  return (
    SPAM_PATTERNS.some((p) => url.includes(p)) ||
    /[?&](lang|page|cat|id|ref|utm_content|bonus|promo)=[a-z0-9\-]{20,}/i.test(url)
  );
}

const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const GET = withAuth(async (
  req: Request,
  { params }: { params: Promise<{ siteUrl: string }> }
) => {
  const { siteUrl: encoded } = await params;
  const siteUrl = decodeURIComponent(encoded);

  try {
    const data = await getSitePerformance(siteUrl, { periodDays: 90 });

    const spamQueries = data.queries
      .filter((r) => isSpamQuery(r.query))
      .map((r) => ({ query: r.query, impressions: r.impressions, clicks: r.clicks, position: r.position }));

    const suspiciousPages = data.pages
      .filter((r) => isSpamPage(r.page))
      .map((r) => ({ page: r.page, impressions: r.impressions, clicks: r.clicks }));

    const softFourOhFourPages = data.pages
      .filter((r) => r.impressions > 50 && r.clicks === 0 && !isSpamPage(r.page))
      .slice(0, 20)
      .map((r) => ({ page: r.page, impressions: r.impressions }));

    const hasIssues = spamQueries.length > 0 || suspiciousPages.length > 0;

    if (!hasIssues && softFourOhFourPages.length === 0) {
      return NextResponse.json({
        spamQueries: [],
        suspiciousPages: [],
        softFourOhFourPages: [],
        analysis: "No se detectaron queries ni páginas con patrones de spam en los últimos 90 días. El sitio parece limpio desde la perspectiva de Search Console.",
        robotsTxtRules: null,
        htaccessRules: null,
      });
    }

    const prompt = `Sos un especialista en seguridad SEO. Analizá los siguientes datos de Google Search Console para el sitio ${siteUrl} (últimos 90 días) y determiná si hay un ataque de spam injection activo.

QUERIES CON PATRONES SOSPECHOSOS (${spamQueries.length}):
${JSON.stringify(spamQueries, null, 2)}

PÁGINAS CON URLs SOSPECHOSAS (${suspiciousPages.length}):
${JSON.stringify(suspiciousPages, null, 2)}

PÁGINAS CON 0 CLICKS Y >50 IMPRESIONES (posibles soft-404 indexadas):
${JSON.stringify(softFourOhFourPages, null, 2)}

Respondé en JSON con esta estructura exacta (sin markdown wrapping, solo el JSON puro):
{
  "severity": "none|low|medium|high",
  "summary": "2-3 oraciones describiendo el problema concreto y su impacto en crawl budget/rankings",
  "spamCategories": ["lista de categorías detectadas, ej: casino, gambling, pharmacy"],
  "estimatedCrawlWaste": "estimación del % de crawl budget perdido en spam",
  "robotsTxtRules": "bloque listo para pegar en robots.txt, solo las líneas Disallow nuevas",
  "htaccessRules": "bloque completo RewriteCond/RewriteRule listo para pegar en .htaccess",
  "additionalRecommendations": ["lista de acciones adicionales recomendadas"]
}`;

    const result = await generateText({
      model: googleAI("gemini-2.5-flash"),
      prompt,
      temperature: 0.2,
    });

    let analysis;
    try {
      const cleaned = result.text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = { summary: result.text };
    }

    return NextResponse.json({
      spamQueries,
      suspiciousPages,
      softFourOhFourPages,
      ...analysis,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
