# AdSense Approval — Design Spec

**Date:** 2026-05-19
**Status:** Approved
**Domain:** kasino21.com

---

## Goal

Make Casino 21 fully compliant with Google AdSense approval requirements and maximize the chances of approval, while preserving the existing game experience and maintaining visual consistency with the current design system.

---

## Context

Casino 21 is a Spanish-language card game (21) with real-time multiplayer via Socket.io. The site currently has:
- Strong legal pages (privacy, terms, cookies, como-jugar)
- AdSense script in index.html with valid publisher ID (`ca-pub-7975398244257516`)
- AdManager component with interstitial, rewarded, and gate ads
- SEO infrastructure (meta tags, structured data, sitemap, robots.txt)
- PWA with manifest and service worker

**Current readiness: ~65%.** Critical blockers exist (CSP), and content volume is insufficient for AdSense approval.

---

## Architecture

### Phase 1: Critical Fixes

| # | Change | File(s) |
|---|---|---|
| 1.1 | CSP: Add `frame-src` for AdSense domains | `vite.config.mts` |
| 1.2 | CSP: Add `connect-src` for AdSense domains | `vite.config.mts` |
| 1.3 | Create `ads.txt` | `public/ads.txt` |
| 1.4 | Add Google Analytics placeholder | `index.html` |
| 1.5 | Add Google Site Verification placeholder | `index.html` |
| 1.6 | Add `hreflang="es"` tag | `index.html` |
| 1.7 | Fix JSON-LD placeholder aggregateRating | `index.html` |
| 1.8 | Add legal page links to landing footer | `src/landing/sections/Footer.tsx` |
| 1.9 | Update sitemap.xml with new routes | `public/sitemap.xml` + `scripts/generate-seo-pages.mjs` |

### Phase 2: Required Pages

| # | Change | File(s) |
|---|---|---|
| 2.1 | About Us page | `src/web/components/About.tsx` |
| 2.2 | Contact page | `src/web/components/Contact.tsx` |
| 2.3 | Cookie consent banner | `src/web/components/CookieConsent.tsx` |
| 2.4 | Route registration | `src/web/App.tsx` |
| 2.5 | Static HTML generation | `scripts/generate-seo-pages.mjs` |
| 2.6 | SEO hooks on new pages | `src/web/utils/seo.ts` usage |

### Phase 3: Content & Social Proof

| # | Change | File(s) |
|---|---|---|
| 3.1 | Blog listing page | `src/web/components/Blog.tsx` |
| 3.2 | Blog post page (dynamic routes) | `src/web/components/BlogPost.tsx` |
| 3.3 | Blog data (static articles) | `src/web/data/blog-posts.ts` |
| 3.4 | FAQ page | `src/web/components/FAQ.tsx` |
| 3.5 | FAQ data | `src/web/data/faq-data.ts` |
| 3.6 | Landing page social proof | `src/landing/sections/SocialProof.tsx` |
| 3.7 | Route registration | `src/web/App.tsx` |
| 3.8 | Static HTML generation | `scripts/generate-seo-pages.mjs` |

---

## Design Details

### Phase 1: Critical Fixes

#### 1.1-1.2 Content Security Policy

**Problem:** `frame-src 'none'` blocks all AdSense iframes. `connect-src` missing AdSense domains.

**Solution:**

In `vite.config.mts`, update the CSP meta tag:

```
frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://adservice.google.com
```

Add to `connect-src`:
```
https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adservice.google.com https://www.google-analytics.com
```

#### 1.3 ads.txt

Create `public/ads.txt`:
```
google.com, pub-7975398244257516, DIRECT, f08c47fec0942fa0
```

#### 1.4-1.6 index.html placeholders

Add to `<head>`:
- `<!-- Google Analytics: Replace MEASUREMENT_ID with actual ID -->` + gtag script placeholder
- `<!-- Google Site Verification: Replace TOKEN with actual token -->` + meta tag placeholder
- `<link rel="alternate" hreflang="es" href="https://kasino21.com/" />`

#### 1.7 JSON-LD aggregateRating

Remove the placeholder `aggregateRating` block from the JSON-LD schema. It contains fake data (4.8/5, 150 reviews) which Google may penalize. Replace with a comment indicating to add real data later.

#### 1.8 Landing Footer

Add to `src/landing/sections/Footer.tsx`:
- Links: Blog, FAQ, Sobre Nosotros, Contacto
- Links legales existentes: Privacidad, Términos, Cookies
- All styled consistently with current footer

