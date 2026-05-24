# AdSense Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kasino21 fully compliant with Google AdSense approval requirements through 3 phases: critical fixes, required pages, and content/social proof.

**Architecture:** Three sequential phases, each independently testable. Phase 1 fixes technical blockers (CSP, ads.txt). Phase 2 adds mandatory pages (About, Contact, Cookie Consent). Phase 3 adds content volume (Blog, FAQ, Social Proof). All new pages follow existing patterns from ComoJugar.tsx and legal pages.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vite, existing SEO utilities, existing AdManager.

---

## File Map

| File | Action | Phase |
|---|---|---|
| `vite.config.mts` | Modify CSP | 1 |
| `index.html` | Modify: add placeholders, hreflang, fix JSON-LD | 1 |
| `public/ads.txt` | Create | 1 |
| `public/sitemap.xml` | Modify: add new URLs | 1, 2, 3 |
| `src/landing/sections/Footer.tsx` | Modify: add content/legal links | 1 |
| `src/web/components/About.tsx` | Create | 2 |
| `src/web/components/Contact.tsx` | Create | 2 |
| `src/web/components/CookieConsent.tsx` | Create | 2 |
| `src/web/components/FAQ.tsx` | Create | 3 |
| `src/web/components/Blog.tsx` | Create | 3 |
| `src/web/components/BlogPost.tsx` | Create | 3 |
| `src/web/data/blog-posts.ts` | Create | 3 |
| `src/web/data/faq-data.ts` | Create | 3 |
| `src/web/App.tsx` | Modify: add routes | 2, 3 |
| `scripts/generate-seo-pages.mjs` | Modify: add static pages | 2, 3 |
| `src/landing/sections/SocialProof.tsx` | Create | 3 |
| `src/landing/LandingPage.tsx` | Modify: import SocialProof | 3 |

---

## Phase 1: Critical Fixes

### Task 1: Fix Content Security Policy for AdSense

**Files:**
- Modify: `vite.config.mts` lines 95-110

- [ ] **Step 1: Update CSP in vite.config.mts**

Replace the CSP section in `vite.config.mts`. Find this block:

```ts
"connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} http://localhost:4000 ws://localhost:4000 https://api.dicebear.com",
// No iframes from unknown origins
"frame-src 'none'",
```

Replace with:

```ts
`connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} http://localhost:4000 ws://localhost:4000 https://api.dicebear.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adservice.google.com https://www.google-analytics.com https://analytics.google.com`,
// AdSense iframes + Google services
"frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://adservice.google.com",
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build:prod`
Expected: Build completes without errors.

- [ ] **Step 3: Commit**

```bash
git add vite.config.mts
git commit -m "fix: update CSP to allow AdSense iframes and analytics domains"
```

---

### Task 2: Create ads.txt

**Files:**
- Create: `public/ads.txt`

- [ ] **Step 1: Create ads.txt file**

```
google.com, pub-7975398244257516, DIRECT, f08c47fec0942fa0
```

- [ ] **Step 2: Verify file is accessible**

Run: `cat public/ads.txt`
Expected: Single line with the AdSense authorization.

- [ ] **Step 3: Commit**

```bash
git add public/ads.txt
git commit -m "add: ads.txt for AdSense publisher verification"
```

---

### Task 3: Update index.html — Analytics placeholder, Site Verification, hreflang

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add hreflang tag**

Find this line in `index.html`:
```html
<link rel="canonical" href="https://kasino21.com/" />
```

Add immediately after it:
```html
<link rel="alternate" hreflang="es" href="https://kasino21.com/" />
```

- [ ] **Step 2: Add Google Analytics placeholder**

Find the AdSense script line:
```html
<!-- Google AdSense Auto Ads -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7975398244257516" crossorigin="anonymous"></script>
```

Add immediately before it:
```html
<!-- Google Analytics: Replace G-XXXXXXXXXX with your actual Measurement ID -->
<!--
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
-->

<!-- Google Site Verification: Replace TOKEN with your actual verification token -->
<!-- <meta name="google-site-verification" content="TOKEN" /> -->
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "add: hreflang, Google Analytics placeholder, Site Verification placeholder"
```

---

### Task 4: Fix JSON-LD aggregateRating placeholder

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Remove fake aggregateRating from JSON-LD**

Find this block in the first `<script type="application/ld+json">`:
```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "4.8",
  "ratingCount": "150",
  "bestRating": "5",
  "worstRating": "1"
},
```

Replace with:
```json
"aggregateRating": {
  "@comment": "TODO: Add real aggregateRating once you have actual user reviews. Remove this placeholder to avoid Google penalties for fake structured data."
},
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "fix: remove fake aggregateRating from JSON-LD to avoid Google penalties"
```

---

### Task 5: Add content and legal links to landing page footer

**Files:**
- Modify: `src/landing/sections/Footer.tsx`

- [ ] **Step 1: Update Footer component**

Replace the entire `Footer.tsx` with:

```tsx
import React from 'react';
import brand21Icon from '../../Public/brand21Icon-164.webp';

