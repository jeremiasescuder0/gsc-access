// Prompt del Writer (sección 11 del spec). Se arma como:
//   REGLAS GLOBALES + PERFIL DEL CLIENTE + DATOS DEL BLOG PROJECT (keywords ya investigadas)
// en vez de un mega-prompt duplicado por artículo. El Writer NO redescubre keywords: usa las
// que ya están en el proyecto (de la Opportunity / investigación previa).
//
// Formato de respuesta delimitado (no JSON puro): un bloque JSON chico con la metadata, luego
// el marcador ===ARTICLE=== y el Markdown crudo del artículo. Ver generateTextWithRetry en
// core/gemini-client.js para el porqué.

const ARTICLE_DELIMITER = "===ARTICLE===";

// Ejemplo real de formato/tono que quiere el equipo — se le muestra al modelo como referencia
// de ESTRUCTURA y voz, no para copiar contenido.
const STYLE_EXAMPLE = `# Why Isn't My Business Showing Up on Google? 8 Common SEO Problems

When your business is not showing up on Google, potential customers cannot find your services, directly cutting off your inbound leads and digital revenue. This issue usually stems from technical indexing errors, poor site performance, thin content, weak local signals, or aggressive competitor activity.

A website can be fully online and functional while remaining completely invisible in Google Search. Google must first discover and index your pages, understand their core topics, and evaluate whether they deliver enough value to rank for relevant customer queries.

At BMI SmartCloud, we have spent over 30 years helping companies optimize and protect their technology and digital infrastructure. Understanding why search engines bypass your site is the first step toward fixing underlying technical obstacles and building a reliable online presence. Here are eight common SEO problems that limit your search reach and what you can do to fix them.

## 1. Your Website Has Not Been Indexed by Google

Indexing means Google has discovered a web page, analyzed its content, and stored it in its search database to display in organic search results. If Google has not indexed your pages, your business cannot appear in standard search results regardless of how well designed your site is.

A brand-new domain often requires time for search engine crawlers to discover. However, technical configuration errors frequently block search engines from crawling accessible pages.

Common website indexing problems include:

- Pages accidentally marked with a noindex tag
- Search crawlers blocked by an improper robots.txt file
- Important pages isolated without internal site links
- Missing or misconfigured XML sitemaps

Tools like Google Search Console allow website owners to verify indexing status and identify technical errors preventing page inclusion.

## 2. Your Website Is Too New to Rank Yet

There is no universal timeline for how long a new website takes to rank on Google, but most new domains require 3 to 6 months to establish initial search authority. While Google may index your pages within days, achieving top rankings for competitive terms requires time and consistent signals.

(... secciones 3 a 8 con la misma estructura: H2 numerada, 2-3 párrafos cortos, bullets cuando aporta claridad ...)

## How Do I Fix Common SEO Problems?

To fix common SEO problems, you must first diagnose whether your visibility loss stems from technical indexing errors, poor site performance, thin content, or weak local signals. Running a comprehensive audit prevents wasted effort on guesswork.

A structured SEO review should evaluate:

- Google Search Console coverage and indexing reports
- Page titles, heading structures, and internal links
- Mobile responsiveness and page speed scores

Identifying the root cause allows you to implement targeted fixes that deliver measurable visibility improvements.

## Improving Your Google Search Visibility

Restoring your Google Search visibility requires an integrated approach rather than a single quick fix. Sustainable search performance depends on how effectively web development, hosting performance, content strategy, and technical SEO work together.

At BMI SmartCloud, we help businesses identify and resolve the technical and strategic issues limiting their digital reach. If your business is not showing up on Google, contact BMI SmartCloud today to review your digital infrastructure and build a proactive search strategy.`;

function list(items, fallback = "—") {
  return items && items.length ? items.map((i) => `- ${i}`).join("\n") : fallback;
}

function buildGlobalRulesSection(rules) {
  return `REGLAS GLOBALES DE CONTENIDO (aplican siempre):
- Idioma: inglés. Siempre. El artículo completo, títulos y meta incluidos.
- Extensión objetivo: ${rules.wordCountRange[0]}-${rules.wordCountRange[1]} palabras (si la estructura numerada lo requiere, hasta ~1300 está bien; nunca rellenar para llegar).
- Balance: ~${rules.seoAeoBalance.seo}% SEO tradicional / ~${rules.seoAeoBalance.aeo}% AEO/GEO (pasajes de respuesta directa que un motor de respuestas pueda citar).
- Estructura:
${list(rules.structure)}
- Estilo:
${list(rules.style)}
- Restricciones:
${list(rules.restrictions)}
- CTA: ${rules.cta}
- PROHIBIDO usar guiones largos (em dash "—" o en dash "–"). Usá coma, punto o dos puntos.
- PROHIBIDO tablas y precios.`;
}