#### 1.9 Sitemap

Update `public/sitemap.xml` and `scripts/generate-seo-pages.mjs` to include all new routes.

---

### Phase 2: Required Pages

#### 2.1 About Us (`/about`)

**Component:** `src/web/components/About.tsx`

**Content sections:**
1. **Hero:** "Sobre Kasino21" — tagline about the project
2. **Who we are:** Angel as creator, passion for card games
3. **Mission:** Free, fun, fair card game for Spanish-speaking players
4. **Technology:** React, Socket.io, Supabase — transparent tech stack
5. **Values:** No real gambling, fair play, privacy-first
6. **CTA:** "Jugar Ahora" button (prominent, same style as landing)

**Style:** Same Tailwind + casino-* palette. Clean layout with cards for each section.

**SEO:** Uses `useSEO()` hook. Title: "Sobre Nosotros | Kasino21 — Juego de Cartas Online". Description: "Conoce al equipo detrás de Kasino21, el juego de cartas 21 en español."

#### 2.2 Contact (`/contact`)

**Component:** `src/web/components/Contact.tsx`

**Content:**
1. **Hero:** "Contacto"
2. **Email:** `kasino.21@gmail.com` (clickable mailto link)
3. **Support email:** `kansino21.service@gmail.com`
4. **Response time:** "Respondemos en 24-48 horas"
5. **Simple contact form:** Name, email, message, submit button (mailto fallback, no backend needed)
6. **CTA:** "Jugar Ahora" button

**Style:** Same design system. Form styled with existing input components.

**SEO:** Title: "Contacto | Kasino21". Description: "¿Tienes preguntas? Contáctanos."

#### 2.3 Cookie Consent Banner

**Component:** `src/web/components/CookieConsent.tsx`

**Behavior:**
- Fixed bar at bottom of screen
- Shows on page load if `localStorage.getItem('cookie_consent')` is null
- Three buttons: "Aceptar", "Rechazar", "Configurar"
- On accept: saves `{ accepted: true, timestamp: ISO }` to localStorage, enables personalized ads
- On reject: saves `{ accepted: false, timestamp: ISO }`, AdManager uses `data-ad-personalized="false"`
- On configure: navigates to `/cookies`
- Does not reappear after decision
- Footer link "Preferencias de cookies" allows re-opening by clearing localStorage and re-rendering

**Integration with AdManager:**
- AdManager checks `localStorage` for consent before loading ads
- If no consent yet → ads don't load until user decides
- If rejected → non-personalized ads only

**Style:** Dark background with casino-gold accent. Matches existing modal/dialog patterns.

---

### Phase 3: Content & Social Proof

#### 3.1-3.3 Blog

**Data:** `src/web/data/blog-posts.ts`

Array of article objects:
```typescript
interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string; // HTML or markdown
  date: string; // ISO date
  category: string; // "Estrategia", "Guías", "Noticias"
  readTime: number; // minutes
}
```

**Initial articles (6):**
1. "Cómo jugar Casino 21 — Guía completa para principiantes" — full game rules explained
2. "5 estrategias para mejorar tu ELO" — tips for ranking up
3. "Casino 21 vs Blackjack tradicional: ¿Cuál es la diferencia?" — comparison article
4. "Cómo funcionan los torneos en Casino 21" — tournament mechanics
5. "Guía de puntuación: Cómo maximizar tus puntos" — scoring strategies
6. "Preguntas frecuentes sobre Casino 21" — general FAQ

**Listing page:** `src/web/components/Blog.tsx`

- Grid of article cards (same card style as landing Features section)
- Each card: title, date, category badge, excerpt, "Leer más" link
- Filter by category (optional)
- CTA: "Jugar Ahora" button in sidebar or header

**Article page:** `src/web/components/BlogPost.tsx`

- Dynamic route `/blog/:slug`
- Full article content with clean typography
- Sidebar: "Artículos relacionados" (3 related posts)
- CTA: "Jugar Ahora" button prominent
- SEO: dynamic title/description per article via `useSEO()`

**Style:** Clean reading experience. Same color palette. Article content in readable max-width container. Sidebar on desktop, stacked on mobile.

#### 3.4-3.5 FAQ

**Data:** `src/web/data/faq-data.ts`

Array of Q&A objects:
```typescript
interface FAQItem {
  question: string;
  answer: string;
  category: string; // "General", "Cuentas", "Juego", "Torneos", "Monedas"
}
```

