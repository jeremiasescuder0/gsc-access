require("./env");
const { google } = require("googleapis");
const http = require("http");
const fs = require("fs");

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("❌ Faltan variables de entorno. Copiá .env.example a .env y completá los valores.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/adwords",
  ],
});

console.log("\n⚠️  Vas a ver dos pantallas de permisos: aceptá AMBOS (Search Console y Google Ads).\n");
console.log("🔗 Abrí este link en tu navegador:\n");
console.log(url);

http
  .createServer(async (req, res) => {
    if (req.url.includes("code=")) {
      const code = new URL(req.url, GOOGLE_REDIRECT_URI).searchParams.get("code");
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      fs.writeFileSync("token.json", JSON.stringify(tokens, null, 2));
      res.end("Autenticado! Ya podés cerrar.");
      console.log("\n✅ Token guardado en token.json (ignorado por git)");
      process.exit();
    }
  })
  .listen(3000, () => {
    console.log("Server escuchando en http://localhost:3000");
  });
