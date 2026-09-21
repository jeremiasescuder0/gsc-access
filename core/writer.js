// Writer de Gemini (sección 11 del spec): recibe reglas globales + perfil del cliente + un Blog
// Project con las keywords YA investigadas, y devuelve el artículo en Markdown más su metadata
// (meta title/description, slug, links internos, concepto de imagen). No decide keywords ni
// las redescubre — para eso están core/opportunity-engine.js y core/keyword-research.js.
//
// No persiste nada: el caller (web/lib/blog-data.ts) guarda el resultado en project.draft y
// mueve el proyecto a draft_ready. Nada se publica solo.

const { generateTextWithRetry } = require("./gemini-client");
const { buildWriterPrompt, parseWriterResponse, validateWriterResult } = require("./prompts/writer");

const WRITER_TIMEOUT_MS = 110_000; // artículos de 1000+ palabras tardan más que una llamada común

function countWords(markdown) {
  return markdown
    .replace(/^#+\s+/gm, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

async function generateBlogDraft({ project, clientProfile, globalRules }) {
  if (!project?.primaryKeyword) {
    throw new Error("El proyecto no tiene keyword principal. Investigá o cargá las keywords antes de generar el artículo.");
  }

  const prompt = buildWriterPrompt({ globalRules, clientProfile, project });

  let raw;
  try {
    raw = await generateTextWithRetry(prompt, `writer:${project.id}`, {
      maxAttempts: 2,
      timeoutMs: WRITER_TIMEOUT_MS,
    });
  } catch (err) {
    throw new Error(`Gemini no pudo generar el artículo: ${err.message}`);
  }

  const { meta, article } = validateWriterResult(parseWriterResponse(raw));

  return {
    content: article,
    title: meta.title.trim(),
    metaTitle: meta.meta_title.trim(),
    metaDescription: meta.meta_description.trim(),
    slug: meta.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    suggestedInternalLinks: meta.suggested_internal_links
      .filter((l) => l && typeof l.url === "string")
      .map((l) => ({ anchor: String(l.anchor || ""), url: String(l.url) })),
    suggestedImageConcept: meta.suggested_image_concept.trim(),
    wordCount: countWords(article),
    model: "gemini-2.5-flash",
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { generateBlogDraft, countWords };
