require("dotenv").config();
const { google } = require("googleapis");
const fs = require("fs");

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GSC_SITE_URL } = process.env;

if (!fs.existsSync("token.json")) {
  console.error("❌ No se encontró token.json. Corré primero: node auth.js");
  process.exit(1);
}

const token = JSON.parse(fs.readFileSync("token.json"));

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials(token);

const searchconsole = google.searchconsole({ version: "v1", auth: oauth2Client });

async function run() {
  const res = await searchconsole.searchanalytics.query({
    siteUrl: GSC_SITE_URL,
    requestBody: {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      dimensions: ["query"],
    },
  });
  console.log(res.data);
}

run();
