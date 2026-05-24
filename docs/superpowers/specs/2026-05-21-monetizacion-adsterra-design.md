# Monetización con Adsterra — Design Spec

**Date:** 2026-05-21
**Status:** Approved
**Domain:** kasino21.com
**Supersedes:** `2026-05-19-adsense-approval-design.md`

---

## Goal

Migrar la monetización publicitaria de Google AdSense a Adsterra, manteniendo la infraestructura existente del `AdManager.tsx` y preservando la experiencia de usuario con anuncios no intrusivos (opt-in rewarded ads, interstitials en pausas naturales, social bar en landing).

---

## Context

El proyecto ya cuenta con una implementación completa de anuncios (`AdManager.tsx`) basada en AdSense: modales con `<ins>` elements, `adsbygoogle.push()` para cargar anuncios, cooldown de 60s, detección de ad blockers, y 5 consumidores (`MatchCompletedScreen`, `MatchAbandonedScreen`, `MatchPointHUD`, `Store`, `MainMenu`).

Google prohíbe contenido relacionado con casinos bajo sus políticas de AdSense (el nombre "KASINO21" y la mecánica del "21" activan filtros automáticos). Adsterra acepta contenido de simulación de casino.

El spec anterior (`2026-05-19-adsense-approval-design.md`) asumía AdSense como red publicitaria y queda reemplazado.

---

## Architecture

### 1. Advertiser Provider (abstracción del provider de anuncios)

**Archivo nuevo:** `src/web/services/adProviders.ts`

Interfaz que desacopla la lógica de UI del proveedor de anuncios:

```typescript
interface AdProvider {
  init(): void;
  showInterstitial(container: HTMLElement): Promise<void>;
  showRewarded(container: HTMLElement): Promise<void>;
  loadSocialBar(): void;
  loadBanner(container: HTMLElement, format: 'banner' | 'native'): void;
  onRewardClaimed?(cb: () => void): void;
}
```

`AdsterraProvider` implementa esta interfaz cargando los scripts de Adsterra dinámicamente y gestionando la interacción con su API.

### 2. Formatos de anuncios y ubicación

| Formato | Ubicación | Prioridad | Impacto UX |
|---------|-----------|-----------|------------|
| **Rewarded Video** (VAST) | Tienda — botón "Ver anuncio por monedas" (`Store.tsx`) | Alta | Opt-in (el usuario decide) |
| **Interstitial** | Post-partida (`MatchCompletedScreen`), match abandonment (`MatchAbandonedScreen`), match point (`MatchPointHUD`) | Alta | En pausa natural, justo antes de volver al menú |
| **Social Bar** | Landing page (visitantes no autenticados, solo desktop) | Media | Banner pequeño no intrusivo |
| **Native Banner** | Landing page — entre secciones CompetitiveHub y ContentCarousel | Baja | Discreto, embebido en el scroll |

**No se usan:** Pop-unders, auto-play video con sonido, redirect ads.

**Frecuencia:** Cooldown global de 60s entre anuncios (ya implementado en `AdManager.tsx`). Interstitials máximo 1 cada 3 partidas. Rewarded sin límite (opt-in). Social bar sin límite (no disruptivo).

**Recompensas:** 500 monedas por rewarded ad (`Store.tsx:384`), 10 partidas vs bot por gate ad (`AdManager.tsx:37`).

### 3. AdManager Refactoring

**Archivo:** `src/web/components/AdManager.tsx` (modificado)

**Conservar:**
- Estado global (`isLoaded`, `lastAdAt`, `isAdBlocked`)
- Cooldown de 60s (`cooldownOk()`, `markShown()`)
- Modal overlay (componente `AdModal` con countdown progresivo)
- `createModal()` helper imperativo (createRoot)
- API pública: `initializeAds()`, `showInterstitialAd()`, `showRewardedAd()`, `showGateAdForBots()`