function buildClientSection(profile) {
  if (!profile) return "PERFIL DEL CLIENTE: no configurado (usá un tono profesional neutro y no afirmes nada específico sobre la empresa).";
  const length = profile.defaultArticleLength
    ? `- Extensión preferida por el cliente (override): ${profile.defaultArticleLength[0]}-${profile.defaultArticleLength[1]} palabras`
    : null;
  const balance = profile.seoAeoBalance
    ? `- Balance SEO/AEO preferido por el cliente (override): ${profile.seoAeoBalance.seo}/${profile.seoAeoBalance.aeo}`
    : null;
  return `PERFIL DEL CLIENTE:
- Marca: ${profile.brandName || profile.clientName}
- Website: ${profile.website || "—"}
- Rubro: ${profile.industry || "—"}
- Servicios principales:
${list(profile.primaryServices)}
- Ubicaciones: ${profile.locations?.length ? profile.locations.join(", ") : "—"}
- Audiencia: ${profile.targetAudience || "—"}
- Tono preferido: ${profile.preferredTone || "profesional, claro, cercano, sin sonar a vendedor"}
${length || ""}
${balance || ""}
- Primera persona del plural ("we", "our team"): ${profile.firstPersonPlural ? "permitida" : "NO usar; escribir en tercera persona sobre la empresa"}
- Estilo de CTA: ${profile.ctaStyle || "suave, invitar a contactar o consultar"}
- Palabras a evitar: ${profile.wordsToAvoid?.length ? profile.wordsToAvoid.join(", ") : "—"}
- Afirmaciones a evitar: ${profile.claimsToAvoid?.length ? profile.claimsToAvoid.join(", ") : "—"}
- Restricciones de contenido:
${list(profile.contentRestrictions)}
- Páginas de servicio internas (para linkear desde el artículo cuando sea natural):
${list(profile.internalServicePages)}
- Otras instrucciones: ${profile.otherInstructions || "—"}

IMPORTANTE: no inventes datos sobre la empresa (años de experiencia, certificaciones, cantidad de clientes, premios). Sólo mencioná lo que figura en este perfil. Si no hay nada, presentá a la marca de forma genérica y honesta.`;
}

function buildProjectSection(project) {
  const gscQueries = project.evidence?.gsc?.queries || [];
  const queriesText = gscQueries.length
    ? gscQueries.map((q) => `- "${q.query}" (${q.impressions} impresiones, posición ${q.position})`).join("\n")
    : "—";
  return `DATOS DEL BLOG PROJECT (investigación ya hecha — usala, no la rehagas):
- Título de trabajo: ${project.workingTitle || project.title || "—"}
- Tema: ${project.topic || "—"}
- Servicio target: ${project.targetService || "—"}
- Ubicación target: ${project.targetLocation || "—"}
- Audiencia: ${project.targetAudience || "—"}
- Intención de búsqueda: ${project.searchIntent || "—"}
- Tipo de contenido: ${project.contentType || "new_blog"}
- KEYWORD PRINCIPAL: ${project.primaryKeyword || "—"}
- Keywords secundarias:
${list(project.secondaryKeywords)}
- Keywords tipo pregunta (cada una merece un pasaje de respuesta directa, idealmente como H2 en forma de pregunta o dentro de una sección):
${list(project.questionKeywords)}
- Keywords semánticas / de soporte (usar naturalmente, sin forzar):
${list(project.semanticKeywords)}
- Por qué es una oportunidad: ${project.opportunityReason || "—"}
- Queries reales de Google Search Console que sustentan el tema (el artículo tiene que responderlas):
${queriesText}
- Links internos recomendados: ${project.recommendedInternalLinks?.length ? project.recommendedInternalLinks.join(", ") : "—"}
- URLs existentes relacionadas (no duplicar su enfoque; si hay riesgo de cannibalización, diferenciá el ángulo): ${project.relatedExistingUrls?.length ? project.relatedExistingUrls.join(", ") : "—"}`;
}

