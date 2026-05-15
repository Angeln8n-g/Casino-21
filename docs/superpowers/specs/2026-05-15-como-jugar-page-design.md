# Cómo Jugar Page — Design Spec

## Summary

Create a public "Cómo Jugar" (How to Play) page at route `/como-jugar` explaining the rules of Casino 21 and the Kasino21 platform features. The footer already links to this route in `AuthScreen.tsx`.

## Architecture

- New component: `src/web/components/ComoJugar.tsx` — named export `export function ComoJugar()`
- Route: `window.location.pathname === '/como-jugar'` in `App.tsx`
- Lazy-loaded via `React.lazy(() => import('./components/ComoJugar').then(m => ({ default: m.ComoJugar })))`
- Pattern: identical to `PrivacyPolicy.tsx` (sticky header, hero gradient, max-w-4xl content, LegalFooter)

## Content Sections

### Header
- LogoK21 + "KASINO21" brand link to `/`
- Nav: Términos, Privacidad, Cookies (links)
- CTA button: "← Jugar" link to `/`

### Hero
- Gradient background (gold theme)
- Badge: "Guía / KASINO21"
- Title: "Cómo Jugar Casino 21"
- Subtitle: "Aprende las reglas del juego de cartas Casino 21 y domina la mesa"

### Content Sections

1. **🎯 Objetivo del juego** — Ser el primero en alcanzar 21 puntos acumulando cartas estratégicamente.

2. **🃏 Valor de las cartas** — As=1, 2-10=valor nominal, J=11, Q=12, K=13.

3. **🎮 Mecánicas del juego**
   - Reparto: 4 cartas por jugador, 4 en el board
   - Llevar cartas: tomar cartas del board del mismo valor
   - Formar sumatorias: combinar cartas del board cuya suma iguale una carta en mano
   - Cantar un As: proteger un As en el board (requiere dos Ases en mano)
   - Virado: bonus por tomar la última carta del board

4. **📊 Puntuación por ronda**
   - Mayoría de cartas: 3 puntos
   - Mayoría de picas: 1 punto
   - 10 de diamantes: 2 puntos
   - 2 de picas: 1 punto
   - Cada As recolectado: 1 punto
   - Cada Virado: 1 punto
   - Reglas especiales al acercarse a 21 (17-20 puntos)

5. **🏆 Victoria** — Alcanzar 21+ puntos. Si se acaba el mazo, gana quien tenga más puntos.

6. **⚡ Kasino21 — Funcionalidades de la plataforma**
   - Apuestas con monedas virtuales
   - Matchmaking por ELO (tolerancia expandible 50-500)
   - Temporizador de 30s por turno
   - Modo Bot para practicar
   - Modos 1v1 y 2v2
   - Modo invitado (si aplica)

### Footer
- `LegalFooter` with `current="como-jugar"` highlighting

## SEO

```ts
updateSEO({
  title: 'Cómo Jugar Casino 21 — Reglas del Juego de Cartas Online | KASINO21',
  description: 'Aprende a jugar Casino 21: objetivo, valor de cartas, puntuación, virado, sumatorias y todo sobre el juego de cartas online de KASINO21.',
  canonical: 'https://kasino21.com/como-jugar',
});
```

## Route Changes (App.tsx)

Add after existing legal page routes:

```tsx
const ComoJugar = lazy(() => import('./components/ComoJugar').then(m => ({ default: m.ComoJugar })));

// In App function:
if (pathname === '/como-jugar') return <Suspense fallback={<LoadingFallback />}><ComoJugar /></Suspense>;
```

## Files Changed

| File | Change |
|------|--------|
| `src/web/components/ComoJugar.tsx` | **Create** — new page component |
| `src/web/App.tsx` | **Edit** — add lazy import + route handler |

## Not in Scope

- Interactive tutorials or animations
- Multi-language support
- Video demos
- Changes to footer link (already exists)
