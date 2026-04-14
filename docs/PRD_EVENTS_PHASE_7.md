# PRD - Fase 7: Modo Espectador en Torneos

## 1. Visión y Objetivos
Aumentar el componente social y la emoción de los eventos (Torneos). El **Modo Espectador** permite que jugadores que no participan (o que ya fueron eliminados) puedan ver las partidas en curso, especialmente las finales, en tiempo real.

## 2. Alcance
- **Acceso a Partidas**: Desde el `TournamentBracket`, los usuarios podrán hacer clic en un nodo de partido que esté `live` y seleccionar "Observar".
- **Estado Espectador**: El servidor (Socket.io) debe manejar un nuevo rol: `spectator`. Estos usuarios reciben actualizaciones del estado del juego (`game_state_update`) pero NO pueden emitir acciones (jugar cartas, pasar, etc.).
- **Visibilidad Restringida**: Los espectadores solo deben ver la información pública (las cartas en la mesa y puntuaciones). NO deben ver las manos privadas de los jugadores (para evitar trampas a través de comunicación externa).
- **Chat de Espectadores (Opcional)**: Un canal de chat lateral exclusivo para espectadores de esa sala.

## 3. Backend (Node.js)
- Modificar el evento `join_room` para aceptar un flag `isSpectator`.
- Al enviar `game_state_update` a un espectador, el servidor debe sanear el objeto `GameState` para censurar (reemplazar por `null` o IDs ocultos) las cartas en las manos de todos los jugadores.

## 4. UI/UX
- El componente `GameScreen` debe adaptarse al modo espectador (ocultar controles de acción, mostrar indicador "MODO ESPECTADOR" en la pantalla).