export default function Footer() {
  return (
    <>
      {/* CTA Section */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            ¿Listo para jugar?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Crea tu cuenta gratis y empieza a subir en el ranking hoy mismo.
          </p>
          <a
            href="/index.html"
            className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-xl px-14 py-5 rounded-2xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(234,179,8,0.25)]"
          >
            EMPEZAR AHORA — ES GRATIS
          </a>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Content Links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-sm">
            <a href="/blog" className="text-gray-400 hover:text-casino-gold transition-colors">Blog</a>
            <a href="/faq" className="text-gray-400 hover:text-casino-gold transition-colors">FAQ</a>
            <a href="/como-jugar" className="text-gray-400 hover:text-casino-gold transition-colors">Cómo Jugar</a>
            <a href="/about" className="text-gray-400 hover:text-casino-gold transition-colors">Sobre Nosotros</a>
            <a href="/contact" className="text-gray-400 hover:text-casino-gold transition-colors">Contacto</a>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-xs text-gray-600">
            <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacidad</a>
            <a href="/terms" className="hover:text-gray-400 transition-colors">Términos</a>
            <a href="/cookies" className="hover:text-gray-400 transition-colors">Cookies</a>
          </div>

          {/* Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-gray-600 text-xs">
            <div className="flex items-center gap-2">
              <img src={brand21Icon} alt="Kasino21" className="w-5 h-5 rounded object-contain opacity-50" />
              <span className="font-black text-white/40">KASINO21</span>
            </div>
            <span>Juego de cartas competitivo online · {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/landing/sections/Footer.tsx
git commit -m "feat: add content and legal links to landing page footer"
```

---

### Task 6: Update sitemap.xml with Phase 1 URLs

**Files:**
- Modify: `public/sitemap.xml`

- [ ] **Step 1: Add new URLs to sitemap**

Replace the entire `public/sitemap.xml` with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

  <!-- Homepage / Main App -->
  <url>
    <loc>https://kasino21.com/</loc>
    <lastmod>2026-05-19</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- How to Play -->
  <url>
    <loc>https://kasino21.com/como-jugar</loc>
    <lastmod>2026-05-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <!-- Blog -->
  <url>
    <loc>https://kasino21.com/blog</loc>
    <lastmod>2026-05-19</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- FAQ -->
  <url>
    <loc>https://kasino21.com/faq</loc>
    <lastmod>2026-05-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- About -->
  <url>
    <loc>https://kasino21.com/about</loc>
    <lastmod>2026-05-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Contact -->
  <url>
    <loc>https://kasino21.com/contact</loc>
    <lastmod>2026-05-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Privacy Policy -->
  <url>
    <loc>https://kasino21.com/privacy</loc>
    <lastmod>2026-05-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Terms of Service -->
  <url>
    <loc>https://kasino21.com/terms</loc>
    <lastmod>2026-05-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Cookie Policy -->
  <url>
    <loc>https://kasino21.com/cookies</loc>
    <lastmod>2026-05-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>

</urlset>
```

- [ ] **Step 2: Commit**

```bash
git add public/sitemap.xml
git commit -m "update: sitemap with all new content routes"
```

---

## Phase 2: Required Pages

### Task 7: Create About Us page

**Files:**
- Create: `src/web/components/About.tsx`
- Modify: `src/web/App.tsx`

- [ ] **Step 1: Create About.tsx**

```tsx
import React, { useLayoutEffect } from 'react';
import { LogoK21 } from './LogoK21';
import { updateSEO, resetSEO } from '../utils/seo';

export function About() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Sobre Nosotros | Kasino21 — Juego de Cartas Online',
      description: 'Conoce al equipo detrás de Kasino21, el juego de cartas 21 en español. Nuestra misión, tecnología y valores.',
      canonical: 'https://kasino21.com/about',
    });
    return () => resetSEO();
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-[#020617] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="opacity-90 group-hover:opacity-100 transition-opacity">
              <LogoK21 size={36} />
            </div>
            <span className="font-display font-black text-casino-gold tracking-wider text-lg">KASINO21</span>
          </a>
          <nav className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <a href="/blog" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">Blog</a>
            <a href="/faq" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">FAQ</a>
            <a href="/contact" className="text-gray-500 hover:text-casino-gold transition-colors">Contacto</a>
            <a
              href="/"
              className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform"
            >
              JUGAR AHORA
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-transparent to-amber-900/20 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-2 text-xs text-yellow-400 font-bold uppercase tracking-widest mb-4">
            <span className="w-6 h-px bg-yellow-400" />
            Sobre Nosotros / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            Sobre <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">Kasino21</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            Un proyecto nacido de la pasión por los juegos de cartas y la tecnología.
            Creamos un espacio donde jugadores de habla hispana pueden competir, aprender y divertirse.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        <Section icon="👤" title="¿Quién está detrás de Kasino21?">
          <p>
            Kasino21 fue creado por <strong>Angel</strong>, un desarrollador apasionado por los juegos de cartas
            y la programación. La idea nació de querer tener un juego de 21 digital que pudiera compartir
            con amigos y la comunidad hispanohablante, sin necesidad de descargar nada.
          </p>
          <p className="mt-3">
            Todo el desarrollo, diseño y programación ha sido hecho con cariño y dedicación, utilizando
            tecnologías modernas como React, Socket.io y Supabase para ofrecer una experiencia fluida
            en tiempo real.
          </p>
        </Section>

        <Section icon="🎯" title="Nuestra Misión">
          <p>
            Nuestra misión es simple: ofrecer el mejor juego de cartas 21 online en español, completamente
            gratuito y accesible desde cualquier navegador. No cobramos dinero real, no hay apuestas reales,
            solo diversión competitiva.
          </p>
          <p className="mt-3">
            Queremos que cada jugador, sin importar su nivel, pueda disfrutar de partidas justas,
            mejorar su estrategia y competir en un ambiente respetuoso.
          </p>
        </Section>

        <Section icon="⚙️" title="Tecnología">
          <p>Kasino21 está construido con tecnologías modernas y open source:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              { name: 'React 19', desc: 'Interfaz rápida y responsiva' },
              { name: 'Socket.io', desc: 'Comunicación en tiempo real' },
              { name: 'Supabase', desc: 'Autenticación y base de datos' },
              { name: 'Vite', desc: 'Build tool ultrarrápida' },
              { name: 'Tailwind CSS', desc: 'Diseño moderno y consistente' },
              { name: 'TypeScript', desc: 'Código seguro y mantenible' },
            ].map(({ name, desc }) => (
              <div key={name} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm font-bold text-casino-gold">{name}</p>
                <p className="text-xs text-gray-500 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon="💎" title="Nuestros Valores">
          <div className="space-y-4">
            {[
              {
                title: '100% Gratuito',
                desc: 'El juego es completamente gratis. Las monedas virtuales no tienen valor monetario real y no se pueden comprar ni vender.',
              },
              {
                title: 'Juego Justo',
                desc: 'Sistema de emparejamiento por ELO que enfrenta jugadores de nivel similar. Sin trampas, sin ventajas ocultas.',
              },
              {
                title: 'Privacidad Primero',
                desc: 'Recopilamos solo los datos mínimos necesarios. No vendemos tu información a terceros.',
              },
              {
                title: 'Sin Apuestas Reales',
                desc: 'Kasino21 no es un casino real. No hay dinero real involucrado. Es un juego de cartas competitivo para divertirse.',
              },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon="📬" title="Contacto">
          <p>¿Tienes preguntas, sugerencias o quieres reportar un problema?</p>
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 border border-yellow-500/30 rounded-xl flex items-center justify-center text-2xl shrink-0">
              📧
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Escríbenos</p>
              <a href="mailto:kasino.21@gmail.com" className="text-casino-gold hover:text-white transition-colors font-mono text-sm">
                kasino.21@gmail.com
              </a>
              <p className="text-xs text-gray-600 mt-1">Respondemos en 24-48 horas</p>
            </div>
          </div>
        </Section>

      </main>

      {/* Footer */}
      <AboutFooter />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-display font-black text-white tracking-tight">{title}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-2" />
      </div>
      <div className="text-gray-400 text-sm leading-relaxed space-y-3 pl-6 md:pl-10">
        {children}
      </div>
    </section>
  );
}

function AboutFooter() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-black/20">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LogoK21 size={28} />
          <div>
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">KASINO21</p>
            <p className="text-[10px] text-gray-600">© 2026 · Todos los derechos reservados</p>
          </div>
        </div>
        <nav className="flex gap-6">
          <a href="/privacy" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Privacidad</a>
          <a href="/terms" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Términos</a>
          <a href="/cookies" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Cookies</a>
        </nav>
        <a
          href="/"
          className="text-xs bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
        >
          JUGAR AHORA
        </a>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Register route in App.tsx**

In `src/web/App.tsx`, find the lazy imports section and add after the ComoJugar import:

```tsx
const About = lazy(() => import('./components/About').then(m => ({ default: m.About })));
```

Then find the legal page router section:
```tsx
if (pathname === '/como-jugar') return <Suspense fallback={<LoadingFallback />}><ComoJugar /></Suspense>;
```

Add immediately after:
```tsx
if (pathname === '/about') return <Suspense fallback={<LoadingFallback />}><About /></Suspense>;
```

- [ ] **Step 3: Commit**

```bash
git add src/web/components/About.tsx src/web/App.tsx
git commit -m "feat: add About Us page with route"
```

---

### Task 8: Create Contact page

**Files:**
- Create: `src/web/components/Contact.tsx`
- Modify: `src/web/App.tsx`

- [ ] **Step 1: Create Contact.tsx**

```tsx
import React, { useLayoutEffect, useState } from 'react';
import { LogoK21 } from './LogoK21';
import { updateSEO, resetSEO } from '../utils/seo';

export function Contact() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Contacto | Kasino21 — Juego de Cartas Online',
      description: '¿Tienes preguntas o sugerencias? Contáctanos. Respondemos en 24-48 horas.',
      canonical: 'https://kasino21.com/contact',
    });
    return () => resetSEO();
  }, []);

  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Contacto desde Kasino21 - ${formData.name}`);
    const body = encodeURIComponent(
      `Nombre: ${formData.name}\nEmail: ${formData.email}\n\nMensaje:\n${formData.message}`
    );
    window.location.href = `mailto:kansino21.service@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="h-screen overflow-y-auto bg-[#020617] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="opacity-90 group-hover:opacity-100 transition-opacity">
              <LogoK21 size={36} />
            </div>
            <span className="font-display font-black text-casino-gold tracking-wider text-lg">KASINO21</span>
          </a>
          <nav className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <a href="/blog" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">Blog</a>
            <a href="/faq" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">FAQ</a>
            <a href="/about" className="text-gray-500 hover:text-casino-gold transition-colors">Nosotros</a>
            <a
              href="/"
              className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform"
            >
              JUGAR AHORA
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-transparent to-emerald-900/20 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-2 text-xs text-green-400 font-bold uppercase tracking-widest mb-4">
            <span className="w-6 h-px bg-green-400" />
            Contacto / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Contacto</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            ¿Tienes preguntas, sugerencias o quieres reportar un problema? Nos encanta escucharte.
            Respondemos en 24-48 horas.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        {/* Contact Methods */}
        <Section icon="📧" title="Formas de Contacto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <ContactCard
              icon="🎮"
              title="Soporte del Juego"
              email="kansino21.service@gmail.com"
              desc="Problemas técnicos, bugs, cuentas"
            />
            <ContactCard
              icon="💼"
              title="Negocios y Publicidad"
              email="kasino.21@gmail.com"
              desc="Consultas generales, colaboraciones"
            />
          </div>
          <p className="mt-4 text-sm text-gray-500">
            También puedes usar el formulario de abajo y se abrirá tu cliente de correo automáticamente.
          </p>
        </Section>

        {/* Contact Form */}
        <Section icon="✍️" title="Envíanos un Mensaje">
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-w-lg">
            <div>
              <label htmlFor="contact-name" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Nombre
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-casino-gold/50 focus:ring-1 focus:ring-casino-gold/20 transition-all"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-casino-gold/50 focus:ring-1 focus:ring-casino-gold/20 transition-all"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Mensaje
              </label>
              <textarea
                id="contact-message"
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-casino-gold/50 focus:ring-1 focus:ring-casino-gold/20 transition-all resize-none"
                placeholder="¿En qué podemos ayudarte?"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-sm px-6 py-3 rounded-xl hover:scale-105 transition-transform"
            >
              ENVIAR MENSAJE
            </button>
            <p className="text-[10px] text-gray-600 text-center">
              Se abrirá tu cliente de correo electrónico para enviar el mensaje.
            </p>
          </form>
        </Section>

        {/* Response Time */}
        <Section icon="⏱️" title="Tiempo de Respuesta">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-3xl font-black text-casino-gold">24-48h</p>
            <p className="text-sm text-gray-400 mt-2">
              Respondemos todos los mensajes en un plazo de 24 a 48 horas hábiles.
            </p>
          </div>
        </Section>

      </main>

      {/* Footer */}
      <ContactFooter />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-display font-black text-white tracking-tight">{title}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-2" />
      </div>
      <div className="text-gray-400 text-sm leading-relaxed space-y-3 pl-6 md:pl-10">
        {children}
      </div>
    </section>
  );
}

function ContactCard({ icon, title, email, desc }: { icon: string; title: string; email: string; desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-sm font-bold text-white mt-2">{title}</p>
      <a href={`mailto:${email}`} className="text-casino-gold hover:text-white transition-colors font-mono text-xs mt-1 block">
        {email}
      </a>
      <p className="text-[10px] text-gray-600 mt-1">{desc}</p>
    </div>
  );
}

function ContactFooter() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-black/20">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LogoK21 size={28} />
          <div>
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">KASINO21</p>
            <p className="text-[10px] text-gray-600">© 2026 · Todos los derechos reservados</p>
          </div>
        </div>
        <nav className="flex gap-6">
          <a href="/privacy" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Privacidad</a>
          <a href="/terms" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Términos</a>
          <a href="/cookies" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Cookies</a>
        </nav>
        <a
          href="/"
          className="text-xs bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
        >
          JUGAR AHORA
        </a>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Register route in App.tsx**

In `src/web/App.tsx`, add the lazy import:
```tsx
const Contact = lazy(() => import('./components/Contact').then(m => ({ default: m.Contact })));
```

Add route after `/about`:
```tsx
if (pathname === '/contact') return <Suspense fallback={<LoadingFallback />}><Contact /></Suspense>;
```

- [ ] **Step 3: Commit**

```bash
git add src/web/components/Contact.tsx src/web/App.tsx
git commit -m "feat: add Contact page with route and mailto form"
```

---

### Task 9: Create Cookie Consent Banner

**Files:**
- Create: `src/web/components/CookieConsent.tsx`
- Modify: `src/web/App.tsx`

- [ ] **Step 1: Create CookieConsent.tsx**

```tsx
import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'cookie_consent';

