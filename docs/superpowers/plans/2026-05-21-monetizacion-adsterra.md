# Monetización Adsterra — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar monetización de Google AdSense a Adsterra manteniendo la infraestructura de `AdManager.tsx` y agregando anuncios en la landing page.

**Architecture:** Abstracción del proveedor via `AdProvider` interface, refactoring del `AdManager.tsx` para delegar al provider, y nuevos componentes de landing (SocialBar, AdBanner) para visitantes no autenticados.

**Tech Stack:** TypeScript, React 19, Tailwind CSS, Adsterra API, GA4

**Nota:** Necesitarás una cuenta de Adsterra (crear en https://adsterra.com). Los `YOUR_ADSTERRA_ZONE_ID` en este plan se reemplazan con los zone IDs reales de tu dashboard.

---

## File Structure

### Archivos nuevos (4)

| Archivo | Responsabilidad |
|---------|----------------|
| `src/web/services/adProviders.ts` | Define `AdProvider` interface + implementación `AdsterraProvider` que carga scripts y maneja cada formato de anuncio |
| `src/landing/components/SocialBar.tsx` | Componente de barra flotante en bottom del viewport (solo desktop y no autenticados) |
| `src/landing/components/AdBanner.tsx` | Componente de native banner 300x250 embebido entre secciones |
| `src/web/services/analytics.ts` | Helpers para eventos GA4 (`trackAdEvent`, `trackPageView`) |

### Archivos modificados (10)

| Archivo | Cambio |
|---------|--------|
| `src/web/components/AdManager.tsx` | Desacoplar AdSense, delegar llamadas a `AdsterraProvider` |
| `index.html` | Quitar script AdSense, activar GA4, activar Site Verification |
| `vite.config.mts` | CSP: dominios AdSense → dominios Adsterra |
| `public/ads.txt` | Google → Adsterra |
| `src/landing/Landing.tsx` | Agregar `<SocialBar />` y `<AdBanner />` |
| `src/web/components/legal/CookiePolicy.tsx` | AdSense → Adsterra cookies |
| `src/web/components/legal/PrivacyPolicy.tsx` | AdSense → Adsterra procesador de datos |
| `src/web/components/legal/TermsOfService.tsx` | AdSense → Adsterra mención publicitaria |
| `src/web/components/CookieConsent.tsx` | Agregar export `hasAdConsent()` para que el provider verifique antes de cargar scripts |

### Archivos sin cambios (consumidores existentes de AdManager)

- `src/web/components/game/MatchCompletedScreen.tsx`
- `src/web/components/game/MatchAbandonedScreen.tsx`
- `src/web/components/MatchPointHUD.tsx`
- `src/web/components/Store.tsx`
- `src/web/components/MainMenu.tsx`

---

## Tasks

### Task 1: Crear `adProviders.ts` — Interfaz + Provider de Adsterra

**Files:**
- Create: `src/web/services/adProviders.ts`

- [ ] **Step 1: Definir la interfaz `AdProvider` y tipo `AdConsent`**

```typescript
export type AdConsent = 'accepted' | 'rejected' | 'unknown';

export interface AdProvider {
  init(consent: AdConsent): void;
  showInterstitial(container: HTMLElement): Promise<void>;
  showRewarded(container: HTMLElement): Promise<void>;
  loadSocialBar(): void;
  loadBanner(container: HTMLElement, format: 'banner' | 'native'): void;
}
```

- [ ] **Step 2: Implementar clase `AdsterraProvider` con init() condicional**

```typescript
export class AdsterraProvider implements AdProvider {
  private initialized = false;
  private consent: AdConsent = 'unknown';

  init(consent: AdConsent): void {
    if (this.initialized) return;
    this.consent = consent;

    if (consent !== 'accepted') return; // No cargar scripts sin consentimiento

    const script = document.createElement('script');
    script.src = `https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_ADSTERRA_ZONE_ID&cb=${Date.now()}`;
    script.async = true;
    document.head.appendChild(script);

    this.initialized = true;
  }

  async showInterstitial(container: HTMLElement): Promise<void> {
    // Adsterra Direct Link: crear iframe o contenedor con código de Adsterra
    container.innerHTML = `
      <script type="text/javascript">
        new Image().src = 'https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_INTERSTITIAL_ZONE_ID&cb=' + Date.now();
      </script>
      <div id="adsterra-interstitial">
        <!-- Adsterra inyecta aquí -->
      </div>
    `;
    return Promise.resolve();
  }

  async showRewarded(container: HTMLElement): Promise<void> {
    // Adsterra Rewarded Video (VAST): cargar player de video
    container.innerHTML = `
      <div id="adsterra-rewarded">
        <script type="text/javascript" src="https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_REWARDED_ZONE_ID"></script>
      </div>
    `;
    return Promise.resolve();
  }

  loadSocialBar(): void {
    // Adsterra Social Bar: script autónomo
    const script = document.createElement('script');
    script.src = `https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_SOCIAL_BAR_ZONE_ID`;
    script.async = true;
    document.body.appendChild(script);
  }

  loadBanner(container: HTMLElement, format: 'banner' | 'native'): void {
    const zoneId = format === 'banner'
      ? 'YOUR_BANNER_ZONE_ID'
      : 'YOUR_NATIVE_ZONE_ID';
    container.innerHTML = `
      <script type="text/javascript" src="https://adsterra.com/www/delivery/asyncjs.php?zoneid=${zoneId}"></script>
    `;
  }
}
```

- [ ] **Step 3: Exportar singleton `adsterraProvider`**

```typescript
export const adsterraProvider: AdProvider = new AdsterraProvider();
```

- [ ] **Step 4: Commit**

```bash
git add src/web/services/adProviders.ts
git commit -m "feat: add AdProvider interface and AdsterraProvider implementation"
```

---

### Task 2: Refactorizar `AdManager.tsx` para usar el provider

**Files:**
- Modify: `src/web/components/AdManager.tsx`
- Modify: `src/web/components/AdManager.tsx` (remove AdSense-specific code)

- [ ] **Step 1: Reemplazar constantes y estado al inicio del archivo**

Cambiar:

```typescript
const ADSENSE_CLIENT = 'ca-pub-7975398244257516';
const SLOT_PLACEHOLDER = '8983998797';
```

Eliminar estas líneas (ya no se usan).

- [ ] **Step 2: Reemplazar import y pushAdSense()**

Eliminar:

```typescript
function pushAdSense(): void {
  try {
    (window as any).adsbygoogle = (window as any).adsbygoogle || [];
    (window as any).adsbygoogle.push({});
  } catch {
    /* ad blocker or script not loaded */
  }
}
```

Agregar import al provider:

```typescript
import { adsterraProvider, AdConsent } from '../services/adProviders';
import { getCookieConsent } from './CookieConsent';
```

- [ ] **Step 3: Actualizar `initializeAds()`**

```typescript
export const initializeAds = (): void => {
  if (!state.isLoaded) {
    const consentData = getCookieConsent();
    const consent: AdConsent = !consentData ? 'unknown'
      : consentData.accepted ? 'accepted' : 'rejected';
    adsterraProvider.init(consent);
    state.isLoaded = true;
  }
};
```

- [ ] **Step 4: Actualizar `showInterstitialAd()` — remover AdSense, llamar al provider**

```typescript
export const showInterstitialAd = (): void => {
  if (!state.isLoaded || state.isAdBlocked || !cooldownOk()) return;

  createModal(
    {
      renderAd: (container) => adsterraProvider.showInterstitial(container),
      minWaitMs: INTERSTITIAL_WAIT_MS,
      title: 'KASINO21',
      subtitle: 'Gracias por apoyar el juego',
      waitMsg: 'La publicidad nos ayuda a mantener el juego gratis...',
      closeLabel: 'Continuar',
    },
    () => { /* no additional callback */ }
  );
};
```

- [ ] **Step 5: Actualizar `showRewardedAd()` — llamar al provider en vez de usar ins**

```typescript
export const showRewardedAd = (
  onReward: (amount: number) => void,
  rewardAmount: number = 500
): void => {
  if (!state.isLoaded || state.isAdBlocked || !cooldownOk()) {
    onReward(rewardAmount);
    return;
  }

  createModal(
    {
      renderAd: (container) => adsterraProvider.showRewarded(container),
      minWaitMs: REWARD_WAIT_MS,
      title: 'Mensaje Patrocinado',
      subtitle: `Mira el anuncio para ganar ${rewardAmount} monedas`,
      waitMsg: 'Recompensa disponible en',
      closeLabel: `Reclamar +${rewardAmount} monedas`,
      showCountdown: true,
    },
    () => onReward(rewardAmount)
  );
};
```

- [ ] **Step 6: Actualizar `showGateAdForBots()` — mismo patrón**

```typescript
export const showGateAdForBots = (onClose: () => void): void => {
  const remaining = parseInt(
    sessionStorage.getItem(BOT_STORAGE_KEY) || '0', 10
  );

  if (remaining > 0) {
    sessionStorage.setItem(BOT_STORAGE_KEY, String(remaining - 1));
    onClose();
    return;
  }

  if (!state.isLoaded || state.isAdBlocked || !cooldownOk()) {
    onClose();
    return;
  }

  createModal(
    {
      renderAd: (container) => adsterraProvider.showInterstitial(container),
      minWaitMs: INTERSTITIAL_WAIT_MS,
      title: 'Jugar contra el Bot',
      subtitle: `Mira el anuncio para desbloquear ${BOT_GAMES} partidas`,
      waitMsg: 'Desbloqueando partidas contra bots...',
      closeLabel: 'Jugar vs Bot',
    },
    () => {
      sessionStorage.setItem(BOT_STORAGE_KEY, String(BOT_GAMES - 1));
      onClose();
    }
  );
};
```

- [ ] **Step 7: Actualizar `AdModal` para aceptar `renderAd` en vez de slotId**

Cambiar la interfaz `AdModalProps`:

```typescript
interface AdModalProps {
  onClose: () => void;
  renderAd: (container: HTMLDivElement) => Promise<void>;
  minWaitMs: number;
  title?: string;
  subtitle?: string;
  waitMsg: string;
  closeLabel: string;
  showCountdown?: boolean;
}
```

Cambiar el body del modal para usar el contenedor dinámico:

```typescript
useEffect(() => {
  let detectTimer: ReturnType<typeof setTimeout>;
  let mounted = true;

  const initTimer = setTimeout(async () => {
    if (adRef.current && mounted) {
      await renderAd(adRef.current);
    }
    detectTimer = setTimeout(() => {
      if (adRef.current && adRef.current.offsetHeight === 0 && mounted) {
        setBlocked(true);
        state.isAdBlocked = true;
      }
    }, 1500);
  }, 50);

  const closeTimer = setTimeout(() => { if (mounted) setCanClose(true); }, minWaitMs);

  return () => {
    clearTimeout(initTimer);
    clearTimeout(detectTimer);
    clearTimeout(closeTimer);
    mounted = false;
  };
}, [minWaitMs, renderAd]);
```

Y el renderizado del contenido:

```tsx
{blocked ? (
  <div className="text-center py-6">
    <p className="text-gray-300 font-semibold text-sm">
      Parece que tienes un bloqueador de anuncios.
    </p>
    <p className="text-gray-500 text-xs mt-1">
      Desactívalo para apoyar el juego.
    </p>
  </div>
) : (
  <div ref={adRef} className="w-full flex justify-center min-h-[200px]" />
)}
```

- [ ] **Step 8: Actualizar `createModal()` para pasar `renderAd`**

```typescript
function createModal(
  modalProps: Omit<AdModalProps, 'onClose'>,
  onDone: () => void
): void {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const handleClose = () => {
    root.unmount();
    container.remove();
    markShown();
    onDone();
  };
  root.render(<AdModal {...modalProps} onClose={handleClose} />);
}
```

- [ ] **Step 9: Commit**

```bash
git add src/web/components/AdManager.tsx
git commit -m "refactor: replace AdSense with Adsterra in AdManager"
```

---

### Task 3: Actualizar `index.html` — scripts y tracking

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Remover script de AdSense**

Eliminar:

```html
<!-- Google AdSense Auto Ads -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7975398244257516" crossorigin="anonymous"></script>
```

- [ ] **Step 2: Activar Google Analytics**

Reemplazar el placeholder comentado con el código activo:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

> Reemplazar `G-XXXXXXXXXX` con el Measurement ID real de GA4.

- [ ] **Step 3: Activar Google Search Console**

Reemplazar el placeholder:

```html
<meta name="google-site-verification" content="YOUR_VERIFICATION_TOKEN" />
```

> Reemplazar `YOUR_VERIFICATION_TOKEN` con el token de Google Search Console.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "chore: remove AdSense, enable GA4 and Search Console"
```

---

### Task 4: Actualizar CSP en `vite.config.mts`

**Files:**
- Modify: `vite.config.mts`

- [ ] **Step 1: Reemplazar dominios AdSense en `connect-src`**

Cambiar:

```
https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adservice.google.com https://www.google-analytics.com https://analytics.google.com
```

Por:

```
https://www.google-analytics.com https://analytics.google.com https://adsterra.com https://www.assoc-amazon.com
```

- [ ] **Step 2: Reemplazar dominios AdSense en `frame-src`**

Cambiar:

```
"frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://adservice.google.com"
```

Por:

```
"frame-src https://adsterra.com"
```

- [ ] **Step 3: Commit**

```bash
git add vite.config.mts
git commit -m "chore: update CSP for Adsterra domains"
```

---

### Task 5: Actualizar `ads.txt`

**Files:**
- Modify: `public/ads.txt`

- [ ] **Step 1: Reemplazar contenido**

Cambiar de:

```
google.com, pub-7975398244257516, DIRECT, f08c47fec0942fa0
```

A:

```
adsterra.com, YOUR_PUBLISHER_ID, DIRECT
```

> Reemplazar `YOUR_PUBLISHER_ID` con el ID que proporciona Adsterra en su dashboard.

- [ ] **Step 2: Commit**

```bash
git add public/ads.txt
git commit -m "chore: update ads.txt for Adsterra"
```

---

### Task 6: Crear `SocialBar.tsx`

**Files:**
- Create: `src/landing/components/SocialBar.tsx`

- [ ] **Step 1: Escribir componente SocialBar**

```typescript
import React, { useEffect, useRef } from 'react';
import { getCookieConsent } from '../../web/components/CookieConsent';

export default function SocialBar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const consent = getCookieConsent();

  useEffect(() => {
    if (!consent?.accepted) return;
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = `https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_SOCIAL_BAR_ZONE_ID`;
    script.async = true;
    script.dataset.cfasync = 'false';
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [consent?.accepted]);

  // Solo visible en desktop
  return (
    <div
      ref={containerRef}
      className="hidden md:block fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/landing/components/SocialBar.tsx
git commit -m "feat: add SocialBar component for Adsterra"
```

---

### Task 7: Crear `AdBanner.tsx`

**Files:**
- Create: `src/landing/components/AdBanner.tsx`

- [ ] **Step 1: Escribir componente AdBanner**

```typescript
import React, { useEffect, useRef } from 'react';
import { getCookieConsent } from '../../web/components/CookieConsent';

interface AdBannerProps {
  zoneId?: string;
}

export default function AdBanner({ zoneId = 'YOUR_NATIVE_ZONE_ID' }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const consent = getCookieConsent();

  useEffect(() => {
    if (!consent?.accepted) return;
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = `https://adsterra.com/www/delivery/asyncjs.php?zoneid=${zoneId}`;
    script.async = true;
    script.dataset.cfasync = 'false';
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [zoneId, consent?.accepted]);

  return (
    <div className="flex justify-center my-8">
      <div
        ref={containerRef}
        className="w-full max-w-[300px] min-h-[250px] bg-white/[0.02] rounded-xl border border-white/[0.06] flex items-center justify-center"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/landing/components/AdBanner.tsx
git commit -m "feat: add AdBanner component for native banner"
```

---

### Task 8: Crear `useLandingAds.ts` hook

**Files:**
- Create: `src/landing/hooks/useLandingAds.ts`

- [ ] **Step 1: Escribir hook que inicializa ads en landing**

```typescript
import { useEffect } from 'react';
import { getCookieConsent } from '../../web/components/CookieConsent';

/**
 * Inicializa scripts de Adsterra en la landing solo si:
 * - El usuario no está autenticado (se pasa como flag desde el componente)
 * - El usuario aceptó cookies publicitarias
 */
export function useLandingAds(isAuthenticated: boolean): void {
  useEffect(() => {
    if (isAuthenticated) return;

    const consent = getCookieConsent();
    if (!consent?.accepted) return;

    // El script de carga dinámica se maneja desde SocialBar y AdBanner
    // Este hook inicializa el provider base si es necesario
    const init = async () => {
      const { initializeAds } = await import('../../web/components/AdManager');
      initializeAds();
    };
    init();
  }, [isAuthenticated]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/landing/hooks/useLandingAds.ts
git commit -m "feat: add useLandingAds hook"
```

---

### Task 9: Integrar SocialBar y AdBanner en `Landing.tsx`

**Files:**
- Modify: `src/landing/Landing.tsx`

- [ ] **Step 1: Agregar imports**

```typescript
import SocialBar from './components/SocialBar';
import AdBanner from './components/AdBanner';
```

- [ ] **Step 2: Agregar SocialBar y AdBanner en el layout**

```typescript
export default function Landing() {
  return (
    <div className="h-full bg-[#0a0f1e] text-white overflow-x-hidden overflow-y-auto">
      <div className="crt-overlay" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <Navbar />
      <SocialBar />

      <main className="pt-0">
        <ScrollVideo />
        <AdBanner />
        <CompetitiveHub />
        <AdBanner zoneId="YOUR_NATIVE_ZONE_ID_2" />
        <ContentCarousel />
      </main>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/landing/Landing.tsx
git commit -m "feat: integrate SocialBar and AdBanner into landing page"
```

---

### Task 10: Crear `analytics.ts` — helpers GA4

**Files:**
- Create: `src/web/services/analytics.ts`

- [ ] **Step 1: Escribir helpers de tracking**

```typescript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

type AdEventName =
  | 'ad_interstitial_shown'
  | 'ad_rewarded_shown'
  | 'ad_rewarded_claimed'
  | 'ad_gate_shown'
  | 'ad_blocker_detected'
  | 'ad_social_bar_impression';

export function trackAdEvent(
  eventName: AdEventName,
  estimatedValue?: number
): void {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        value: estimatedValue,
        currency: 'USD',
        send_to: 'G-XXXXXXXXXX',
      });
    }
  } catch {
    // GA4 no disponible
  }
}

export function trackPageView(path: string): void {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: path,
        send_to: 'G-XXXXXXXXXX',
      });
    }
  } catch {
    // GA4 no disponible
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/web/services/analytics.ts
git commit -m "feat: add GA4 event tracking helpers"
```

---

### Task 11: Instrumentar eventos GA4 en AdManager y landing

**Files:**
- Modify: `src/web/components/AdManager.tsx`
- Modify: `src/landing/components/SocialBar.tsx`

- [ ] **Step 1: Importar y llamar `trackAdEvent` en cada función de AdManager**

En `AdManager.tsx`, agregar:

```typescript
import { trackAdEvent } from '../services/analytics';
```

En `showInterstitialAd()`, antes de `createModal`:

```typescript
trackAdEvent('ad_interstitial_shown', 0.01);
```

En `showRewardedAd()`, antes de `createModal`:

```typescript
trackAdEvent('ad_rewarded_shown', 0.02);
```

En `showRewardedAd()`, dentro del callback `onDone`:

```typescript
() => {
  trackAdEvent('ad_rewarded_claimed', 0.03);
  onReward(rewardAmount);
}
```

En `showGateAdForBots()`, antes de `createModal`:

```typescript
trackAdEvent('ad_gate_shown', 0.01);
```

En la detección de ad blocker (dentro de `AdModal`):

```typescript
if (adRef.current && adRef.current.offsetHeight === 0 && mounted) {
  setBlocked(true);
  state.isAdBlocked = true;
  trackAdEvent('ad_blocker_detected');
}
```

- [ ] **Step 2: Importar y llamar `trackAdEvent` en SocialBar**

En `SocialBar.tsx`, agregar:

```typescript
import { trackAdEvent } from '../../web/services/analytics';
```

En el `useEffect` del script, después de cargar:

```typescript
const timeout = setTimeout(() => {
  trackAdEvent('ad_social_bar_impression', 0.001);
}, 2000);
return () => clearTimeout(timeout);
```

- [ ] **Step 3: Commit**

```bash
git add src/web/components/AdManager.tsx src/landing/components/SocialBar.tsx
git commit -m "feat: instrument GA4 events for ad impressions and interactions"
```

---

### Task 12: Actualizar páginas legales

**Files:**
- Modify: `src/web/components/legal/CookiePolicy.tsx`
- Modify: `src/web/components/legal/PrivacyPolicy.tsx`
- Modify: `src/web/components/legal/TermsOfService.tsx`

- [ ] **Step 1: Actualizar `CookiePolicy.tsx`**

Reemplazar referencias a AdSense por Adsterra. Sección de cookies publicitarias:

**Antes:**
```tsx
{
  name: '__gads / __gpi',
  provider: 'Google AdSense',
  purpose: 'Registra impresiones de anuncios y evita la duplicación',
  duration: '13 meses',
}
```

**Después:**
```tsx
{
  name: 'adsterra_uid / ast_session',
  provider: 'Adsterra',
  purpose: 'Control de frecuencia de anuncios y segmentación básica',
  duration: '30 días',
}
```

Agregar enlace de opt-out:

```tsx
<p className="text-gray-400 text-sm mt-2">
  Puedes optar por no recibir publicidad personalizada visitando{' '}
  <a
    href="https://adsterra.com/privacy-policy/"
    target="_blank"
    rel="noopener noreferrer"
    className="text-yellow-400 hover:underline"
  >
    la política de privacidad de Adsterra
  </a>.
</p>
```

- [ ] **Step 2: Actualizar `PrivacyPolicy.tsx`**

Reemplazar todas las menciones de "Google AdSense" por "Adsterra" (red publicitaria). Cambiar el texto del procesador de datos publicitarios:

**Antes (aproximado):**
```
Google AdSense puede recopilar datos mediante cookies...
```

**Después:**
```
Adsterra puede recopilar datos mediante cookies y tecnologías similares...
```

- [ ] **Step 3: Actualizar `TermsOfService.tsx`**

Cambiar:

```tsx
Para mantener KASINO21 gratuito, mostramos anuncios proporcionados por <strong className="text-white">Google AdSense</strong>.
```

Por:

```tsx
Para mantener KASINO21 gratuito, mostramos anuncios proporcionados por <strong className="text-white">Adsterra</strong>.
```

- [ ] **Step 4: Commit**

```bash
git add src/web/components/legal/CookiePolicy.tsx src/web/components/legal/PrivacyPolicy.tsx src/web/components/legal/TermsOfService.tsx
git commit -m "docs: update legal pages from AdSense to Adsterra"
```

---

### Task 13: Verificar CookieConsent y exportar helper de consentimiento

**Files:**
- Modify: `src/web/components/CookieConsent.tsx`

- [ ] **Step 1: Agregar export `hasAdConsent()`**

```typescript
export function hasAdConsent(): boolean {
  const consent = getCookieConsent();
  return consent?.accepted === true;
}
```

- [ ] **Step 2: Verificar que `getCookieConsent()` ya está importado donde se necesita**

El `AdsterraProvider.init()` ya usa `getCookieConsent()` via `initializeAds()`. Confirmar que:

1. `getCookieConsent()` está exportado (sí, ya está en `CookieConsent.tsx:10`)
2. `AdManager.tsx` ya lo importa (se agregó en Task 2)
3. Los componentes de landing lo importan (sí, en SocialBar y AdBanner)

No se necesitan más cambios — el patrón de consentimiento ya funciona correctamente.

- [ ] **Step 3: Commit**

```bash
git add src/web/components/CookieConsent.tsx
git commit -m "feat: add hasAdConsent helper for GDPR compliance"
```

---

## Spec Coverage Check

| Spec requirement | Task que lo implementa |
|-----------------|----------------------|
| Provider interface `AdProvider` | Task 1 |
| `AdsterraProvider` implementation | Task 1 |
| AdManager refactoring (desacoplar AdSense) | Task 2 |
| `AdModal` genérico con `renderAd` | Task 2 |
| Remover script AdSense de index.html | Task 3 |
| Activar GA4 | Task 3 |
| Activar Site Verification | Task 3 |
| CSP AdSense → Adsterra | Task 4 |
| ads.txt Google → Adsterra | Task 5 |
| SocialBar landing component | Task 6 |
| AdBanner landing component | Task 7 |
| useLandingAds hook | Task 8 |
| Integrar SocialBar/AdBanner en Landing | Task 9 |
| analytics.ts helpers GA4 | Task 10 |
| Eventos GA4 en AdManager | Task 11 |
| Eventos GA4 en SocialBar | Task 11 |
| CookiePolicy AdSense → Adsterra | Task 12 |
| PrivacyPolicy AdSense → Adsterra | Task 12 |
| TermsOfService AdSense → Adsterra | Task 12 |
| CookieConsent helper export | Task 13 |

---

## Type Consistency

- `AdProvider` interface define `init(consent: AdConsent)`, `showInterstitial(container: HTMLElement)`, `showRewarded(container: HTMLElement)`, `loadSocialBar()`, `loadBanner(container, format)` — usado consistentemente en Tasks 1-2
- `AdModalProps.renderAd` es `(container: HTMLDivElement) => Promise<void>` — definido en Task 2, usado consistentemente en todos los consumers
- `AdConsent` es `'accepted' | 'rejected' | 'unknown'` — definido en Task 1, usado en Task 2
- `hasAdConsent()` retorna `boolean` — definido en Task 13
- `trackAdEvent(eventName: AdEventName, estimatedValue?: number)` — definido en Task 10, usado en Task 11