**Reemplazar:**
- `pushAdSense()` → llamada a `provider.showInterstitial()` / `provider.showRewarded()`
- Referencias a AdSense (`ADSENSE_CLIENT`, `SLOT_PLACEHOLDER`) → configuración de Adsterra
- Renderizado de `<ins>` elements → contenedor genérico manejado por el provider
- Carga del script AdSense → carga dinámica de script Adsterra

**Consumidores (sin cambios):**
- `src/web/components/game/MatchCompletedScreen.tsx` — `showInterstitialAd()`
- `src/web/components/game/MatchAbandonedScreen.tsx` — `showInterstitialAd()`
- `src/web/components/MatchPointHUD.tsx` — `showInterstitialAd()`
- `src/web/components/Store.tsx` — `showRewardedAd()`
- `src/web/components/MainMenu.tsx` — `showGateAdForBots()`

### 4. Landing Page Ads

**Archivos nuevos:**

| Archivo | Rol |
|---------|-----|
| `src/landing/components/SocialBar.tsx` | Barra flotante no intrusiva en bottom del viewport, solo desktop. Cargada condicionalmente para usuarios no autenticados |
| `src/landing/components/AdBanner.tsx` | Native banner 300×250 entre secciones CompetitiveHub y ContentCarousel |
| `src/landing/hooks/useLandingAds.ts` (o `hooks/useLandingAds.ts`) | Hook que inicializa SocialBar y banners al montar la landing |

**Reglas de UX:**
- Cero anuncios para usuarios autenticados en la landing
- Social Bar solo en desktop (hidden en mobile)
- Z-index < navbar y modales del juego
- El consentimiento de cookies se verifica antes de cargar scripts

### 5. Analytics

**Archivo nuevo:** `src/web/services/analytics.ts`

Google Analytics 4 activado (placeholder en `index.html:118-127`) con eventos de tracking publicitario:

| Evento | Trigger | Estimated eCPM |
|--------|---------|-----------------|
| `ad_interstitial_shown` | Modal interstitial se abre | $0.01 |
| `ad_rewarded_shown` | Modal rewarded se abre | $0.02 |
| `ad_rewarded_claimed` | Usuario reclama recompensa | $0.03 |
| `ad_gate_shown` | Gate ad para bots se abre | $0.01 |
| `ad_blocker_detected` | Ad blocker detectado en el modal | — |
| `ad_social_bar_impression` | Social bar visible > 2s | $0.001 |

Los eventos se disparan desde `AdManager.tsx` y `useLandingAds.ts`.

### 6. Compliance y Actualizaciones Legales

| Archivo | Cambio |
|---------|--------|
| `src/web/components/legal/CookiePolicy.tsx` | Reemplazar cookies de AdSense por Adsterra (`adsterra_uid`, `ast_session`, `ast_viewed`). Agregar URL de opt-out: `https://adsterra.com/privacy-policy/` |
| `src/web/components/legal/PrivacyPolicy.tsx` | Reemplazar referencias a Google AdSense por Adsterra como procesador de datos publicitarios |
| `src/web/components/legal/TermsOfService.tsx` | Cambiar "mostramos anuncios proporcionados por Google AdSense" → "Adsterra" |
| `src/web/components/CookieConsent.tsx` | Verificar que la carga de scripts de Adsterra es condicional al consentimiento GDPR |

### 7. Cambios en index.html

| Elemento | Acción |
|----------|--------|
| Script AdSense (`pagead2.googlesyndication.com`) | **Remover** |
| Script GA4 (comentado) | **Activar** (reemplazar `G-XXXXXXXXXX`) |
| Meta tag Site Verification | **Activar** (reemplazar `YOUR_TOKEN_HERE`) |
| CSP en `vite.config.mts` | Reemplazar dominios AdSense por Adsterra |
| `ads.txt` | Eliminar entrada Google, agregar entrada Adsterra |

---

## File Inventory

**Archivos nuevos (4):**

