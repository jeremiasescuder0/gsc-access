require("dotenv").config();
const fs = require("fs");
const readline = require("readline");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Usage:
//   node blog-audit.js "texto del blog"
//   node blog-audit.js --file=draft.txt
//   node blog-audit.js --file=draft.txt --keyword="consultoría impositiva"
//
// Si no pasás texto ni archivo, lee desde stdin (podés pegar el texto y Ctrl+D).

const { GEMINI_API_KEY } = process.env;
if (!GEMINI_API_KEY) {
  console.error("Falta GEMINI_API_KEY en .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function parseArgs() {
  const args = process.argv.slice(2);
  let file = null;
  let keyword = null;
  const textParts = [];

  for (const arg of args) {
    if (arg.startsWith("--file=")) {
      file = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--keyword=")) {
      keyword = arg.split("=").slice(1).join("=");
    } else {
      textParts.push(arg);
    }
  }

  return { file, keyword, inlineText: textParts.join(" ") || null };
}

async function readStdin() {
  const rl = readline.createInterface({ input: process.stdin });
  const lines = [];
  for await (const line of rl) {
    lines.push(line);
  }
  return lines.join("\n");
}

function buildAuditPrompt(blogText, keyword) {
  const keywordLine = keyword
    ? `Keyword objetivo: "${keyword}"`
    : "Keyword objetivo: no especificada (detectá la principal del texto)";

  return `Actuás como un auditor de contenido SEO y copywriter experto. Auditá el siguiente blog y respondé EN ESPAÑOL con esta estructura exacta.

${keywordLine}

---

1. DIAGNÓSTICO GENERAL
   - Valoración global del artículo (0-10) con justificación en 2 líneas.
   - Longitud estimada: ¿es suficiente para el tema?

2. SEO ON-PAGE
   - Keyword en el título (H1): ¿sí/no? Sugerencia si falta.
   - Keyword en primeros 100 palabras: ¿sí/no?
   - Densidad de keyword: ¿adecuada (<2%), escasa o excesiva?
   - Subtítulos (H2/H3): ¿están bien distribuidos? ¿incluyen variantes de la keyword?
   - Meta description sugerida: <160 caracteres, incluye keyword, llama a la acción>

3. LEGIBILIDAD Y ESTRUCTURA
   - Párrafos: ¿son cortos y escaneables?
   - Tono: ¿es educativo y no técnico? ¿apto para la audiencia?
   - Introducción: ¿engancha al lector en las primeras líneas?
   - Conclusión: ¿cierra con CTA claro?

4. OPORTUNIDADES DE KEYWORDS
   - Variantes o keywords relacionadas que debería incluir pero no aparecen.
   - Palabras que usa en exceso y que podría reemplazar con sinónimos.

5. CORRECCIONES PRIORITARIAS (top 3)
   - Listá las 3 cosas más urgentes a cambiar, ordenadas por impacto SEO.
   - Sé específico: indicá qué cambiar y cómo.

6. PROMPT PARA CHATGPT
   Generá un prompt listo para pegar en ChatGPT que le pida incorporar todas las correcciones de arriba al texto original, manteniendo el tono y estructura del artículo.

---
TEXTO A AUDITAR:
${blogText}
`;
}

async function run() {
  const { file, keyword, inlineText } = parseArgs();

  let blogText = "";

  if (inlineText) {
    blogText = inlineText;
  } else if (file) {
    if (!fs.existsSync(file)) {
      console.error(`Archivo no encontrado: ${file}`);
      process.exit(1);
    }
    blogText = fs.readFileSync(file, "utf8");
  } else {
    if (process.stdin.isTTY) {
      console.log("Pegá el texto del blog y presioná Ctrl+D cuando termines:\n");
    }
    blogText = await readStdin();
  }

  blogText = blogText.trim();
  if (!blogText) {
    console.error("No se recibió texto para auditar.");
    process.exit(1);
  }

  const wordCount = blogText.split(/\s+/).length;
  console.log(`\nAuditando blog (${wordCount} palabras)...`);
  if (keyword) console.log(`Keyword objetivo: "${keyword}"`);
  console.log("");

  const prompt = buildAuditPrompt(blogText, keyword);

  let result;
  let tokenCost;
  try {
    const response = await model.generateContent(prompt);
    result = response.response.text();

    // Gemini 2.5 Flash pricing (USD por millón de tokens)
    const PRICE_INPUT_PER_M  = 0.15;
    const PRICE_OUTPUT_PER_M = 0.60;
    const usage = response.response.usageMetadata;
    if (usage) {
      const inputTokens  = usage.promptTokenCount     || 0;
      const outputTokens = usage.candidatesTokenCount || 0;
      const totalTokens  = usage.totalTokenCount      || inputTokens + outputTokens;
      const costInput    = (inputTokens  / 1_000_000) * PRICE_INPUT_PER_M;
      const costOutput   = (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;
      const costTotal    = costInput + costOutput;
      tokenCost = { inputTokens, outputTokens, totalTokens, costInput, costOutput, costTotal };
    }
  } catch (err) {
    console.error("Error al llamar a Gemini:", err?.message || err);
    process.exit(1);
  }

  console.log("=".repeat(72));
  console.log(result);
  console.log("=".repeat(72));

  if (tokenCost) {
    console.log("\nUSO DE TOKENS (Gemini 2.5 Flash)");
    console.log(`  Entrada : ${tokenCost.inputTokens.toLocaleString()} tokens  → $${tokenCost.costInput.toFixed(6)}`);
    console.log(`  Salida  : ${tokenCost.outputTokens.toLocaleString()} tokens  → $${tokenCost.costOutput.toFixed(6)}`);
    console.log(`  Total   : ${tokenCost.totalTokens.toLocaleString()} tokens  → $${tokenCost.costTotal.toFixed(6)} USD`);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = `blog-audit-${ts}.txt`;
  const fileContent = result + (tokenCost
    ? `\n\n---\nUSO DE TOKENS\nEntrada: ${tokenCost.inputTokens} | Salida: ${tokenCost.outputTokens} | Costo: $${tokenCost.costTotal.toFixed(6)} USD\n`
    : "");
  fs.writeFileSync(outFile, fileContent, "utf8");
  console.log(`\nAudit guardado en: ${outFile}`);
}

run().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
