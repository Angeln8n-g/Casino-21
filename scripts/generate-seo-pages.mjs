#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { blogPosts } from '../src/web/data/blog-posts.ts';
import { faqData } from '../src/web/data/faq-data.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');

const PAGES = {
  privacy: {
    title: 'Política de Privacidad — KASINO21 | Juego de Cartas Online',
    description:
      'Conoce cómo KASINO21 protege tu privacidad. Información sobre cookies, Google AdSense, analíticas y tus derechos GDPR/CCPA como usuario del juego de cartas online.',
    canonical: 'https://kasino21.com/privacy',
    ogTitle: 'Política de Privacidad — KASINO21 | Juego de Cartas Online',
    ogDescription:
      'Conoce cómo KASINO21 protege tu privacidad. Información sobre cookies, Google AdSense, analíticas y tus derechos GDPR/CCPA como usuario del juego de cartas online.',
  },
  terms: {
    title: 'Términos de Servicio — KASINO21 | Juego de Cartas Online',
    description:
      'Lee los Términos de Servicio de KASINO21. Reglas del juego, moneda virtual sin valor monetario, conducta de usuarios, propiedad intelectual y política de publicidad.',
    canonical: 'https://kasino21.com/terms',
    ogTitle: 'Términos de Servicio — KASINO21 | Juego de Cartas Online',
    ogDescription:
      'Lee los Términos de Servicio de KASINO21. Reglas del juego, moneda virtual sin valor monetario, conducta de usuarios, propiedad intelectual y política de publicidad.',
  },
  cookies: {
    title: 'Política de Cookies — KASINO21 | Juego de Cartas Online',
    description:
      'Información completa sobre las cookies que utiliza KASINO21: cookies esenciales, analíticas de Google Analytics y publicitarias de Google AdSense. Cumplimiento GDPR/ePrivacy.',
    canonical: 'https://kasino21.com/cookies',
    ogTitle: 'Política de Cookies — KASINO21 | Juego de Cartas Online',
    ogDescription:
      'Información completa sobre las cookies que utiliza KASINO21: cookies esenciales, analíticas de Google Analytics y publicitarias de Google AdSense. Cumplimiento GDPR/ePrivacy.',
  },
  'como-jugar': {
    title: 'Cómo Jugar Casino 21 — Reglas del Juego de Cartas Online | KASINO21',
    description:
      'Aprende a jugar Casino 21: objetivo, valor de cartas, puntuación, virado, sumatorias y todo sobre el juego de cartas online de KASINO21.',
    canonical: 'https://kasino21.com/como-jugar',
    ogTitle: 'Cómo Jugar Casino 21 — Reglas del Juego de Cartas Online | KASINO21',
    ogDescription:
      'Aprende a jugar Casino 21: objetivo, valor de cartas, puntuación, virado, sumatorias y todo sobre el juego de cartas online de KASINO21.',
  },
  about: {
    title: 'Sobre Nosotros | Kasino21 — Juego de Cartas Online',
    description:
      'Conoce al equipo detrás de Kasino21, el juego de cartas 21 en español. Nuestra misión, tecnología y valores.',
    canonical: 'https://kasino21.com/about',
    ogTitle: 'Sobre Nosotros | Kasino21 — Juego de Cartas Online',
    ogDescription:
      'Conoce al equipo detrás de Kasino21, el juego de cartas 21 en español. Nuestra misión, tecnología y valores.',
  },
  contact: {
    title: 'Contacto | Kasino21 — Juego de Cartas Online',
    description:
      '¿Tienes preguntas o sugerencias? Contáctanos. Respondemos en 24-48 horas.',
    canonical: 'https://kasino21.com/contact',
    ogTitle: 'Contacto | Kasino21 — Juego de Cartas Online',
    ogDescription:
      '¿Tienes preguntas o sugerencias? Contáctanos. Respondemos en 24-48 horas.',
  },
  faq: {
    title: 'Preguntas Frecuentes | Kasino21 — Juego de Cartas Online',
    description:
      'Respuestas a las preguntas más comunes sobre Kasino21: juego, cuentas, torneos, monedas y más.',
    canonical: 'https://kasino21.com/faq',
    ogTitle: 'Preguntas Frecuentes | Kasino21 — Juego de Cartas Online',
    ogDescription:
      'Respuestas a las preguntas más comunes sobre Kasino21: juego, cuentas, torneos, monedas y más.',
  },
  blog: {
    title: 'Blog | Kasino21 — Guías, Estrategias y Noticias del Juego de Cartas',
    description:
      'Aprende a jugar mejor con nuestras guías, estrategias y consejos para Kasino21, el juego de cartas 21 online en español.',
    canonical: 'https://kasino21.com/blog',
    ogTitle: 'Blog | Kasino21 — Guías, Estrategias y Noticias del Juego de Cartas',
    ogDescription:
      'Aprende a jugar mejor con nuestras guías, estrategias y consejos para Kasino21, el juego de cartas 21 online en español.',
  },
  login: {
    title: 'Iniciar Sesión | Kasino21 — Juego de Cartas Online',
    description:
      'Inicia sesión en Kasino21 para jugar al juego de cartas 21 online. Compite en partidas ranked 1v1 y 2v2, sube de rango ELO y participa en torneos.',
    canonical: 'https://kasino21.com/login',
    ogTitle: 'Iniciar Sesión | Kasino21 — Juego de Cartas Online',
    ogDescription:
      'Inicia sesión en Kasino21 para jugar al juego de cartas 21 online. Compite en partidas ranked 1v1 y 2v2, sube de rango ELO y participa en torneos.',
  },
};

