require("dotenv").config();
const { google } = require("googleapis");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const { GEMINI_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GSC_SITE_URL } = process.env;

if (!GEMINI_API_KEY || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("❌ Faltan variables de entorno. Revisá tu .env");
  process.exit(1);
}

if (!fs.existsSync("token.json")) {
  console.error("❌ No se encontró token.json. Corré primero: node auth.js");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const token = JSON.parse(fs.readFileSync("token.json"));
const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
oauth2Client.setCredentials(token);

const searchconsole = google.searchconsole({ version: "v1", auth: oauth2Client });

async function run() {
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

run();