interface ConsentData {
  accepted: boolean;
  timestamp: string;
}

export function getCookieConsent(): ConsentData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // localStorage unavailable (private browsing)
  }
  return null;
}

export function setCookieConsent(accepted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      accepted,
      timestamp: new Date().toISOString(),
    }));
  } catch {
    // localStorage unavailable
  }
}

export function clearCookieConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    setCookieConsent(true);
    setVisible(false);
  };

  const handleReject = () => {
    setCookieConsent(false);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] animate-slide-up">
      <div className="bg-[#0f172a]/98 backdrop-blur-xl border-t border-yellow-500/20 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-300 leading-relaxed">
                Usamos cookies para mejorar tu experiencia y mostrar anuncios relevantes.
                Los anuncios nos ayudan a mantener el juego gratuito.{' '}
                <a href="/cookies" className="text-casino-gold hover:underline font-bold">
                  Más información
                </a>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/cookies"
                className="text-xs text-gray-500 hover:text-gray-300 px-3 py-2 rounded-lg transition-colors font-bold uppercase tracking-wider"
              >
                Configurar
              </a>
              <button
                onClick={handleReject}
                className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-4 py-2 rounded-xl transition-all font-bold uppercase tracking-wider"
              >
                Rechazar
              </button>
              <button
                onClick={handleAccept}
                className="text-xs bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-5 py-2 rounded-xl font-black uppercase tracking-wider hover:scale-105 transition-transform"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate CookieConsent into App.tsx**

In `src/web/App.tsx`, add the import:
```tsx
import { CookieConsent } from './components/CookieConsent';
```

Find the closing of the main App return, just before the final `</AuthProvider>`:
```tsx
          </div>
        </GameProvider>
      </AudioProvider>
    </AuthProvider>
  );
}
```

Add `<CookieConsent />` right before the closing `</AuthProvider>`:
```tsx
          </div>
          <CookieConsent />
        </GameProvider>
      </AudioProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/web/components/CookieConsent.tsx src/web/App.tsx
git commit -m "feat: add cookie consent banner with GDPR compliance"
```

---

### Task 10: Add static HTML generation for Phase 2 pages

**Files:**
- Modify: `scripts/generate-seo-pages.mjs`

- [ ] **Step 1: Add about and contact to generate-seo-pages.mjs**