// ─── Helper: Generate JSON-LD script tag ──────────────────────────────────
function jsonLdTag(data) {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

// ─── Helper: Build FAQ Page structured data ──────────────────────────────
function buildFAQSchema() {
  return jsonLdTag({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  });
}

// ─── Helper: Build Blog Collection structured data ───────────────────────
function buildBlogCollectionSchema() {
  return jsonLdTag({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Blog de Kasino21',
    description: 'Guías, estrategias y noticias sobre el juego de cartas 21 online.',
    url: 'https://kasino21.com/blog',
    inLanguage: 'es',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: blogPosts.map((post, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://kasino21.com/blog/${post.slug}`,
        name: post.title,
      })),
    },
  });
}

// ─── Helper: Build BlogPosting structured data ───────────────────────────
function buildBlogPostSchema(post) {
  return jsonLdTag({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    url: `https://kasino21.com/blog/${post.slug}`,
    inLanguage: 'es',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://kasino21.com/blog/${post.slug}`,
    },
    author: {
      '@type': 'Organization',
      name: 'KASINO21',
      url: 'https://kasino21.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'KASINO21',
      url: 'https://kasino21.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://kasino21.com/icons/icon-512x512.png',
      },
    },
    image: 'https://kasino21.com/og-image.png',
    articleSection: post.category,
    wordCount: post.content.replace(/<[^>]*>/g, '').split(/\s+/).length,
  });
}

// ─── Helper: Get extra structured data for a route ───────────────────────
function getExtraSchemaForRoute(route) {
  if (route === 'faq') return buildFAQSchema();
  if (route === 'blog') return buildBlogCollectionSchema();
  return '';
}

// ─── Helper: Inject structured data before </head> ──────────────────────
function injectSchema(html, schemaTag) {
  if (!schemaTag) return html;
  return html.replace('</head>', `    ${schemaTag}\n  </head>`);
}

const indexHtml = readFileSync(`${distDir}/index.html`, 'utf-8');

// ─── Generate static SEO pages ───────────────────────────────────────────
for (const [route, meta] of Object.entries(PAGES)) {
  let html = indexHtml;

  // Title
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${meta.title}</title>`,
  );

  // Canonical
  html = html.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${meta.canonical}" />`,
  );

  // Meta description
  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${meta.description}" />`,
  );

  // OG title
  html = html.replace(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${meta.ogTitle}" />`,
  );

  // OG description
  html = html.replace(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${meta.ogDescription}" />`,
  );

  // OG url
  html = html.replace(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${meta.canonical}" />`,
  );

  // Twitter title
  html = html.replace(
    /<meta name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${meta.ogTitle}" />`,
  );

  // Twitter description
  html = html.replace(
    /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${meta.ogDescription}" />`,
  );

  // noscript block: add a route-specific heading
  html = html.replace(
    /(<noscript[\s\S]*?<h1[^>]*>).*?(<\/h1>)/,
    `$1${meta.title}$2`,
  );

  // Inject route-specific structured data
  const extraSchema = getExtraSchemaForRoute(route);
  html = injectSchema(html, extraSchema);

  writeFileSync(`${distDir}/${route}.html`, html, 'utf-8');
  console.log(`✓ Generated ${distDir}/${route}.html`);
}

console.log('SEO pages generated successfully.');

// ─── Generate static HTML for each blog post ─────────────────────────────
for (const post of blogPosts) {
  let html = indexHtml;

  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${post.title} | Kasino21</title>`,
  );

  html = html.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="https://kasino21.com/blog/${post.slug}" />`,
  );

  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${post.excerpt}" />`,
  );

  html = html.replace(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${post.title} | Kasino21" />`,
  );

  html = html.replace(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${post.excerpt}" />`,
  );

  html = html.replace(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="https://kasino21.com/blog/${post.slug}" />`,
  );

  html = html.replace(
    /<meta name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${post.title} | Kasino21" />`,
  );

  html = html.replace(
    /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${post.excerpt}" />`,
  );

  // Enhance noscript: include article content as plain text for crawlers
  const plainTextContent = post.content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000);

  html = html.replace(
    /(<noscript[\s\S]*?<h1[^>]*>)[\s\S]*?(<\/h1>[\s\S]*?<h2[^>]*>)[\s\S]*?(<\/h2>[\s\S]*?<p[^>]*>)[\s\S]*?(<\/p>)/,
    `$1${post.title}$2${post.category} · ${post.readTime} min lectura$3${plainTextContent}$4`,
  );

  // Inject BlogPosting structured data
  html = injectSchema(html, buildBlogPostSchema(post));

  // Write to dist/blog/<slug>.html
  const blogDir = `${distDir}/blog`;
  if (!existsSync(blogDir)) {
    mkdirSync(blogDir, { recursive: true });
  }
  writeFileSync(`${blogDir}/${post.slug}.html`, html, 'utf-8');
  console.log(`✓ Generated ${blogDir}/${post.slug}.html`);
}
