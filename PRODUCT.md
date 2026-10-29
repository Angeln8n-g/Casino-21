# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Jugadores casuales y competitivos de habla hispana (18–35+ años, con fuerte arraigo en el Caribe y Latinoamérica) que buscan duelos de cartas rápidos (5 a 10 minutos por partida), estimulación matemática y torneos estructurados con progresión en tiempo real, sin apuestas con dinero real.

## Product Purpose

Transformar el juego tradicional de 21 en un videojuego multijugador competitivo online (esports de cartas táctico). El éxito significa partidas fluidas y justas en navegador y móvil, donde la victoria dependa de la memoria de la baraja, el cálculo de sumatorias y la toma de decisiones bajo presión (30s por turno), dentro de un ecosistema seguro de monedas virtuales y recompensas cosméticas.

## Positioning

KASINO21 es el único videojuego de cartas que combina la dinámica caribeña/tradicional del 21 con un motor de esports moderno: sumatorias públicas con riesgo de contraataque rival, jugadas blindadas de doble As ("Cantar el As"), bonificaciones de impacto psicológico ("¡Virado!") y la tensa **Regla de Cierre (17–20 pts)** que elimina las victorias por azar en el tramo final. No es un casino de apuestas, ni una app financiera, ni un clon estático de solitario.

## Operating Context

- **Entornos de uso:** Navegadores web de escritorio y móviles (Chrome, Safari, Firefox, Edge) sin fricción de descarga, aplicación Android oficial empaquetada (`APK`) y Progressive Web App (`PWA`).
- **Ritmo de partida:** Turnos alternados con temporizador estricto de 30 segundos; partidas completas a 21 puntos resueltas en 5–10 minutos.
- **Flujos clave:** Entrada directa al lobby con autenticación Supabase, cola clasificatoria 1v1 Ranked (matchmaking ELO ±50), emparejamiento 2v2 táctico por equipos, llaves eliminatorias en vivo (Torneos 2.0 Sit & Go y Programados con check-in), salas privadas con código de 6 caracteres y entrenamiento sin riesgo contra IA de 4 dificultades.
- **Economía:** Monedas virtuales del juego obtenidas mediante victorias, misiones diarias y torneos; tienda 100% cosmética (avatares, tapetes, dorsos y emotes animados).

## Capabilities and Constraints

- **Capacidades funcionales:**
  - Motor de reglas formal con validación inmutable (`src/domain/*`).
  - Sincronización multijugador en tiempo real con WebSockets (Express + Socket.IO) y estado distribuido en Redis.
  - Sistema de torneos 2.0 con llaves eliminatorias de 4 a 32 jugadores, seeding ELO y premios dinámicos en monedas y XP.
  - Chat global de lobby, sistema de misiones diarias, historial de partidas y clasificación ELO en vivo (`profiles`).
- **Restricciones inquebrantables:**
  - `CASH_PRIZES_ENABLED = false`: Prohibición total de apuestas o retiros con dinero real.
  - Conservación estricta de las reglas del juego de cartas (valores de baraja francesa de 52 cartas, puntuación oficial y restricciones de cierre).
  - Cero dependencias de almacenamiento inseguras; compatibilidad total con políticas de prevención de rastreo (`safeStorage`).

## Brand Commitments

- **Nombre e Identidad:** KASINO21 (acortado como K21).
- **Dirección Visual Oficial:** «Arena Táctica Esports» — estética nocturna y nítida en obsidiana (`#050811`), oro campeón (`#FBBF24`), cian de rango ELO (`#22D3EE`), carmesí de baraja (`#F43F5E`) y esmeralda de estado activo (`#10B981`).
- **Tipografías fijas:** Display en `Russo One`; interfaces, tablas y números de alta precisión en `Chakra Petch` (`tabular-nums`).
- **Roster oficial de duelistas:** El AS ("El Audax"), La Q ("La Reyna"), Dark King 👑 ("El Rey Oscuro"), Dra. Corazón ("La Curadora"), El As ("Pícaro"), Chukis ("El Chukis"), Tomás ("Compañero") y El Cebollero ("Veterano de Mesa").
- **Colección de temas de mesa:** Clásico, Neon Dealer, Gold Rush, Vault Noir, Tactile Vegas y Bento Casino.

## Evidence on Hand

- **Reglas oficiales documentadas:** `src/web/components/ComoJugar.tsx` y `docs/design.md`.
- **Base de datos en producción local:** Tablas `profiles` (jugadores activos como El-Miedo con 1910 ELO), `events` (Torneos 2.0 con llaves Sit & Go y Programados) y `store_items` con avatares reales.
- **Recursos multimedia verificados (HTTP 200):** Archivos de personajes y emotes confirmados en el bucket `store_assets` de Supabase Storage.
- **Suites de pruebas automatizadas:** Pruebas unitarias de servidor en Jest (`server/tests/`) y property-based testing en TypeScript.
- **Descarga móvil nativa:** Binario Android compilado y alojado en `/public/casino21-mobile.apk`.

## Product Principles

1. **Habilidad sobre Azar:** Toda mecánica recompensa el conteo de cartas, la lectura del tablero y el cálculo matemático; el azar reparte la mano, pero la técnica gana la partida.
2. **Acceso Inmediato sin Fricción:** Un visitante debe poder estar jugando en su navegador en menos de 10 segundos, en cualquier dispositivo y sin barreras de entrada.
3. **Competición Justa y Transparente:** Emparejamiento por ELO equitativo, reglas idénticas para todos los jugadores y una economía 100% cosmética donde el dinero no compra ventajas en la mesa.
4. **Respeto a la Tradición del 21:** Modernizar la presentación y la experiencia digital sin adulterar las reglas clásicas (sumatorias, cantos de As, virados y restricciones a 17-20 pts) que la comunidad ya domina.

## Accessibility & Inclusion

- Cumplimiento de contraste WCAG AA (≥ 4.5:1 en textos estándar y botones; ≥ 3:1 en encabezados).
- Soporte completo para navegación por teclado, focus traps en diálogos modales y cajón móvil.
- Neutralización exhaustiva de bucles y animaciones bajo preferencias de movimiento reducido (`@media (prefers-reduced-motion: reduce)` y `MotionConfig reducedMotion="user"`).
- Lenguaje inclusivo, accesible y en español neutro de alta calidad.
