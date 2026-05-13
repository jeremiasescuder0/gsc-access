require("dotenv").config();
const { google } = require("googleapis");
const { getOAuthClient } = require("./oauth-client");

const { GSC_SITE_URL } = process.env;

async function run() {
  const auth = await getOAuthClient();
  const searchconsole = google.searchconsole({ version: "v1", auth });

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

run().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
