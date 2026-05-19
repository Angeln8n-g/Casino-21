#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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
};

const indexHtml = readFileSync(`${distDir}/index.html`, 'utf-8');

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

  writeFileSync(`${distDir}/${route}.html`, html, 'utf-8');
  console.log(`✓ Generated ${distDir}/${route}.html`);
}

console.log('SEO pages generated successfully.');
