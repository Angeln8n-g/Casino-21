# Confirmación Sincrónica de Siguiente Ronda

La idea es excelente, pero en lugar de usar un pop-up (que puede ser invasivo o requerir una acción extra para cerrarlo), propongo una **forma más elegante y moderna**: **Transformar el propio botón**. 

Cuando un jugador presiona "Siguiente Ronda", el botón se deshabilita, cambia su texto a "Esperando al otro jugador..." y muestra una sutil animación de carga o pulso. Esto mantiene al jugador en contexto, permitiéndole seguir viendo el desglose de puntos mientras espera.

## User Review Required

> [!NOTE]
> **Diseño de la UI:** ¿Te parece bien la propuesta de transformar el botón en lugar de un pop-up? Es el estándar en juegos multijugador modernos (como Hearthstone o Marvel Snap) para las pantallas de resumen.

## Proposed Changes

### Backend (Engine & State)

#### [MODIFY] `src/domain/game-state.ts`
- Agregar la propiedad `readonly readyForNextRound?: string[];` a la interfaz `GameState`.

#### [MODIFY] `src/application/game-engine.ts`
- Agregar el método `markPlayerReady(state: GameState, playerId: string): Result<GameState>`.
- Este método agregará al jugador al arreglo `readyForNextRound`. Si todos los jugadores humanos están listos, llamará internamente a `continueToNextRound`.
- Modificar `reshuffleForNextDeal` para resetear `readyForNextRound: []` al empezar una ronda nueva.

### Backend (Socket Server)

#### [MODIFY] `server/src/index.ts`
- Reemplazar el handler de `continue_round` por uno llamado `mark_ready` que invoque `engine.markPlayerReady(room.state, userId)`.
- Actualizar `scheduleBotTurnIfNeeded` para que el bot simplemente se marque como listo (`markPlayerReady`) en lugar de forzar el salto de ronda para todos.

### Frontend (UI & Hooks)

#### [MODIFY] `src/web/hooks/useGame.tsx`
- Renombrar o añadir un método `markReadyForNextRound` que emita el evento `'mark_ready'` mediante el socket.

#### [MODIFY] `src/web/components/game/RoundSummaryScreen.tsx`
- Recibir `localPlayerId` como prop (o sacarlo del contexto) para saber si el jugador actual ya está en `readyForNextRound`.
- Modificar el botón de "Siguiente Ronda":
  - Si el jugador **no** está listo: Muestra "Siguiente Ronda".
  - Si el jugador **ya** está listo: El botón se deshabilita, baja su opacidad un poco, muestra una animación (ej. texto parpadeante) y dice "Esperando oponente...".

## Verification Plan

### Manual Verification
- Iniciar una partida 1v1 con dos ventanas distintas.
- Terminar la primera ronda.
- Al hacer clic en "Siguiente Ronda" en una ventana, verificar que la pantalla cambie a "Esperando oponente...".
- Al hacer clic en la otra ventana, verificar que ambos avancen simultáneamente a la siguiente ronda.
- Probar con el Bot para asegurarse de que el bot se marca como listo automáticamente o que el sistema avanza al jugar contra el bot.