| Archivo | Rol |
|---------|-----|
| `src/web/services/adProviders.ts` | Interfaz `AdProvider` + implementación `AdsterraProvider` |
| `src/landing/components/SocialBar.tsx` | Social bar flotante para visitantes no logueados |
| `src/landing/components/AdBanner.tsx` | Native banner entre secciones de landing |
| `src/web/services/analytics.ts` | Helpers de tracking GA4 |

**Archivos modificados (10):**

| Archivo | Cambio |
|---------|--------|
| `src/web/components/AdManager.tsx` | Desacoplar AdSense, delegar a AdProvider |
| `index.html` | AdSense → Adsterra; activar GA4; activar Site Verification |
| `vite.config.mts` | CSP: AdSense → Adsterra |
| `public/ads.txt` | Google → Adsterra |
| `src/landing/Landing.tsx` | Agregar SocialBar y AdBanner |
| `src/landing/hooks/useLandingAds.ts` | Hook inicializador de ads en landing |
| `src/web/components/legal/CookiePolicy.tsx` | AdSense → Adsterra |
| `src/web/components/legal/PrivacyPolicy.tsx` | AdSense → Adsterra |
| `src/web/components/legal/TermsOfService.tsx` | AdSense → Adsterra |
| `src/web/components/CookieConsent.tsx` | Verificar carga condicional |

**Archivos sin cambios (consumidores):**
- `src/web/components/game/MatchCompletedScreen.tsx`
- `src/web/components/game/MatchAbandonedScreen.tsx`
- `src/web/components/MatchPointHUD.tsx`
- `src/web/components/Store.tsx`
- `src/web/components/MainMenu.tsx`

---

## Implementation Phases

### Fase 1 — Provider + Refactoring (prioridad máxima)

1. Crear `src/web/services/adProviders.ts` con interfaz `AdProvider` y clase `AdsterraProvider`
2. Refactorizar `src/web/components/AdManager.tsx` para usar el provider
3. Actualizar `index.html` (quitar AdSense, activar GA4, activar Site Verification)
4. Actualizar `vite.config.mts` (CSP: AdSense → Adsterra)
5. Actualizar `public/ads.txt`

### Fase 2 — Landing Page (prioridad media)

6. Crear `src/landing/components/SocialBar.tsx`
7. Crear `src/landing/components/AdBanner.tsx`
8. Crear `src/landing/hooks/useLandingAds.ts`
9. Integrar en `src/landing/Landing.tsx`

### Fase 3 — Analytics y Compliance (prioridad baja, bloquea release)

10. Crear `src/web/services/analytics.ts`
11. Instrumentar eventos GA4 en `AdManager.tsx` y `useLandingAds.ts`
12. Actualizar `CookiePolicy.tsx`, `PrivacyPolicy.tsx`, `TermsOfService.tsx`
13. Verificar `CookieConsent.tsx` para carga condicional de scripts

---

## Risks & Mitigations

| Riesgo | Mitigación |
|--------|------------|
| Adsterra CPM menor al esperado | Trackear desde el día 1 con GA4 para medir revenue real; ajustar frecuencia si necesario. Prueba A/B entre formatos |
| Scripts de Adsterra más lentos | Carga dinámica con lazy import; no bloquea render inicial |
| Ad blocker más agresivo contra Adsterra | Ya hay detección de ad blocker en el modal; se da la recompensa igual (graceful fallback) |
| Pop-unders por error del provider | El `AdsterraProvider` nunca carga pop-unders; solo Social Bar + Rewarded + Interstitial |
| CSP demasiado restrictivo | Solo agregar dominios específicos de Adsterra, no wildcards |
| Consentimiento GDPR no se respeta | CookieConsent cargado antes de cualquier script publicitario; el provider verifica consentimiento antes de init() |

---

## Testing

- Verify `npm run build:prod` succeeds
- Verify CSP permite cargar scripts de Adsterra (prueba manual en navegador)
- Verify ad blocker detection sigue funcionando
- Verify rewarded ad concede monedas correctamente
- Verify cookie consent bloquea carga de scripts si no hay aceptación
- Verify Social Bar solo visible en desktop
- Verify interstitials respetan cooldown de 60s