**Initial questions (15+):**
- ¿Qué es Kasino21?
- ¿Es gratuito?
- ¿Necesito crear una cuenta?
- ¿Cómo funciona el sistema ELO?
- ¿Qué son los torneos?
- ¿Las monedas tienen valor real?
- ¿Cómo funciona el sistema de anuncios?
- ¿Puedo jugar contra bots?
- ¿Cómo se calcula la puntuación?
- ¿Qué pasa si me desconecto durante una partida?
- ¿Puedo cambiar mi nombre de usuario?
- ¿Cómo reporto un problema?
- ¿El juego funciona en móvil?
- ¿Cuántos jugadores hay por partida?
- ¿Hay un modo de práctica?

**Page:** `src/web/components/FAQ.tsx`

- Accordion layout (expandable Q&A)
- Filter by category tabs
- CTA: "Jugar Ahora" button
- FAQPage JSON-LD structured data

**Style:** Same accordion pattern used elsewhere in the project. Casino-gold accent on expanded items.

#### 3.6 Social Proof (Landing)

**Component:** `src/landing/sections/SocialProof.tsx`

**Content:**
- Stats from existing StatsBar (players, matches) repurposed
- "Únete a miles de jugadores" messaging
- Division badges showing player distribution
- Testimonial-style quotes (can be generic player quotes, not fake named reviews)

**Placement:** Between Features and Leaderboard sections on landing page.

---

## Navigation & Routing

### Route map

| Route | Auth | Component | Phase |
|---|---|---|---|
| `/` | No | Landing page (existing) | — |
| `/about` | No | About | 2 |
| `/contact` | No | Contact | 2 |
| `/faq` | No | FAQ | 3 |
| `/blog` | No | Blog listing | 3 |
| `/blog/:slug` | No | Blog post | 3 |
| `/privacy` | No | PrivacyPolicy (existing) | — |
| `/terms` | No | TermsOfService (existing) | — |
| `/cookies` | No | CookiePolicy (existing) | — |
| `/como-jugar` | No | ComoJugar (existing) | — |

### App.tsx changes

Add route detection for new paths before the auth check. Same pattern as existing legal page routes.

### "Jugar Ahora" button

- Present in header of all content pages (blog, FAQ, About, Contact)
- Same visual style as landing CTA (gradient, rounded)
- Links to `/` which triggers auth → game flow
- On mobile: compact version

---

## SEO

### Per-page SEO

Each new page uses `useSEO()` from `src/web/utils/seo.ts` with:
- Unique title
- Unique description
- Canonical URL
- Open Graph tags
- Twitter Card tags

### Structured data

- **FAQPage** JSON-LD on `/faq`
- **Blog** + **BlogPosting** JSON-LD on `/blog` and `/blog/:slug`
- Remove placeholder `aggregateRating` from existing JSON-LD

### Sitemap

Update `public/sitemap.xml` with all new URLs.

### Static generation

Update `scripts/generate-seo-pages.mjs` to generate static HTML for:
- `/about`
- `/contact`
- `/faq`
- `/blog`
- Each `/blog/:slug`

---

## Error Handling

- **Ad blocker detection:** Already handled by AdManager. No changes needed.
- **Cookie consent:** If localStorage unavailable (private browsing), default to "not consented" — ads don't load.
- **Blog post not found:** 404-style message with link back to blog listing and "Jugar Ahora" CTA.
- **Contact form:** No backend — form opens mailto: link as fallback. Clear UX that email client will open.

---

## Testing

- Verify CSP allows AdSense iframes to load (manual browser test)
- Verify ads.txt is accessible at `/ads.txt`
- Verify cookie consent persists across page reloads
- Verify all new routes are accessible without authentication
- Verify static HTML generation includes new pages
- Verify sitemap contains all new URLs
- Verify `npm run build:prod` succeeds
- Verify noscript fallback still works

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| AdSense still rejects after all changes | Content volume is the #1 rejection reason. 6 articles + FAQ + legal pages should be sufficient, but may need more |
| Cookie consent reduces ad revenue | Required by GDPR. Non-personalized ads still generate revenue |
| Blog content feels thin | Articles should be substantive (800+ words each), not filler |
| CSP too permissive | Only add specific AdSense domains, not wildcards |
| SPA routing confuses crawlers | Static HTML generation + noscript fallback mitigates this |
