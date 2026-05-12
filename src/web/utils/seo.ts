/**
 * SEO Head Manager
 * 
 * Lightweight utility for updating document head meta tags on SPA route changes.
 * Since KASINO21 is a single-page app, we need to dynamically update meta tags
 * when navigating to different "pages" so that:
 * 
 * 1. Each page has a unique, descriptive <title>
 * 2. Google sees accurate meta descriptions per page
 * 3. Social sharing previews (OG/Twitter) reflect the correct page
 * 4. Canonical URLs prevent duplicate content penalties
 */

interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noindex?: boolean;
}

const BASE_URL = 'https://kasino21.com';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

/**
 * Updates document <head> tags for SEO.
 * Call this in useEffect on each page/route component.
 */
export function updateSEO(config: SEOConfig): void {
  // Title
  document.title = config.title;

  // Standard meta tags
  setMeta('description', config.description);

  // Robots
  if (config.noindex) {
    setMeta('robots', 'noindex, nofollow');
  } else {
    setMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  }

  // Canonical
  setLink('canonical', config.canonical || `${BASE_URL}${window.location.pathname}`);

  // Open Graph
  setMetaProperty('og:title', config.ogTitle || config.title);
  setMetaProperty('og:description', config.ogDescription || config.description);
  setMetaProperty('og:url', config.canonical || `${BASE_URL}${window.location.pathname}`);
  setMetaProperty('og:image', config.ogImage || DEFAULT_OG_IMAGE);

  // Twitter Card
  setMeta('twitter:title', config.ogTitle || config.title);
  setMeta('twitter:description', config.ogDescription || config.description);
  setMeta('twitter:image', config.ogImage || DEFAULT_OG_IMAGE);
}

/**
 * Reset SEO tags to the homepage defaults.
 * Call this when unmounting a page component.
 */
export function resetSEO(): void {
  updateSEO({
    title: 'KASINO21 — Juego de Cartas Competitivo Online Gratis | 1v1 y 2v2 Multijugador',
    description: 'KASINO21 es el juego de cartas competitivo multijugador online gratis. Juega partidas ranked 1v1 y 2v2, sube de rango ELO, completa misiones diarias, desbloquea logros y compite en torneos semanales.',
    canonical: `${BASE_URL}/`,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────

function setMeta(name: string, content: string): void {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setMetaProperty(property: string, content: string): void {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string): void {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}
