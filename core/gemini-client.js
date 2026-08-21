// Cliente Gemini compartido con reintentos — usado por los scripts de CLI que llaman a Gemini.
const { GoogleGenerativeAI } = require("@google/generative-ai");

let model = null;
function getModel() {
  if (!model) {
    const { GEMINI_API_KEY } = process.env;
    if (!GEMINI_API_KEY) throw new Error("Falta GEMINI_API_KEY en .env");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  return model;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isRetryableError(err) {
  const msg = err?.message || String(err);
  const status = err?.status || err?.response?.status;
  if (status === 429 || status === 503 || status === 500 || status === 502 || status === 504) return true;
  return /\b(429|500|502|503|504)\b|rate.?limit|quota|resource.?exhausted|too many requests|service unavailable|high demand|internal error|temporarily/i.test(msg);
}

async function generateWithRetry(prompt, label, { maxAttempts = 4, baseDelayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await getModel().generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const isLast = attempt === maxAttempts;
      if (!isRetryableError(err) || isLast) {
        return `⚠️  Error generando análisis (${label}): ${err?.message || err}`;
      }
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `⏳ ${label}: error transitorio (intento ${attempt}/${maxAttempts}). Reintentando en ${delay / 1000}s...`
      );
      await sleep(delay);
    }
  }
}

module.exports = { generateWithRetry, isRetryableError };
