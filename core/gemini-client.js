// Cliente Gemini compartido con reintentos — usado por los scripts de CLI y por core/keyword-research.js.
require("./env");
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

// El SDK de @google/generative-ai no tiene timeout por default — un request puede quedar
// colgado indefinidamente si la respuesta nunca llega (confirmado en pruebas: un prompt grande
// se quedó esperando varios minutos sin error ni respuesta). generateJsonWithRetry pasa este
// timeout explícito por request; al vencer, el SDK aborta con GoogleGenerativeAIAbortError, que
// se trata como transitorio (reintentable) más abajo.
const DEFAULT_TIMEOUT_MS = 60_000;

function isRetryableError(err) {
  const msg = err?.message || String(err);
  const status = err?.status || err?.response?.status;
  if (status === 429 || status === 503 || status === 500 || status === 502 || status === 504) return true;
  return /\b(429|500|502|503|504)\b|rate.?limit|quota|resource.?exhausted|too many requests|service unavailable|high demand|internal error|temporarily|timeout|timed out|aborted/i.test(
    msg
  );
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

function stripJsonFences(text) {
  return text.replace(/^```(json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

// Carrera contra un timeout propio, independiente del `requestOptions.timeout` del SDK. En
// pruebas, un request que se cuelga leyendo el body de la respuesta (no al conectar) a veces no
// se aborta igual con la señal del SDK — este wrapper garantiza que el código SIEMPRE recupera
// el control pasado `ms`, aunque el fetch interno siga colgado de fondo.
function withHardTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout esperando respuesta de Gemini (${label}) después de ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Variante para lógica de aplicación (no reportes para humanos): a diferencia de
// generateWithRetry, ESTA SÍ LANZA en vez de devolver un string de error — el caller tiene que
// poder distinguir "Gemini falló" de "Gemini contestó esto". Parsea y valida que la respuesta
// sea JSON antes de devolverla; nunca pasa texto crudo a la lógica de negocio (sección 21 del
// spec: no confiar ciegamente en la salida del modelo).
async function generateJsonWithRetry(
  prompt,
  label,
  { maxAttempts = 4, baseDelayMs = 2000, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await withHardTimeout(
        getModel().generateContent(prompt, { timeout: timeoutMs }),
        timeoutMs + 5000,
        label
      );
      const text = result.response.text();
      const cleaned = stripJsonFences(text);
      try {
        return JSON.parse(cleaned);
      } catch (parseErr) {
        throw new Error(
          `Gemini devolvió una respuesta no-JSON para "${label}": ${parseErr.message}. Texto recibido: ${text.slice(0, 300)}`
        );
      }
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const isLast = attempt === maxAttempts;
      if (!isRetryableError(err) || isLast) throw lastErr;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `⏳ ${label}: error transitorio (intento ${attempt}/${maxAttempts}). Reintentando en ${delay / 1000}s...`
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

// Como generateJsonWithRetry (lanza, timeout duro, reintentos) pero devuelve el texto crudo.
// Para respuestas largas de prosa (el Writer de blogs): meter un Markdown de 1000+ palabras
// adentro de un string JSON es frágil (comillas/saltos de línea sin escapar rompen el parse),
// así que el caller define su propio formato delimitado y lo parsea.
async function generateTextWithRetry(
  prompt,
  label,
  { maxAttempts = 3, baseDelayMs = 2000, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await withHardTimeout(
        getModel().generateContent(prompt, { timeout: timeoutMs }),
        timeoutMs + 5000,
        label
      );
      return result.response.text();
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const isLast = attempt === maxAttempts;
      if (!isRetryableError(err) || isLast) throw lastErr;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `⏳ ${label}: error transitorio (intento ${attempt}/${maxAttempts}). Reintentando en ${delay / 1000}s...`
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

module.exports = { generateWithRetry, generateJsonWithRetry, generateTextWithRetry, isRetryableError };
