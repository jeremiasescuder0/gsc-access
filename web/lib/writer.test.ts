import { describe, it, expect } from "vitest";
const { parseWriterResponse, validateWriterResult, ARTICLE_DELIMITER, buildWriterPrompt } = require("../../core/prompts/writer.js");
const { countWords } = require("../../core/writer.js");

const META = {
  title: "Why Isn't My Business Showing Up on Google? 8 Common SEO Problems",
  meta_title: "Business Not Showing Up on Google? 8 SEO Fixes",
  meta_description: "Learn why your business is not showing up on Google and the eight SEO problems that hide sites from customers.",
  slug: "business-not-showing-up-on-google",
  suggested_internal_links: [{ anchor: "web hosting", url: "/services/hosting" }],
  suggested_image_concept: "A laptop with an empty Google results page.",
};

function article(extra = "") {
  const body = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} about indexing, crawling and ranking signals.`).join(" ");
  return `# ${META.title}\n\n${body}\n\n## 1. Your Website Has Not Been Indexed\n\n${body}${extra}`;
}

describe("writer: parseo y validación", () => {
  it("parsea metadata + artículo separados por el delimitador", () => {
    const raw = `${JSON.stringify(META)}\n${ARTICLE_DELIMITER}\n${article()}`;
    const parsed = parseWriterResponse(raw);
    expect(parsed.meta.slug).toBe(META.slug);
    expect(parsed.article.startsWith("# ")).toBe(true);
  });

  it("tolera fences de markdown alrededor de la metadata y del artículo", () => {
    const raw = "```json\n" + JSON.stringify(META) + "\n```\n" + ARTICLE_DELIMITER + "\n```markdown\n" + article() + "\n```";
    const { meta, article: a } = validateWriterResult(parseWriterResponse(raw));
    expect(meta.title).toBe(META.title);
    expect(a.startsWith("# ")).toBe(true);
  });

  it("falla claro si falta el delimitador", () => {
    expect(() => parseWriterResponse(JSON.stringify(META) + "\n# Title\n\ntext")).toThrow(/delimitador/);
  });

  it("rechaza artículos con más de un H1 y agrega el H1 si falta", () => {
    const twoH1 = article("\n\n# Otro H1");
    expect(() => validateWriterResult({ meta: META, article: twoH1 })).toThrow(/H1/);

    const noH1 = article().replace(/^# .+\n\n/, "");
    const fixed = validateWriterResult({ meta: META, article: noH1 });
    expect((fixed.article.match(/^#\s+/gm) || []).length).toBe(1);
    expect(fixed.article.startsWith(`# ${META.title}`)).toBe(true);
  });

  it("normaliza em/en dashes (regla global: prohibidos)", () => {
    const withDash = article(" Something — with an em dash – and en dash.");
    const { article: a } = validateWriterResult({ meta: META, article: withDash });
    expect(a).not.toMatch(/[—–]/);
  });

  it("rechaza artículos demasiado cortos", () => {
    expect(() => validateWriterResult({ meta: META, article: "# Title\n\nToo short." })).toThrow(/corto/);
  });

  it("countWords ignora los marcadores de heading", () => {
    expect(countWords("# Two Words\n\nthree more words")).toBe(5);
  });

  it("el prompt incluye reglas globales, perfil del cliente y keywords del proyecto, y exige inglés", () => {
    const prompt = buildWriterPrompt({
      globalRules: {
        wordCountRange: [800, 1000],
        seoAeoBalance: { seo: 70, aeo: 30 },
        structure: ["Exactamente un H1"],
        style: ["Sin relleno"],
        restrictions: ["Sin tablas"],
        cta: "CTA suave",
      },
      clientProfile: {
        brandName: "Acme Diesel",
        clientName: "Acme",
        primaryServices: ["DOT inspections"],
        locations: ["Fresno, CA"],
        firstPersonPlural: true,
        wordsToAvoid: ["cheap"],
      },
      project: {
        primaryKeyword: "what fails a dot inspection",
        secondaryKeywords: ["dot inspection checklist"],
        questionKeywords: ["how often is a dot inspection required"],
        semanticKeywords: [],
        evidence: { gsc: { queries: [{ query: "what fails a dot inspection", impressions: 800, position: 18 }] } },
      },
    });
    expect(prompt).toContain("Acme Diesel");
    expect(prompt).toContain("what fails a dot inspection");
    expect(prompt).toContain("dot inspection checklist");
    expect(prompt).toContain("800-1000");
    expect(prompt).toContain("cheap");
    expect(prompt).toMatch(/EN INGLÉS/);
    expect(prompt).toContain(ARTICLE_DELIMITER);
  });
});
