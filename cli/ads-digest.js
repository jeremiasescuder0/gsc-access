// Digest semanal de Ads: corre la detección de anomalías (mismos criterios que analyze-ads-gemini.js)
// sobre todas las cuentas del MCC y manda un resumen por email. Pensado para correr desatendido vía
// Task Scheduler / cron — no imprime reportes largos, solo lo que requiere atención.
require("dotenv").config();
const nodemailer = require("nodemailer");
const { fetchAllAccountsData } = require("../core/ads-fetch");
const { generateWithRetry } = require("../core/gemini-client");
const { anomalyPrompt, crossAccountPrompt, summarizeAccount } = require("../core/ads-analysis");

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Falta GEMINI_API_KEY en .env");
  process.exit(1);
}

const { EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, EMAIL_SMTP_USER, EMAIL_SMTP_PASS, EMAIL_FROM, EMAIL_TO } = process.env;

function assertEmailConfig() {
  const required = ["EMAIL_SMTP_HOST", "EMAIL_SMTP_PORT", "EMAIL_SMTP_USER", "EMAIL_SMTP_PASS", "EMAIL_TO"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Falta configurar en .env: ${missing.join(", ")}`);
    process.exit(1);
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function textToHtmlParagraphs(text) {
  if (!text) return "";
  return text
    .split(/\r?\n\r?\n/)
    .filter((p) => p.trim())
    .map(
      (para) =>
        `<p style="margin:0 0 12px;white-space:pre-wrap;font-size:13px;color:#374151;line-height:1.5;">${escapeHtml(
          para
        ).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`
    )
    .join("");
}

function parseAnomalies(text) {
  if (!text) return [];
  const trimmed = text.trim();
  if (/^sin anomal[ií]as detectadas/i.test(trimmed)) return [];
  const blocks = trimmed.split(/(?=ANOMAL[ÍI]A\s*#\d+)/i).filter((b) => /ANOMAL[ÍI]A\s*#\d+/i.test(b));
  if (!blocks.length) return [{ tipo: "SIN CLASIFICAR", elemento: "", metrica: "", umbral: "", impacto: "", accion: trimmed }];
  const field = (block, label) => {
    const m = block.match(new RegExp(`-\\s*${label}:\\s*(.+)`, "i"));
    return m ? m[1].trim() : "";
  };
  return blocks.map((block) => ({
    tipo: field(block, "Tipo"),
    elemento: field(block, "Elemento afectado"),
    metrica: field(block, "Métrica observada"),
    umbral: field(block, "Umbral esperado"),
    impacto: field(block, "Impacto"),
    accion: field(block, "Acción concreta"),
  }));
}

function impactColor(impacto) {
  const v = (impacto || "").toLowerCase();
  if (v.includes("alto")) return "#dc2626";
  if (v.includes("medio")) return "#d97706";
  return "#6b7280";
}

function buildDigestHtml({ accountResults, crossAccountText, generatedAt }) {
  const dateStr = generatedAt.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
  const flagged = accountResults.filter((r) => r.anomalies.length > 0);
  const clean = accountResults.filter((r) => r.anomalies.length === 0);

  const flaggedHtml = flagged
    .map(
      (r) => `
    <div style="margin-bottom:20px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="margin:0 0 12px;font-size:15px;color:#111827;">${escapeHtml(r.account)}</h2>
      ${r.anomalies
        .map(
          (a) => `
        <div style="margin-bottom:12px;padding-left:12px;border-left:3px solid ${impactColor(a.impacto)};">
          <div style="font-weight:600;font-size:13px;color:${impactColor(a.impacto)};">${escapeHtml(
            a.tipo
          )}${a.impacto ? ` · impacto ${escapeHtml(a.impacto)}` : ""}</div>
          ${a.elemento ? `<div style="font-size:13px;color:#374151;"><strong>Elemento:</strong> ${escapeHtml(a.elemento)}</div>` : ""}
          ${a.metrica ? `<div style="font-size:13px;color:#374151;"><strong>Métrica:</strong> ${escapeHtml(a.metrica)}${a.umbral ? ` (esperado: ${escapeHtml(a.umbral)})` : ""}</div>` : ""}
          ${a.accion ? `<div style="font-size:13px;color:#111827;"><strong>Acción:</strong> ${escapeHtml(a.accion)}</div>` : ""}
        </div>`
        )
        .join("")}
    </div>`
    )
    .join("");

  const cleanHtml = clean.length
    ? `<p style="font-size:13px;color:#6b7280;margin-top:8px;">✅ Sin anomalías: ${clean
        .map((r) => escapeHtml(r.account))
        .join(", ")}</p>`
    : "";

  const crossHtml = crossAccountText
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
         <h2 style="font-size:15px;color:#111827;margin:0 0 8px;">🌐 Análisis cross-account</h2>
         ${textToHtmlParagraphs(crossAccountText)}
       </div>`
    : "";

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;">
    <h1 style="font-size:18px;margin:0 0 4px;">📊 Digest semanal de Google Ads</h1>
    <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">${dateStr} · ${accountResults.length} cuenta${
    accountResults.length === 1 ? "" : "s"
  } analizada${accountResults.length === 1 ? "" : "s"}</p>
    ${
      flagged.length
        ? flaggedHtml
        : '<p style="font-size:14px;color:#059669;">✅ No se detectaron anomalías en ninguna cuenta esta semana.</p>'
    }
    ${cleanHtml}
    ${crossHtml}
    <p style="margin-top:32px;font-size:11px;color:#9ca3af;">Generado automáticamente por gsc-access · ads-digest</p>
  </div>`;
}

async function sendEmail({ subject, html }) {
  const transporter = nodemailer.createTransport({
    host: EMAIL_SMTP_HOST,
    port: Number(EMAIL_SMTP_PORT),
    secure: Number(EMAIL_SMTP_PORT) === 465,
    auth: { user: EMAIL_SMTP_USER, pass: EMAIL_SMTP_PASS },
  });

  await transporter.sendMail({
    from: EMAIL_FROM || EMAIL_SMTP_USER,
    to: EMAIL_TO,
    subject,
    html,
  });
}

async function run() {
  console.log("🚀 Generando digest semanal de Ads...");
  assertEmailConfig();

  const accounts = await fetchAllAccountsData();
  if (accounts.length === 0) {
    console.error("❌ No se obtuvo data de ninguna cuenta. Abortando.");
    process.exit(1);
  }

  const accountResults = [];
  for (const account of accounts) {
    console.log(`  → Analizando ${account.account}...`);
    const anomaliesText = await generateWithRetry(anomalyPrompt(account), `anomalías:${account.account}`);
    accountResults.push({
      account: account.account,
      accountId: account.accountId,
      anomalies: parseAnomalies(anomaliesText),
    });
  }

  let crossAccountText = null;
  if (accounts.length > 1) {
    console.log("  → Análisis cross-account...");
    const summary = accounts.map(summarizeAccount);
    crossAccountText = await generateWithRetry(crossAccountPrompt(summary), "cross-account");
  }

  const flaggedCount = accountResults.filter((r) => r.anomalies.length > 0).length;
  const generatedAt = new Date();
  const html = buildDigestHtml({ accountResults, crossAccountText, generatedAt });
  const dateForSubject = generatedAt.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const subject =
    flaggedCount > 0
      ? `📊 Digest Ads — ${flaggedCount} cuenta${flaggedCount === 1 ? "" : "s"} con anomalías (${dateForSubject})`
      : `📊 Digest Ads — sin anomalías (${dateForSubject})`;

  console.log(`  → Enviando email a ${EMAIL_TO}...`);
  await sendEmail({ subject, html });
  console.log("✅ Digest enviado.");
}

run().catch((err) => {
  console.error("\n❌ Error fatal:", err.message);
  process.exit(1);
});
