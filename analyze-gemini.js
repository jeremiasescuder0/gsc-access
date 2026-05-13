require("dotenv").config();
const { google } = require("googleapis");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getOAuthClient } = require("./oauth-client");

const { GEMINI_API_KEY, GSC_SITE_URL } = process.env;

if (!GEMINI_API_KEY) {
  console.error("❌ Falta GEMINI_API_KEY en .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function run() {
  const auth = await getOAuthClient();
  const searchconsole = google.searchconsole({ version: "v1", auth });

  const res = await searchconsole.searchanalytics.query({
    siteUrl: GSC_SITE_URL,
    requestBody: {
      startDate: "2025-01-01",
      endDate: "2025-02-01",
      dimensions: ["query"],
      rowLimit: 20,
    },
  });

  const rows = res.data.rows || [];
  const formatted = rows.map(r => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));

  const prompt = `
You are an SEO expert.

Analyze this Google Search Console data and provide:
1. Top opportunities (high impressions, low CTR)
2. Quick wins (positions 2-10)
3. Content ideas

Data:
${JSON.stringify(formatted, null, 2)}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  console.log("\n🔥 INSIGHTS:\n");
  console.log(text);
}

run().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