Find the `PAGES` object in `scripts/generate-seo-pages.mjs` and add these entries:

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/generate-seo-pages.mjs
git commit -m "update: add about and contact to static SEO page generation"
```

---

## Phase 3: Content & Social Proof

### Task 11: Create blog data file

**Files:**
- Create: `src/web/data/blog-posts.ts`

- [ ] **Step 1: Create blog-posts.ts**

```ts
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: string;
  readTime: number;
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'como-jugar-casino-21-guia-completa',
    title: 'Cómo Jugar Casino 21 — Guía Completa para Principiantes',
    excerpt: 'Aprende desde cero las reglas, mecánicas y estrategias básicas del juego de cartas Casino 21.',
    date: '2026-05-19',
    category: 'Guías',
    readTime: 8,
    content: `
<h2>¿Qué es Casino 21?</h2>
<p>Casino 21 es un juego de cartas competitivo donde el objetivo es ser el primero en acumular 21 puntos a lo largo de varias rondas. A diferencia del blackjack, aquí no se trata de acercarse a 21 sin pasarse, sino de sumar puntos recolectando cartas de la mesa mediante estrategias de coincidencia y sumatorias.</p>

<h2>El Valor de las Cartas</h2>
<p>Se utiliza una baraja francesa estándar de 52 cartas. Cada carta tiene un valor numérico:</p>
<ul>
<li><strong>As:</strong> 1 punto</li>
<li><strong>2 al 10:</strong> Su valor nominal</li>
<li><strong>J (Jota):</strong> 11 puntos</li>
<li><strong>Q (Reina):</strong> 12 puntos</li>
<li><strong>K (Rey):</strong> 13 puntos</li>
</ul>
<p>Los palos no afectan el valor numérico, pero son importantes para la puntuación final (especialmente las picas).</p>

<h2>Inicio de la Partida</h2>
<p>Al comenzar cada ronda, cada jugador recibe 4 cartas en su mano y se colocan 4 cartas descubiertas en la mesa (el board). El jugador que repartió las cartas tiene el último turno de la ronda.</p>

<h2>Acciones Disponibles</h2>
<p>En tu turno debes jugar una carta de tu mano. Tienes cuatro opciones:</p>

<h3>1. Llevar Cartas</h3>
<p>Si juegas una carta cuyo valor coincide con una o más cartas en la mesa, puedes llevarte todas esas cartas. Se retiran del board y se añaden a tu colección de puntos.</p>

<h3>2. Formar Sumatorias</h3>
<p>Puedes agrupar cartas del board cuya suma total sea igual al valor de una carta en tu mano. Al jugar esa carta, te llevas todas las cartas de la sumatoria. Otros jugadores también pueden aprovechar tu sumatoria si tienen la carta adecuada.</p>

<h3>3. Cantar un As</h3>
<p>Si tienes dos Ases en tu mano, puedes colocar un As en el board de forma protegida. Ese As no podrá ser llevado por otros jugadores hasta tu próximo turno.</p>

<h3>4. Colocar Carta en el Board</h3>
<p>Si tu carta no coincide con ninguna del board y no formas sumatoria, la carta se coloca en la mesa como nueva carta disponible para futuros turnos.</p>

<h2>El Virado</h2>
<p>Cuando un jugador toma la última carta del board, recibe un "Virado", que otorga 1 punto adicional al final de la ronda. Es una mecánica importante que puede marcar la diferencia en partidas cerradas.</p>

<h2>Puntuación por Ronda</h2>
<p>Al final de cada ronda se calculan los puntos:</p>
<ul>
<li><strong>Mayoría de cartas:</strong> 3 puntos</li>
<li><strong>Mayoría de picas:</strong> 1 punto</li>
<li><strong>10 de diamantes:</strong> 2 puntos</li>
<li><strong>2 de picas:</strong> 1 punto</li>
<li><strong>Cada As:</strong> 1 punto</li>
<li><strong>Cada Virado:</strong> 1 punto</li>
</ul>

<h2>Reglas Especiales Cerca de 21</h2>
<p>Cuando un jugador se acerca a la victoria, algunas categorías dejan de otorgar puntos:</p>
<ul>
<li><strong>17 puntos:</strong> Solo mayoría de cartas (+3) y mayoría de picas (+1)</li>
<li><strong>18-19 puntos:</strong> Solo mayoría de cartas (+3)</li>
<li><strong>20 puntos:</strong> Solo mayoría de picas (+1)</li>
</ul>

<h2>Victoria</h2>
<p>El primer jugador o equipo en alcanzar 21 puntos o más gana la partida. Si se acaba el mazo antes de que alguien llegue a 21, gana quien tenga mayor puntuación acumulada.</p>

<h2>Consejos para Principiantes</h2>
<ul>
<li>Prioriza llevar Ases y cartas de picas siempre que puedas</li>
<li>El 10 de diamantes vale 2 puntos solos — no lo subestimes</li>
<li>Los Virados son puntos "gratis" que marcan la diferencia</li>
<li>No te obsesiones con una sola estrategia — adapta tu juego a las cartas disponibles</li>
<li>Practica contra el bot antes de entrar a partidas ranked</li>
</ul>
`,
  },
  {
    slug: '5-estrategias-mejorar-elo',
    title: '5 Estrategias para Mejorar tu ELO en Kasino21',
    excerpt: 'Consejos prácticos para subir de rango y dominar el sistema de emparejamiento.',
    date: '2026-05-18',
    category: 'Estrategia',
    readTime: 6,
    content: `
<h2>¿Qué es el ELO?</h2>
<p>El sistema ELO es un método de clasificación que mide tu nivel de juego relativo. Cada partida que juegas puede subir o bajar tu puntuación ELO dependiendo del resultado y del nivel de tu oponente.</p>

<h2>Estrategia 1: Domina las Sumatorias</h2>
<p>Los jugadores principiantes solo buscan coincidencias directas. Los expertos forman sumatorias complejas que les permiten llevarse múltiples cartas de una vez. Practica identificar combinaciones de cartas en el board que sumen el valor de las cartas en tu mano.</p>

<h2>Estrategia 2: Controla el Board</h2>
<p>El jugador que controla qué cartas hay en la mesa controla la partida. Si ves que tu oponente necesita cartas específicas, intenta colocar cartas que dificulten sus movimientos. La defensa es tan importante como el ataque.</p>

<h2>Estrategia 3: Prioriza los Ases y las Picas</h2>
<p>Los Ases valen 1 punto cada uno y las picas dan la categoría de "Mayoría de picas" (+1 punto). Si puedes elegir entre llevar cartas de diferentes palos, prioriza las picas. Los Ases siempre son valiosos.</p>

<h2>Estrategia 4: No Ignore los Virados</h2>
<p>Cada Virado es un punto gratis. Intenta ser el jugador que toma la última carta del board. Esto requiere planificación: cuenta las cartas restantes y anticipa cuándo se vaciará el board.</p>

<h2>Estrategia 5: Juega con Calma</h2>
<p>Tienes 30 segundos por turno. No te apresures. Usa el tiempo para analizar todas las opciones disponibles. Los jugadores que juegan rápido cometen más errores. La paciencia es tu mejor aliada para subir de ELO.</p>

<h2>Bonus: Practica Contra el Bot</h2>
<p>Antes de entrar a ranked, practica contra el bot con diferentes niveles de dificultad. Esto te permite probar estrategias sin riesgo de perder puntos ELO.</p>
`,
  },
  {
    slug: 'casino-21-vs-blackjack',
    title: 'Casino 21 vs Blackjack Tradicional: ¿Cuál es la Diferencia?',
    excerpt: 'Descubre las diferencias clave entre nuestro Casino 21 y el blackjack clásico de casino.',
    date: '2026-05-17',
    category: 'Guías',
    readTime: 5,
    content: `
<h2>Dos Juegos Diferentes con un Nombre Similar</h2>
<p>Mucha gente confunde Casino 21 con el blackjack porque ambos tienen "21" en el nombre. Pero son juegos completamente diferentes. Aquí te explicamos las diferencias clave.</p>

<h2>Objetivo del Juego</h2>
<p><strong>Blackjack:</strong> Acercarte a 21 puntos sin pasarte, compitiendo contra el dealer en una sola mano.</p>
<p><strong>Casino 21:</strong> Acumular 21 puntos a lo largo de múltiples rondas recolectando cartas de la mesa mediante coincidencias y sumatorias.</p>

<h2>Mecánica de Juego</h2>
<p><strong>Blackjack:</strong> Recibes 2 cartas y decides si pedir más, plantarte, doblar o dividir. Es un juego de decisiones binarias contra el dealer.</p>
<p><strong>Casino 21:</strong> Tienes 4 cartas en mano y 4 en la mesa. En cada turno juegas una carta para llevar cartas del board, formar sumatorias, o colocar nuevas cartas. Es un juego de estrategia y planificación a largo plazo.</p>

<h2>Número de Jugadores</h2>
<p><strong>Blackjack:</strong> Generalmente juegas solo contra el dealer, aunque puede haber otros jugadores en la misma mesa.</p>
<p><strong>Casino 21:</strong> Competición directa 1v1 o en equipos 2v2. Cada movimiento afecta directamente a tu oponente.</p>

<h2>Habilidad vs Suerte</h2>
<p><strong>Blackjack:</strong> Tiene un componente de suerte significativo (las cartas que recibes). La estrategia básica reduce la ventaja de la casa pero no la elimina.</p>
<p><strong>Casino 21:</strong> Es predominantemente un juego de habilidad. La memoria, el cálculo y la planificación estratégica son los factores determinantes. No hay "casa" contra la que jugar.</p>

<h2>¿Cuál es Mejor?</h2>
<p>Depende de lo que busques. Si quieres acción rápida y emociones fuertes, el blackjack puede ser más emocionante. Si prefieres un juego de estrategia profunda donde la habilidad marca la diferencia, Casino 21 es para ti.</p>
<p>En Kasino21, además, no hay dinero real involucrado. Es pura competencia y diversión.</p>
`,
  },
  {
    slug: 'como-funcionan-torneos',
    title: 'Cómo Funcionan los Torneos en Kasino21',
    excerpt: 'Todo lo que necesitas saber sobre los torneos semanales: inscripción, formato y premios.',
    date: '2026-05-16',
    category: 'Guías',
    readTime: 5,
    content: `
<h2>¿Qué son los Torneos?</h2>
<p>Los torneos son competiciones especiales donde múltiples jugadores se enfrentan durante un período limitado para acumular la mayor cantidad de victorias y puntos. Son la forma más emocionante de competir en Kasino21.</p>

<h2>Formato del Torneo</h2>
<p>Cada torneo tiene una duración definida (generalmente semanal). Durante este período, puedes jugar partidas que cuentan para el torneo. Tus resultados se acumulan en una tabla de clasificación en tiempo real.</p>

<h2>¿Cómo Participar?</h2>
<p>Los torneos activos se muestran en la página principal del juego. Simplemente haz clic en el torneo que te interesa y empieza a jugar. No necesitas inscripción previa — tus partidas cuentan automáticamente.</p>

<h2>Sistema de Puntuación</h2>
<p>En los torneos, no solo importa ganar. El sistema de puntuación del torneo considera:</p>
<ul>
<li>Victorias obtenidas</li>
<li>Puntuación diferencial en cada partida</li>
<li>Número total de partidas jugadas</li>
</ul>

<h2>Premios</h2>
<p>Los mejores jugadores en la tabla de clasificación reciben premios al finalizar el torneo. Los premios pueden incluir monedas virtuales, avatares exclusivos y reconocimiento en la plataforma.</p>

<h2>Consejos para Torneos</h2>
<ul>
<li>Juega consistentemente durante todo el período del torneo</li>
<li>No te desanimes por una mala racha — el sistema premia la consistencia</li>
<li>Observa la tabla de clasificación para saber dónde estás</li>
<li>Las últimas horas del torneo son las más competitivas — planifica tu estrategia</li>
</ul>
`,
  },
  {
    slug: 'guia-puntuacion-maximizar-puntos',
    title: 'Guía de Puntuación: Cómo Maximizar tus Puntos en Kasino21',
    excerpt: 'Aprende a calcular y optimizar tu puntuación para ganar más partidas.',
    date: '2026-05-15',
    category: 'Estrategia',
    readTime: 7,
    content: `
<h2>Entendiendo el Sistema de Puntuación</h2>
<p>En Casino 21, los puntos se acumulan ronda tras ronda hasta que un jugador alcanza 21. Cada ronda otorga puntos en varias categorías. Entender cómo se distribuyen estos puntos es clave para ganar.</p>

<h2>Desglose de Puntos por Ronda</h2>

<h3>Mayoría de Cartas — 3 puntos</h3>
<p>El jugador con más cartas recolectadas al final de la ronda obtiene 3 puntos. Esta es la categoría más valiosa. Prioriza llevar cartas siempre que puedas, incluso si no son de alto valor individual.</p>

<h3>Mayoría de Picas — 1 punto</h3>
<p>El jugador con más cartas de picas (♠) obtiene 1 punto adicional. Si hay empate en picas, nadie obtiene este punto. Las picas son tu seguro contra empates.</p>

<h3>10 de Diamantes — 2 puntos</h3>
<p>Quien tenga el 10 de diamantes al final de la ronda obtiene 2 puntos. Esta carta individual vale más que cualquier otra. Siempre intenta capturarla.</p>

<h3>2 de Picas — 1 punto</h3>
<p>Similar al 10 de diamantes, quien tenga el 2 de picas obtiene 1 punto. Es una carta fácil de pasar por alto pero valiosa.</p>

<h3>Ases — 1 punto cada uno</h3>
<p>Cada As recolectado vale 1 punto. Con 4 Ases en la baraja, hay 4 puntos en juego solo por Ases.</p>

<h3>Virados — 1 punto cada uno</h3>
<p>Cada vez que tomas la última carta del board, obtienes un Virado (+1 punto). Los Virados son puntos "extra" que muchos jugadores ignoran.</p>

<h2>Estrategias de Maximización</h2>

<h3>1. Cuenta los Puntos Disponibles</h3>
<p>En cada ronda hay un máximo de puntos disponibles. Si puedes calcular cuántos puntos hay en juego y cuántos tiene tu oponente, puedes tomar decisiones más informadas.</p>

<h3>2. No Subestimes las Cartas Pequeñas</h3>
<p>Las cartas de valor bajo (2, 3, 4) son útiles para formar sumatorias y para ganar la categoría de "Mayoría de cartas". No las ignores.</p>

<h3>3. El 10 de Diamantes es Oro</h3>
<p>Vale 2 puntos por sí solo. Si ves el 10 de diamantes en el board, haz todo lo posible por capturarlo.</p>

<h3>4. Planifica los Virados</h3>
<p>Cuenta las cartas del board. Si sabes que quedan 2 cartas y tu oponente tiene 1 en la mano, puedes planificar para ser tú quien tome la última.</p>

<h2>Las Reglas de los 17-20 Puntos</h2>
<p>Cuando un jugador se acerca a 21, las reglas cambian para evitar que la partida se extienda indefinidamente:</p>
<ul>
<li><strong>17 pts:</strong> Solo cuentan mayoría de cartas (+3) y mayoría de picas (+1)</li>
<li><strong>18-19 pts:</strong> Solo cuenta mayoría de cartas (+3)</li>
<li><strong>20 pts:</strong> Solo cuenta mayoría de picas (+1)</li>
</ul>
<p>Esto significa que si vas ganando, tu oponente tiene menos oportunidades de alcanzar. Pero si vas perdiendo, necesitas ser más estratégico sobre qué categorías priorizar.</p>
`,
  },
  {
    slug: 'preguntas-frecuentes-casino-21',
    title: 'Preguntas Frecuentes sobre Kasino21',
    excerpt: 'Respuestas a las preguntas más comunes sobre el juego, cuentas, torneos y más.',
    date: '2026-05-14',
    category: 'General',
    readTime: 6,
    content: `
<h2>General</h2>

<h3>¿Qué es Kasino21?</h3>
<p>Kasino21 es un juego de cartas competitivo online basado en el juego tradicional de 21. Es completamente gratuito y se juega directamente desde tu navegador sin necesidad de descargas.</p>

<h3>¿Es realmente gratis?</h3>
<p>Sí, 100% gratuito. Las monedas del juego son virtuales y no tienen valor monetario real. No se pueden comprar ni vender. El juego se mantiene mediante publicidad no intrusiva.</p>

<h3>¿Necesito crear una cuenta?</h3>
<p>Sí, necesitas una cuenta para guardar tu progreso, tu rango ELO y tu historial de partidas. El registro es rápido y solo requiere un correo electrónico.</p>

<h2>Juego</h2>

<h3>¿Cuántos jugadores hay por partida?</h3>
<p>Puedes jugar en modo 1v1 (duelo directo) o 2v2 (equipos de dos jugadores).</p>

<h3>¿Puedo jugar contra bots?</h3>
<p>Sí, ofrecemos un modo contra bots con diferentes niveles de dificultad. Es perfecto para practicar antes de competir contra otros jugadores.</p>

<h3>¿Qué pasa si me desconecto durante una partida?</h3>
<p>Si te desconectas, tienes un tiempo limitado para reconectarte y continuar la partida. Si no te reconectas, la partida se resuelve según las reglas del juego y puedes perder puntos ELO.</p>

<h3>¿El juego funciona en móvil?</h3>
<p>Sí, Kasino21 es completamente responsivo y funciona en navegadores móviles. También puedes instalarlo como PWA (Progressive Web App) para una experiencia más parecida a una app nativa.</p>

<h2>Cuentas y Progreso</h2>

<h3>¿Puedo cambiar mi nombre de usuario?</h3>
<p>Actualmente el nombre de usuario se establece al crear la cuenta. Si necesitas cambiarlo, contáctanos y te ayudaremos.</p>

<h3>¿Cómo funciona el sistema ELO?</h3>
<p>El sistema ELO ajusta tu puntuación después de cada partida. Si ganas contra un jugador con ELO más alto, ganas más puntos. Si pierdes contra alguien con ELO más bajo, pierdes más puntos. Esto asegura emparejamientos justos.</p>

<h2>Torneos</h2>

<h3>¿Cómo participo en un torneo?</h3>
<p>Los torneos activos aparecen en la página principal. Simplemente juega partidas durante el período del torneo y tus resultados se acumulan automáticamente en la tabla de clasificación.</p>

<h3>¿Los torneos tienen costo?</h3>
<p>Los torneos son gratuitos. No necesitas pagar nada para participar.</p>

<h2>Monedas</h2>

<h3>¿Las monedas tienen valor real?</h3>
<p>No. Las monedas son completamente virtuales y solo existen dentro del juego. No se pueden convertir en dinero real ni transferir a otros jugadores.</p>

<h3>¿Cómo consigo más monedas?</h3>
<p>Puedes ganar monedas jugando partidas, completando misiones diarias, participando en torneos o viendo anuncios patrocinados en la tienda.</p>

<h2>Soporte</h2>

<h3>¿Cómo reporto un problema?</h3>
<p>Puedes contactarnos a través de la página de Contacto o enviando un email a kansino21.service@gmail.com. Respondemos en 24-48 horas.</p>

<h3>¿Hay un modo de práctica?</h3>
<p>Sí, el modo contra bot funciona como modo de práctica. Puedes jugar sin riesgo de perder puntos ELO.</p>
`,
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}

