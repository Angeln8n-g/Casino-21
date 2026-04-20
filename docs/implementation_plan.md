# Implementación del Sistema de Abandono de Partida (Abandon Match)

Este documento detalla los cambios propuestos para implementar una penalización al abandonar una partida y asegurar que las recompensas (ELO y Monedas) se asignen correctamente al jugador oponente.

## User Review Required

> [!IMPORTANT]
> Revisa este plan para asegurar que el comportamiento de los modales y las recompensas es exactamente lo que esperas. Específicamente, este plan se aplicará cuando el usuario hace clic **explícitamente** en el botón de salir de la partida. Si el usuario pierde conexión (cierra la pestaña a la fuerza), actualmente el juego espera su reconexión; si deseas que la desconexión abrupta también se considere abandono luego de cierto tiempo, avísame en tu respuesta.

## Proposed Changes

---

### Backend (Lógica de Servidor)

#### [MODIFY] `server/src/index.ts`
- Agregar un nuevo listener `socket.on('abandon_match', ({ roomId }) => { ... })`
- Este evento identificará al usuario que abandona y forzará el estado del juego (`room.state.phase = 'completed'`).
- Asignará como ganador (`room.state.winnerId`) al oponente.
- Llamará a `saveMatchResult(roomId, room)` para que el servidor procese la transferencia de monedas y el aumento/reducción de ELO igualitario que al ganar convencionalmente.
- Emitirá el evento `match_abandoned` a toda la sala con los datos de recompensa obtenidos.

---

### Frontend (Hooks y Estado)

#### [MODIFY] `src/web/hooks/useGame.tsx`
- Agregar una nueva función `abandonMatch()` que el componente `GameScreen` llamará al confirmar salir.
- Agregar un estado `matchAbandonedData` que capture el evento del backend para mostrar el modal de notificación al otro lado.
- Suscribirse a `socket.on('match_abandoned')` para que el jugador restante sepa que su oponente abandonó y reciba la información que necesita el modal.

---

### Frontend (Vistas y UI)

#### [MODIFY] `src/web/components/GameScreen.tsx`
- Crearemos dos nuevos modales simples dentro del mismo archivo (o como componentes que flotan):
  1. **AbandonConfirmModal**: Cuando se presiona "Abandonar" o "Salir". Adviertirá que perderá su apuesta y puntos ELO.
  2. **OpponentAbandonedModal**: Un modal en lugar de la pantalla normal de conclusión, diseñado específicamente para decirle al usuario remanente: *"¡Tu oponente ha abandonado! Has ganado X monedas y +25 ELO."*
- Modificar los botones de salida actuales (las llamadas a `localStorage.removeItem` y `reload()`) para que primero desplieguen el `AbandonConfirmModal`. Al darle confirmar a ese modal, se llama a `abandonMatch()` y luego se hace el reload/redirigir para salir del juego.

## Open Questions

1. Actualmente el ELO que se suma y se quita es por cantidad establecida de 25 en `saveMatchResult`. Así está el backend. ¿Este comportamiento está correcto para penalización también?
2. ¿Qué texto preferirías tener dentro del Modal de Confirmación? Pensé en algo como: *"Si sales ahora, la partida terminará y perderás todas tus monedas apostadas y puntos ELO. El jugador oponente obtendrá la victoria."*

## Verification Plan

### Test Manuales
- Iniciar una partida e intentar abandonarla con el botón "Salir", validando que se muestre el modal de precaución y que al cerrarlo no pase nada.
- Validar que, al aceptar, el jugador que abandonó es regresado al menú sin errores. 
- Comprobar que a los otros clientes que están observando su GameScreen (el rival) les salte un mensaje flotante del abandono, indicando ELO ganado, Monedas y redirigiéndolos al menú de manera exitosa.
