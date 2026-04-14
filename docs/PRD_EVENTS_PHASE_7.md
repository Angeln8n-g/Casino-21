# PRD - Fase 7: Modo Espectador en Torneos

## 1. Visión y Objetivos
Aumentar el componente social y la emoción de los eventos (Torneos). El **Modo Espectador** permite que jugadores que no participan (o que ya fueron eliminados) puedan ver las partidas en curso, especialmente las finales, en tiempo real. Esto fomenta la comunidad, el aprendizaje estratégico y el hype en los torneos importantes.

## 2. Alcance y Requerimientos

### 2.1. Acceso a Partidas
- **Desde el Bracket (TournamentBracket.tsx)**: Los nodos de las llaves que estén en estado `live` o `playing` deben mostrar un botón o indicador visual (ej. un icono de 👁️ "Ver Partida").
- Al hacer clic, el usuario es redirigido a la `GameScreen` pero con un rol específico de espectador.

### 2.2. Lógica del Servidor (Node.js / Socket.io)
- **Nuevo Rol**: Modificar el evento `join_room` para aceptar un flag `{ isSpectator: true }`.
- **Estado de Espectadores**: La sala (`rooms[roomId]`) debe mantener una lista separada de espectadores (`spectators: string[]`) para no confundirlos con los jugadores activos (`players`).
- **Seguridad (Anti-Trampas / Stream Sniping)**: 
  - Al emitir el `game_state_update` a los clientes, el servidor DEBE sanear el objeto `GameState` para los espectadores.
  - Las cartas en las `hand` (manos) de *ambos* jugadores deben ser reemplazadas por objetos ocultos (ej. `{ id: 'hidden', value: 0, suite: 'hidden' }`) hasta que las cartas sean jugadas en la mesa (`table`).
  - Los espectadores solo pueden ver la puntuación pública y las cartas en la mesa.

### 2.3. UI / UX (Frontend)
- **GameScreen.tsx**:
  - **Identificación**: Mostrar un banner persistente en la parte superior que diga "MODO ESPECTADOR - [Nombre del Jugador 1] vs [Nombre del Jugador 2]".
  - **Controles Deshabilitados**: Ocultar por completo los botones de acción (`Pedir Carta`, `Plantarse`, `Rendirse`).
  - **Vista Neutral**: El espectador no tiene un "lado" propio. El Jugador 1 siempre se puede renderizar abajo (o a la izquierda) y el Jugador 2 arriba (o a la derecha), pero con nombres y avatares claros. Ambas manos de cartas deben renderizarse como el "reverso" de las cartas.
- **MainMenu.tsx**:
  - Ajustar el enrutamiento o el estado `currentRoomId` para saber si se entró como jugador o como espectador.

### 2.4. Chat de Espectadores (Opcional / MVP)
- Si hay tiempo en el MVP, agregar un pequeño panel lateral de chat exclusivo para la sala, donde solo los espectadores puedan interactuar, sin distraer a los jugadores.

## 3. Plan de Implementación (Paso a Paso)

### Paso 1: Actualización del Servidor (Backend)
1. Modificar `server/src/index.ts`.
2. En la estructura de la sala (`rooms[roomId]`), agregar el arreglo `spectators`.
3. Actualizar el evento `join_room` para registrar a un socket en la lista de espectadores si llega con el flag correspondiente.
4. Modificar la función que emite el estado (`io.to(roomId).emit('game_state_update', ...)`) para que emita versiones diferentes del estado:
   - Estado completo para el Jugador 1 (viendo su mano, ocultando la del 2).
   - Estado completo para el Jugador 2 (viendo su mano, ocultando la del 1).
   - **Estado saneado para Espectadores** (ocultando ambas manos).

### Paso 2: Interfaz de Acceso (Bracket)
1. Modificar `TournamentBracket.tsx` y `EventsPage.tsx`.
2. Identificar partidas que tengan `status === 'pending'` pero que ya tengan ambos jugadores asignados (y un `game_room_id` activo).
3. Habilitar la función `onJoinMatch` no solo para los jugadores involucrados, sino para terceros enviando el flag `isSpectator: true`.

### Paso 3: Adaptación de la Pantalla de Juego
1. Modificar `GameScreen.tsx` para aceptar la prop `isSpectator`.
2. Renderizar el UI en "Modo Vista".
3. Renderizar las manos de los jugadores utilizando la textura de `card_back` (ya sea la default o la equipada por el jugador, si es posible).
4. Deshabilitar interacciones de drag & drop (dnd-kit) o clics sobre la mesa.

### Paso 4: Pruebas y Validación
- Probar un escenario con 3 clientes: Cliente A (Jugador 1), Cliente B (Jugador 2), Cliente C (Espectador).
- Verificar que C no puede ver las cartas de A ni de B hasta que se jueguen.
- Verificar que C no afecta los turnos ni el tiempo.
