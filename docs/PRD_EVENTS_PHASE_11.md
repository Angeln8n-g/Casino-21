# PRD - Fase 11: Pulido UX (Sonidos y Efectos)

## 1. Visión y Objetivos

Convertir Casino 21 de una "aplicación web" a un verdadero "videojuego". El audio y los efectos visuales son el 50% de la experiencia (Game Feel). Aportar peso (juiciness) a cada acción: comprar un ítem, jugar una carta, conseguir un virado, o encontrar partida.

## 2. Alcance y Requerimientos

### 2.1. Assets de Sonido

Se requiere una biblioteca (liviana, formatos .mp3 o .ogg) de efectos (SFX):

- `card_deal.mp3`: Sonido al repartir cartas.
- `card_play.mp3`: Deslizar o soltar carta en mesa (Swoosh).
- `chips_clink.mp3`: Comprar en la tienda o ganar monedas (Sonido de fichas de casino).
- `match_found.mp3`: Un "Ding!" intenso o campana cuando el Matchmaking tiene éxito.
- `virado.mp3`: Sonido épico/trompetas para cuando alguien logra un "Virado".
- `victory.mp3` y `defeat.mp3`: Jingle de fin de partida.
- `bgm_lobby.mp3` y `bgm_game.mp3`: (Opcional) Música ambiental en loop muy baja de volumen (estilo jazz/lounge).
- `error_play.mp3`: Sonido de error al intentar jugar una carta inválida.

### 2.2. Gestor de Audio (Frontend)

- Implementar un Singleton o Provider (`AudioContext` / `useAudio`) en React.
- **Controles de Usuario**: Un botón global en `TopNavbar` para Mutear/Desmutear (Audio ON / OFF) y controlar volumen maestro. El estado se guarda en `localStorage`.
- **Pre-carga**: Asegurarse de que los efectos cortos se carguen rápido.

### 2.3. Efectos Visuales (VFX)

- Mejorar los `animate-pulse` actuales por animaciones CSS/Framer Motion más elaboradas.
- Confeti o chispas al ganar (`react-confetti` u otra librería ligera).
- Notificaciones de "¡VIRADO!" flotantes que aparezcan sobre el tablero (con keyframes de escala y desvanecimiento).

## 3. Plan de Implementación

1. **Búsqueda/Creación de Assets**: Conseguir audios libres de derechos (Royalty Free).
2. **Provider**: Crear `src/web/hooks/useAudio.tsx` para exponer métodos como `playSfx('card_play')`.
3. **Integración UI**: Llenar los componentes actuales (`GameScreen.tsx`, `MainMenu.tsx`, `Store.tsx`) con triggers de audio en eventos clave (`onClick`, `onDragEnd`, sockets).
4. **VFX**: Refinar CSS y probar animaciones en el Game Loop (ej: al vaciarse la mesa).
