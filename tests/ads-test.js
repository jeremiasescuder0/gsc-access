import { google } from "googleapis";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

auth.setCredentials(JSON.parse(fs.readFileSync("token.json")));

async function run() {
  const customerId = process.env.CUSTOMER_ID.replace(/-/g, "");

  const query = `
    SELECT
      campaign.name,
      metrics.clicks,
      metrics.impressions
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
  `;

  const headers = {
    "developer-token": process.env.DEVELOPER_TOKEN,
    "Content-Type": "application/json"
  };

  // 👉 si usás MCC, descomentá esto:
  // headers["login-customer-id"] = process.env.LOGIN_CUSTOMER_ID.replace(/-/g, "");

  const res = await auth.request({
    url: `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:search`,
    method: "POST",
    headers,
    data: { query }
  });

  console.log(JSON.stringify(res.data, null, 2));
}

run();