function buildWriterPrompt({ globalRules, clientProfile, project }) {
  return `Sos un redactor SEO senior. Escribí un artículo de blog completo, listo para publicar, para el cliente descripto abajo. Todo el artículo va EN INGLÉS.

${buildGlobalRulesSection(globalRules)}

${buildClientSection(clientProfile)}

${buildProjectSection(project)}

FORMATO DEL ARTÍCULO (seguí esta estructura, es la que usa el equipo):
1. Un solo H1 (Markdown "# "). Con gancho: idealmente formula la pregunta o el problema del usuario y, si aplica, un número ("8 Common SEO Problems"). La keyword principal va en el H1 de forma natural.
2. Primer párrafo: RESPUESTA DIRECTA a la búsqueda principal en 2-3 oraciones, sin preámbulo (esto es lo que un motor de respuestas cita). La keyword principal aparece acá también.
3. Segundo párrafo: contexto que explica por qué pasa / por qué importa.
4. Tercer párrafo: presentación breve de la marca ("At {marca}, we...") conectando su experiencia real (sólo la del perfil) con el tema, y anticipando qué va a cubrir el artículo.
5. Cuerpo: secciones H2 ("## ") numeradas ("## 1. ...", "## 2. ..."), cada una con 2-3 párrafos cortos y una lista con guiones cuando aporte claridad. Cada sección arranca con una oración que define o responde directamente el punto. Usá las keywords secundarias como temas de estas secciones cuando encajen.
6. Cerca del final, una H2 en forma de pregunta ("## How Do I ...?") que responde una de las keywords tipo pregunta con una respuesta directa + lista corta.
7. Cierre: una H2 de cierre orientada al beneficio, un párrafo integrador, un párrafo de marca y un CTA suave con el estilo del perfil.
8. Párrafos de 2-4 oraciones. Nada de relleno, nada de "In today's digital landscape", nada de frases robóticas. Sin tablas, sin precios, sin em dashes.

A modo de REFERENCIA de estructura y tono (NO copies el contenido, es otro tema y otra empresa):
${STYLE_EXAMPLE}

RESPONDÉ EXACTAMENTE con este formato, sin texto antes ni después:

{
  "title": "el H1 exacto del artículo",
  "meta_title": "título SEO, MÁXIMO 60 caracteres (contá los caracteres y recortá si te pasás), incluye la keyword principal",
  "meta_description": "MÁXIMO 160 caracteres (contá y recortá si te pasás), incluye la keyword principal, invita a leer",
  "slug": "slug-en-minusculas-con-guiones",
  "suggested_internal_links": [{ "anchor": "texto ancla usado o sugerido", "url": "url interna del perfil o del proyecto" }],
  "suggested_image_concept": "una oración describiendo la imagen destacada ideal"
}
${ARTICLE_DELIMITER}
# (acá empieza el artículo completo en Markdown, arrancando por el H1)`;
}

function parseWriterResponse(text) {
  const idx = text.indexOf(ARTICLE_DELIMITER);
  if (idx === -1) {
    throw new Error(`La respuesta del Writer no contiene el delimitador ${ARTICLE_DELIMITER}`);
  }
  const metaRaw = text
    .slice(0, idx)
    .replace(/^```(json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  let meta;
  try {
    meta = JSON.parse(metaRaw);
  } catch (err) {
    throw new Error(`Metadata del Writer no es JSON válido: ${err.message}. Recibido: ${metaRaw.slice(0, 200)}`);
  }

  let article = text.slice(idx + ARTICLE_DELIMITER.length).trim();
  // Por si el modelo envolvió el artículo en un fence de markdown.
  article = article.replace(/^```(markdown|md)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  return { meta, article };
}

function validateWriterResult({ meta, article }) {
  if (!meta || typeof meta !== "object") throw new Error("Metadata del Writer vacía");
  for (const field of ["title", "meta_title", "meta_description", "slug"]) {
    if (typeof meta[field] !== "string" || !meta[field].trim()) {
      throw new Error(`Falta '${field}' en la metadata del Writer`);
    }
  }
  if (!Array.isArray(meta.suggested_internal_links)) meta.suggested_internal_links = [];
  if (typeof meta.suggested_image_concept !== "string") meta.suggested_image_concept = "";

  if (!article || article.split(/\s+/).length < 150) {
    throw new Error("El artículo generado es demasiado corto o está vacío");
  }

  const h1Count = (article.match(/^#\s+/gm) || []).length;
  if (h1Count === 0) {
    article = `# ${meta.title.trim()}\n\n${article}`;
  } else if (h1Count > 1) {
    throw new Error(`El artículo tiene ${h1Count} H1; la regla es exactamente uno`);
  }

  // Regla global: sin em/en dashes. Se normaliza a coma o guión simple en vez de rechazar todo
  // el artículo por un carácter.
  article = article.replace(/\s+[—–]\s+/g, ", ").replace(/[—–]/g, "-");

  return { meta, article };
}

module.exports = { ARTICLE_DELIMITER, buildWriterPrompt, parseWriterResponse, validateWriterResult };