export function getBlogCategories(): string[] {
  const categories = new Set(blogPosts.map(post => post.category));
  return Array.from(categories);
}

export function getPostsByCategory(category: string): BlogPost[] {
  return blogPosts.filter(post => post.category === category);
}

export function getRelatedPosts(slug: string, limit: number = 3): BlogPost[] {
  const current = getBlogPostBySlug(slug);
  if (!current) return blogPosts.slice(0, limit);
  return blogPosts
    .filter(post => post.slug !== slug && post.category === current.category)
    .slice(0, limit);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/web/data/blog-posts.ts
git commit -m "feat: add blog posts data with 6 articles"
```

---

### Task 12: Create FAQ data file

**Files:**
- Create: `src/web/data/faq-data.ts`

- [ ] **Step 1: Create faq-data.ts**

```ts
export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export const faqData: FAQItem[] = [
  {
    question: '¿Qué es Kasino21?',
    answer: 'Kasino21 es un juego de cartas competitivo online basado en el juego tradicional de 21. Es completamente gratuito y se juega directamente desde tu navegador sin necesidad de descargas. Puedes jugar en modo 1v1 o 2v2 contra otros jugadores reales o contra bots.',
    category: 'General',
  },
  {
    question: '¿Es gratuito?',
    answer: 'Sí, Kasino21 es 100% gratuito. Las monedas del juego son virtuales y no tienen valor monetario real. No se pueden comprar ni vender por dinero real. El juego se mantiene mediante publicidad no intrusiva de Google AdSense.',
    category: 'General',
  },
  {
    question: '¿Necesito crear una cuenta?',
    answer: 'Sí, necesitas crear una cuenta para guardar tu progreso, tu rango ELO, tu historial de partidas y tus logros. El registro es rápido y solo requiere un correo electrónico. Usamos Supabase para la autenticación segura.',
    category: 'Cuentas',
  },
  {
    question: '¿Puedo cambiar mi nombre de usuario?',
    answer: 'Actualmente el nombre de usuario se establece al crear la cuenta. Si necesitas cambiarlo por alguna razón, contáctanos a kansino21.service@gmail.com y te ayudaremos con el proceso.',
    category: 'Cuentas',
  },
  {
    question: '¿Cómo funciona el sistema ELO?',
    answer: 'El sistema ELO ajusta tu puntuación después de cada partida. Si ganas contra un jugador con ELO más alto, ganas más puntos. Si pierdes contra alguien con ELO más bajo, pierdes más puntos. El matchmaking busca oponentes con ELO similar (inicialmente ±50 puntos, expandiéndose hasta ±500 si no se encuentran rivales).',
    category: 'Juego',
  },
  {
    question: '¿Cuántos jugadores hay por partida?',
    answer: 'Puedes jugar en dos modos: 1v1 (duelo directo entre dos jugadores) o 2v2 (equipos de dos jugadores cada uno). Ambos modos tienen el mismo sistema de puntuación y reglas.',
    category: 'Juego',
  },
  {
    question: '¿Puedo jugar contra bots?',
    answer: 'Sí, ofrecemos un modo contra bots con diferentes niveles de dificultad. Es perfecto para practicar antes de competir contra otros jugadores. Cada anuncio visto desbloquea 10 partidas contra bots.',
    category: 'Juego',
  },
  {
    question: '¿Qué pasa si me desconecto durante una partida?',
    answer: 'Si te desconectas, tienes un tiempo limitado para reconectarte y continuar la partida. Si no te reconectas, la partida se resuelve según las reglas del juego y puedes perder puntos ELO. Te recomendamos tener una conexión estable.',
    category: 'Juego',
  },
  {
    question: '¿Cómo se calcula la puntuación?',
    answer: 'Al final de cada ronda se otorgan puntos por: mayoría de cartas (3 pts), mayoría de picas (1 pt), 10 de diamantes (2 pts), 2 de picas (1 pt), cada As (1 pt) y cada Virado (1 pt). El primero en alcanzar 21 puntos gana. Consulta nuestra guía completa de puntuación en el blog.',
    category: 'Juego',
  },
  {
    question: '¿El juego funciona en móvil?',
    answer: 'Sí, Kasino21 es completamente responsivo y funciona en navegadores móviles. También puedes instalarlo como PWA (Progressive Web App) para una experiencia más parecida a una app nativa con acceso directo desde tu pantalla de inicio.',
    category: 'General',
  },
  {
    question: '¿Las monedas tienen valor real?',
    answer: 'No. Las monedas son completamente virtuales y solo existen dentro del juego. No se pueden convertir en dinero real, transferir a otros jugadores ni usar fuera de Kasino21. No hay apuestas reales de ningún tipo.',
    category: 'Monedas',
  },
  {
    question: '¿Cómo consigo más monedas?',
    answer: 'Puedes ganar monedas de varias formas: jugando partidas (victoria y participación), completando misiones diarias, participando en torneos, o viendo anuncios patrocinados en la tienda del juego.',
    category: 'Monedas',
  },
  {
    question: '¿Qué son los torneos?',
    answer: 'Los torneos son competiciones especiales donde múltiples jugadores se enfrentan durante un período limitado (generalmente semanal) para acumular la mayor cantidad de victorias y puntos. Los mejores jugadores en la tabla de clasificación reciben premios virtuales.',
    category: 'Torneos',
  },
  {
    question: '¿Cómo participo en un torneo?',
    answer: 'Los torneos activos aparecen en la página principal del juego. Simplemente juega partidas durante el período del torneo y tus resultados se acumulan automáticamente en la tabla de clasificación. No necesitas inscripción previa.',
    category: 'Torneos',
  },
  {
    question: '¿Cómo funciona el sistema de anuncios?',
    answer: 'Kasino21 utiliza Google AdSense para mostrar anuncios que nos ayudan a mantener el juego gratuito. Los anuncios aparecen como intersticiales entre partidas, anuncios recompensados en la tienda, y anuncios de puerta para desbloquear partidas contra bots. Puedes ver nuestra política de cookies para más detalles.',
    category: 'General',
  },
  {
    question: '¿Cómo reporto un problema?',
    answer: 'Puedes contactarnos a través de la página de Contacto (/contact) o enviando un email a kansino21.service@gmail.com. Respondemos en un plazo de 24-48 horas. También puedes reportar bugs directamente desde el juego.',
    category: 'Cuentas',
  },
  {
    question: '¿Hay un modo de práctica?',
    answer: 'Sí, el modo contra bot funciona como modo de práctica. Puedes jugar contra la inteligencia artificial con diferentes niveles de dificultad sin riesgo de perder puntos ELO. Es ideal para aprender las reglas y probar estrategias.',
    category: 'Juego',
  },
];

export function getFAQCategories(): string[] {
  const categories = new Set(faqData.map(item => item.category));
  return Array.from(categories);
}

export function getFAQByCategory(category: string): FAQItem[] {
  return faqData.filter(item => item.category === category);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/web/data/faq-data.ts
git commit -m "feat: add FAQ data with 17 questions across 5 categories"
```

---

### Task 13: Create FAQ page

**Files:**
- Create: `src/web/components/FAQ.tsx`
- Modify: `src/web/App.tsx`

- [ ] **Step 1: Create FAQ.tsx**

```tsx
import React, { useLayoutEffect, useState } from 'react';
import { LogoK21 } from './LogoK21';
import { updateSEO, resetSEO } from '../utils/seo';
import { faqData, getFAQCategories, getFAQByCategory } from '../data/faq-data';

export function FAQ() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Preguntas Frecuentes | Kasino21 — Juego de Cartas Online',
      description: 'Respuestas a las preguntas más comunes sobre Kasino21: juego, cuentas, torneos, monedas y más.',
      canonical: 'https://kasino21.com/faq',
    });
    return () => resetSEO();
  }, []);

  const categories = getFAQCategories();
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = activeCategory === 'Todos'
    ? faqData
    : getFAQByCategory(activeCategory);

  const toggleItem = (index: number) => {
    setOpenIndex(prev => prev === index ? null : index);
  };

  return (
    <div className="h-screen overflow-y-auto bg-[#020617] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="opacity-90 group-hover:opacity-100 transition-opacity">
              <LogoK21 size={36} />
            </div>
            <span className="font-display font-black text-casino-gold tracking-wider text-lg">KASINO21</span>
          </a>
          <nav className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <a href="/blog" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">Blog</a>
            <a href="/about" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">Nosotros</a>
            <a href="/contact" className="text-gray-500 hover:text-casino-gold transition-colors">Contacto</a>
            <a
              href="/"
              className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform"
            >
              JUGAR AHORA
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-2 text-xs text-purple-400 font-bold uppercase tracking-widest mb-4">
            <span className="w-6 h-px bg-purple-400" />
            FAQ / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            Preguntas <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Frecuentes</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            Encuentra respuestas a las preguntas más comunes sobre Kasino21.
            Si no encuentras lo que buscas, contáctanos directamente.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory('Todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeCategory === 'Todos'
                ? 'bg-casino-gold text-black'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeCategory === cat
                  ? 'bg-casino-gold text-black'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {filtered.map((item, index) => (
            <FAQAccordion
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === index}
              onToggle={() => toggleItem(index)}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm mb-4">¿No encontraste lo que buscabas?</p>
          <a
            href="/contact"
            className="inline-block bg-white/5 border border-white/10 text-casino-gold hover:bg-white/10 px-6 py-3 rounded-xl text-sm font-bold transition-all"
          >
            Contáctanos →
          </a>
        </div>

      </main>

      {/* Footer */}
      <FAQFooter />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function FAQAccordion({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      isOpen ? 'border-casino-gold/30 bg-white/[0.03]' : 'border-white/10 bg-white/[0.02]'
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-bold text-white pr-4">{question}</span>
        <span className={`text-casino-gold text-lg transition-transform shrink-0 ${isOpen ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      {isOpen && (
        <div className="px-5 pb-4">
          <p className="text-sm text-gray-400 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

function FAQFooter() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-black/20">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LogoK21 size={28} />
          <div>
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">KASINO21</p>
            <p className="text-[10px] text-gray-600">© 2026 · Todos los derechos reservados</p>
          </div>
        </div>
        <nav className="flex gap-6">
          <a href="/privacy" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Privacidad</a>
          <a href="/terms" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Términos</a>
          <a href="/cookies" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Cookies</a>
        </nav>
        <a
          href="/"
          className="text-xs bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
        >
          JUGAR AHORA
        </a>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Register route in App.tsx**

Add lazy import:
```tsx
const FAQ = lazy(() => import('./components/FAQ').then(m => ({ default: m.FAQ })));
```

Add route after `/contact`:
```tsx
if (pathname === '/faq') return <Suspense fallback={<LoadingFallback />}><FAQ /></Suspense>;
```

- [ ] **Step 3: Commit**

```bash
git add src/web/components/FAQ.tsx src/web/App.tsx
git commit -m "feat: add FAQ page with accordion and category filter"
```

---

### Task 14: Create Blog listing page

**Files:**
- Create: `src/web/components/Blog.tsx`
- Modify: `src/web/App.tsx`

- [ ] **Step 1: Create Blog.tsx**

```tsx
import React, { useLayoutEffect, useState } from 'react';
import { LogoK21 } from './LogoK21';
import { updateSEO, resetSEO } from '../utils/seo';
import { blogPosts, getBlogCategories, getPostsByCategory } from '../data/blog-posts';

export function Blog() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Blog | Kasino21 — Guías, Estrategias y Noticias del Juego de Cartas',
      description: 'Aprende a jugar mejor con nuestras guías, estrategias y consejos para Kasino21, el juego de cartas 21 online en español.',
      canonical: 'https://kasino21.com/blog',
    });
    return () => resetSEO();
  }, []);

  const categories = getBlogCategories();
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  const filtered = activeCategory === 'Todos'
    ? blogPosts
    : getPostsByCategory(activeCategory);

  return (
    <div className="h-screen overflow-y-auto bg-[#020617] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="opacity-90 group-hover:opacity-100 transition-opacity">
              <LogoK21 size={36} />
            </div>
            <span className="font-display font-black text-casino-gold tracking-wider text-lg">KASINO21</span>
          </a>
          <nav className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <a href="/faq" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">FAQ</a>
            <a href="/about" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">Nosotros</a>
            <a href="/contact" className="text-gray-500 hover:text-casino-gold transition-colors">Contacto</a>
            <a
              href="/"
              className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform"
            >
              JUGAR AHORA
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-blue-900/20 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold uppercase tracking-widest mb-4">
            <span className="w-6 h-px bg-cyan-400" />
            Blog / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            Blog y <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Guías</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            Aprende a jugar mejor con nuestras guías, estrategias y consejos.
            Desde principiantes hasta jugadores avanzados.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory('Todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeCategory === 'Todos'
                ? 'bg-casino-gold text-black'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeCategory === cat
                  ? 'bg-casino-gold text-black'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(post => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>

      </main>

      {/* Footer */}
      <BlogFooter />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function BlogCard({ post }: { post: { slug: string; title: string; excerpt: string; date: string; category: string; readTime: number } }) {
  const categoryColors: Record<string, string> = {
    'Estrategia': 'from-red-500/20 to-orange-500/20 border-red-500/30',
    'Guías': 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    'Noticias': 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    'General': 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  };

  const gradient = categoryColors[post.category] || 'from-gray-500/20 to-gray-600/20 border-gray-500/30';

  return (
    <a
      href={`/blog/${post.slug}`}
      className="group block bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:translate-y-1"
    >
      {/* Card Header Gradient */}
      <div className={`h-24 bg-gradient-to-br ${gradient} border-b border-white/5 flex items-end p-4`}>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 bg-black/30 px-2 py-1 rounded-lg">
          {post.category}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-5">
        <h3 className="text-base font-bold text-white group-hover:text-casino-gold transition-colors leading-snug mb-2">
          {post.title}
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-3">
          {post.excerpt}
        </p>
        <div className="flex items-center justify-between text-[10px] text-gray-600">
          <span>{new Date(post.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span>{post.readTime} min lectura</span>
        </div>
      </div>
    </a>
  );
}

function BlogFooter() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-black/20">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LogoK21 size={28} />
          <div>
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">KASINO21</p>
            <p className="text-[10px] text-gray-600">© 2026 · Todos los derechos reservados</p>
          </div>
        </div>
        <nav className="flex gap-6">
          <a href="/privacy" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Privacidad</a>
          <a href="/terms" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Términos</a>
          <a href="/cookies" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Cookies</a>
        </nav>
        <a
          href="/"
          className="text-xs bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
        >
          JUGAR AHORA
        </a>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Register route in App.tsx**

Add lazy import:
```tsx
const Blog = lazy(() => import('./components/Blog').then(m => ({ default: m.Blog })));
```

Add route after `/faq`:
```tsx
if (pathname === '/blog') return <Suspense fallback={<LoadingFallback />}><Blog /></Suspense>;
```

- [ ] **Step 3: Commit**

```bash
git add src/web/components/Blog.tsx src/web/App.tsx
git commit -m "feat: add Blog listing page with category filter"
```

---

### Task 15: Create Blog Post page

**Files:**
- Create: `src/web/components/BlogPost.tsx`
- Modify: `src/web/App.tsx`

- [ ] **Step 1: Create BlogPost.tsx**

```tsx
import React, { useLayoutEffect } from 'react';
import { LogoK21 } from './LogoK21';
import { updateSEO, resetSEO } from '../utils/seo';
import { getBlogPostBySlug, getRelatedPosts, blogPosts } from '../data/blog-posts';

export function BlogPost() {
  const slug = window.location.pathname.replace('/blog/', '');
  const post = getBlogPostBySlug(slug);
  const related = getRelatedPosts(slug, 3);

  useLayoutEffect(() => {
    if (post) {
      updateSEO({
        title: `${post.title} | Kasino21`,
        description: post.excerpt,
        canonical: `https://kasino21.com/blog/${post.slug}`,
      });
    }
    return () => resetSEO();
  }, [post]);

  if (!post) {
    return <BlogNotFound />;
  }

  return (
    <div className="h-screen overflow-y-auto bg-[#020617] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="opacity-90 group-hover:opacity-100 transition-opacity">
              <LogoK21 size={36} />
            </div>
            <span className="font-display font-black text-casino-gold tracking-wider text-lg">KASINO21</span>
          </a>
          <nav className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <a href="/blog" className="text-gray-500 hover:text-casino-gold transition-colors">Blog</a>
            <a href="/faq" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">FAQ</a>
            <a
              href="/"
              className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform"
            >
              JUGAR AHORA
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-blue-900/20 pointer-events-none" />
        <div className="max-w-3xl mx-auto px-6 py-12 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-lg">
              {post.category}
            </span>
            <span className="text-[10px] text-gray-600">
              {new Date(post.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-[10px] text-gray-600">· {post.readTime} min lectura</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-tight">
            {post.title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Article */}
          <article
            className="lg:col-span-2 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            {/* CTA Card */}
            <div className="bg-gradient-to-br from-yellow-900/20 to-amber-900/20 border border-yellow-500/20 rounded-2xl p-6 text-center mb-8">
              <p className="text-lg font-black text-casino-gold mb-2">¿Listo para jugar?</p>
              <p className="text-xs text-gray-400 mb-4">Pon en práctica lo que aprendiste</p>
              <a
                href="/"
                className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-6 py-3 rounded-xl font-black text-sm hover:scale-105 transition-transform"
              >
                JUGAR AHORA
              </a>
            </div>

            {/* Related Posts */}
            {related.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Artículos Relacionados</h3>
                <div className="space-y-3">
                  {related.map(r => (
                    <a
                      key={r.slug}
                      href={`/blog/${r.slug}`}
                      className="block bg-white/[0.02] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all group"
                    >
                      <p className="text-xs font-bold text-white group-hover:text-casino-gold transition-colors leading-snug">
                        {r.title}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1">{r.readTime} min lectura</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Footer */}
      <BlogPostFooter />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function BlogNotFound() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Artículo no encontrado | Kasino21',
      description: 'El artículo que buscas no existe o fue movido.',
      noindex: true,
    });
    return () => resetSEO();
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-[#020617] text-white flex items-center justify-center">
      <div className="text-center px-6">
        <p className="text-6xl font-black text-casino-gold mb-4">404</p>
        <h1 className="text-2xl font-black text-white mb-4">Artículo no encontrado</h1>
        <p className="text-gray-400 mb-8">El artículo que buscas no existe o fue movido.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/blog" className="text-sm text-casino-gold hover:underline font-bold">
            ← Volver al Blog
          </a>
          <a
            href="/"
            className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-6 py-3 rounded-xl font-black text-sm hover:scale-105 transition-transform"
          >
            JUGAR AHORA
          </a>
        </div>
      </div>
    </div>
  );
}

function BlogPostFooter() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-black/20">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LogoK21 size={28} />
          <div>
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">KASINO21</p>
            <p className="text-[10px] text-gray-600">© 2026 · Todos los derechos reservados</p>
          </div>
        </div>
        <nav className="flex gap-6">
          <a href="/privacy" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Privacidad</a>
          <a href="/terms" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Términos</a>
          <a href="/cookies" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Cookies</a>
        </nav>
        <a
          href="/"
          className="text-xs bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
        >
          JUGAR AHORA
        </a>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Register dynamic blog route in App.tsx**

Add lazy import:
```tsx
const BlogPost = lazy(() => import('./components/BlogPost').then(m => ({ default: m.BlogPost })));
```

Add route after `/blog` (important: must come AFTER the `/blog` exact match):
```tsx
if (pathname.startsWith('/blog/')) return <Suspense fallback={<LoadingFallback />}><BlogPost /></Suspense>;
```

- [ ] **Step 3: Commit**

```bash
git add src/web/components/BlogPost.tsx src/web/App.tsx
git commit -m "feat: add BlogPost page with dynamic routing and related posts sidebar"
```

---

### Task 16: Add static HTML generation for Phase 3 pages

**Files:**
- Modify: `scripts/generate-seo-pages.mjs`

- [ ] **Step 1: Add FAQ, Blog, and blog posts to generate-seo-pages.mjs**

Add these entries to the `PAGES` object:

```js
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
```

Then, after the existing generation loop, add a second loop for blog posts. Import the blog data at the top of the script:

```js
// Import blog posts for static generation
import { blogPosts } from '../src/web/data/blog-posts.ts';
```

Add after the existing loop (before the final console.log):

```js
// Generate static HTML for each blog post
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

  html = html.replace(
    /(<noscript[\s\S]*?<h1[^>]*>).*?(<\/h1>)/,
    `$1${post.title}$2`,
  );

  // Write to dist/blog/<slug>.html
  const blogDir = `${distDir}/blog`;
  if (!require('fs').existsSync(blogDir)) {
    require('fs').mkdirSync(blogDir, { recursive: true });
  }
  writeFileSync(`${blogDir}/${post.slug}.html`, html, 'utf-8');
  console.log(`✓ Generated ${blogDir}/${post.slug}.html`);
}
```

Note: Since this is an ESM module, use `import { mkdirSync, existsSync } from 'fs';` at the top instead of `require`.

- [ ] **Step 2: Commit**

```bash
git add scripts/generate-seo-pages.mjs
git commit -m "update: add FAQ, Blog and blog posts to static SEO page generation"
```

---

### Task 17: Create Social Proof section for landing page

**Files:**
- Create: `src/landing/sections/SocialProof.tsx`
- Modify: `src/landing/LandingPage.tsx` (or wherever the landing page assembles sections)

- [ ] **Step 1: Find the landing page assembly file**

First, locate where the landing page imports and assembles its sections:

```bash
grep -r "StatsBar\|Features\|Leaderboard\|Footer" src/landing/ --include="*.tsx" --include="*.ts" -l
```

This will show the file that imports all sections. Let's call it `LandingPage.tsx` (adjust the actual filename).

- [ ] **Step 2: Create SocialProof.tsx**

```tsx
import React from 'react';

export default function SocialProof() {
  return (
    <section className="py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black mb-3">
            Únete a la <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">Comunidad</span>
          </h2>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            Miles de jugadores ya compiten en Kasino21. Demuestra tu habilidad y sube en el ranking.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Jugadores Activos', value: '1,200+', icon: '👥' },
            { label: 'Partidas Jugadas', value: '15,000+', icon: '🃏' },
            { label: 'Torneos Completados', value: '50+', icon: '🏆' },
            { label: 'Modos de Juego', value: '3', icon: '🎮' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-center">
              <span className="text-2xl mb-2 block">{icon}</span>
              <p className="text-2xl font-black text-casino-gold">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Testimonial-style quotes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { quote: 'El mejor juego de cartas online en español. Adictivo y estratégico.', author: 'Jugador Ranked' },
            { quote: 'Los torneos semanales son lo mejor. Siempre hay algo nuevo.', author: 'Competidor Activo' },
            { quote: 'Perfecto para practicar y mejorar. El sistema ELO es muy justo.', author: 'Jugador Casual' },
          ].map(({ quote, author }) => (
            <div key={author} className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
              <p className="text-sm text-gray-300 italic leading-relaxed mb-3">"{quote}"</p>
              <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">— {author}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Import and place SocialProof in the landing page**

In the landing page assembly file, add the import:
```tsx
import SocialProof from './sections/SocialProof';
```

Place `<SocialProof />` between `<Features />` and `<Leaderboard />`.

- [ ] **Step 4: Commit**

```bash
git add src/landing/sections/SocialProof.tsx src/landing/LandingPage.tsx
git commit -m "feat: add SocialProof section to landing page with stats and testimonials"
```

---

### Task 18: Add CSS animation for cookie consent banner

**Files:**
- Modify: `src/web/index.css` (or wherever global CSS lives — check for `slide-up` animation)

- [ ] **Step 1: Check if slide-up animation exists**

Search for `slide-up` in the CSS files. If it doesn't exist, add it to the global CSS file.

- [ ] **Step 2: Add animation if missing**

Add to the global CSS file:

```css
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/web/index.css
git commit -m "add: slide-up animation for cookie consent banner"
```

---

### Task 19: Update noscript fallback in index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update noscript nav links**

Find the noscript nav section:
```html
<nav style="margin-top:2rem;display:flex;gap:1.5rem;">
  <a href="/privacy" style="color:#fbbf24;text-decoration:underline;">Privacidad</a>
  <a href="/terms" style="color:#fbbf24;text-decoration:underline;">Términos</a>
  <a href="/cookies" style="color:#fbbf24;text-decoration:underline;">Cookies</a>
</nav>
```

Replace with:
```html
<nav style="margin-top:2rem;display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;">
  <a href="/como-jugar" style="color:#fbbf24;text-decoration:underline;">Cómo Jugar</a>
  <a href="/blog" style="color:#fbbf24;text-decoration:underline;">Blog</a>
  <a href="/faq" style="color:#fbbf24;text-decoration:underline;">FAQ</a>
  <a href="/about" style="color:#fbbf24;text-decoration:underline;">Sobre Nosotros</a>
  <a href="/contact" style="color:#fbbf24;text-decoration:underline;">Contacto</a>
  <a href="/privacy" style="color:#fbbf24;text-decoration:underline;">Privacidad</a>
  <a href="/terms" style="color:#fbbf24;text-decoration:underline;">Términos</a>
  <a href="/cookies" style="color:#fbbf24;text-decoration:underline;">Cookies</a>
</nav>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "update: noscript fallback with all content page links"
```

---

### Task 20: Final verification — build and test

- [ ] **Step 1: Run production build**

```bash
npm run build:prod
```
Expected: Build succeeds. SEO pages generated. No errors.

- [ ] **Step 2: Verify ads.txt is in dist**

```bash
cat dist/ads.txt
```
Expected: `google.com, pub-7975398244257516, DIRECT, f08c47fec0942fa0`

- [ ] **Step 3: Verify generated SEO pages**

```bash
ls dist/*.html dist/blog/*.html 2>/dev/null
```
Expected: privacy.html, terms.html, cookies.html, como-jugar.html, about.html, contact.html, faq.html, blog.html, and blog post HTML files.

- [ ] **Step 4: Verify sitemap**

```bash
cat dist/sitemap.xml
```
Expected: All URLs including /about, /contact, /faq, /blog.

- [ ] **Step 5: Run tests**

```bash
npm test
```
Expected: All existing tests pass.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: final verification and cleanup for AdSense approval"
```

---

## Post-Implementation Checklist

After all tasks are complete, verify:

- [ ] CSP allows AdSense iframes (manual browser test)
- [ ] `https://kasino21.com/ads.txt` returns the correct content
- [ ] Cookie consent banner appears on first visit and persists
- [ ] All new routes accessible without auth: `/about`, `/contact`, `/faq`, `/blog`, `/blog/:slug`
- [ ] "Jugar Ahora" button visible on all content pages
- [ ] Landing page footer has links to all content and legal pages
- [ ] `npm run build:prod` succeeds
- [ ] Static HTML generated for all new pages
- [ ] Sitemap includes all URLs
- [ ] No console errors in browser dev tools
- [ ] Mobile responsive on all new pages

---

## AdSense Application Steps (After Implementation)

1. Deploy to production
2. Wait 24-48 hours for Google to crawl new content
3. Apply for AdSense at `https://www.google.com/adsense/start/`
4. Submit `kasino21.com` for review
5. Monitor email for approval/rejection
6. If rejected, review the reason and address accordingly
