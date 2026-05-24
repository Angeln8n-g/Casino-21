# Fase 2: Desafíos 2v2 con Apuestas

## Objetivo

Extender el sistema de desafíos entre amigos (QuickChallengeModal) para soportar **partidas 2v2 con apuesta de monedas**.

## Flujo de Usuario

```
Jugador A → abre modal de desafío → selecciona modo 2v2 + cantidad de monedas
          → envía invitación a Jugador B (amigo)
Jugador B → acepta → se une a la sala (equipo asignado automáticamente)
          → sala queda con 2/4 jugadores
          → Jugador A y B necesitan 2 oponentes más
```

### Opciones para completar la sala (post-aceptación)

1. **Compartir código de sala**: Jugador A o B comparten el `roomId` (URL) para que otros amigos se unan
2. **Matchmaking**: La sala entra a matchmaking automáticamente tras la aceptación
3. **Invitación grupal**: El modal permite invitar a más amigos directamente

## Cambios Necesarios

### 1. Backend (`server/src/index.ts`)

| Ruta | Cambio | Complejidad |
|---|---|---|
| `create_room` handler | Ya soporta `mode: '2v2'` y `betAmount` — sin cambios | Trivial |
| `join_room` handler | Ya soporta asignación automática de equipos (línea 557-562) | Trivial |
| Escrow | Ya maneja `room.maxPlayers` jugadores | Trivial |
| **Nuevo: timeout** | Si la sala 2v2 no se llena en N minutos, cancelar y refund | Media |
| **Nuevo: matchmaking parcial** | Unir sala parcial a matchmaking para encontrar oponentes restantes | Alta |

### 2. Frontend (`src/web/components/SocialPanel.tsx` - QuickChallengeModal)

| Cambio | Descripción |
|---|---|
| Selector de modo | Botones 1v1 / 2v2 (solo visible si no es el retador inicial) |
| Selector de apuesta | Mismos presets que Fase 1 (50/100/250/500 + input libre) |
| Estado post-aceptación | Si 2v2 → no cerrar modal, mostrar "¡Aceptado! Sala: XXXX — Esperando oponentes..." |
| Compartir sala | Botón para copiar código/link de la sala |
| Timeout visual | Cuenta regresiva de 3 min para llenar la sala |

### 3. Database

```sql
-- Ya se agregó en Fase 1:
ALTER TABLE game_invitations ADD COLUMN bet_amount INT DEFAULT 0;

-- Fase 2 podría requerir:
ALTER TABLE rooms ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE rooms ADD COLUMN fill_timeout INT DEFAULT 180; -- segundos
```

### 4. Nuevo Componente: `PendingChallengeBanner`

Banner persistente que muestra:

- "Tu desafío 2v2 está activo — Sala ABC123"
- Botón "Copiar link de sala"
- Botón "Cancelar desafío"
- Timer de expiración

Visible en el lobby mientras la sala 2v2 no esté llena.

## UX Flow Detallado

```
[Sender Flow]
1. Abre modal desafío → selecciona amigo
2. Elige: [1v1] [2v2]
3. Elige apuesta: [50] [100] [250] [500] [───]
4. Enviar desafío
5. Modal muestra: "Esperando respuesta..." con timer 60s

6a. Amigo acepta (1v1) → modal cierra → redirige a GameScreen
6b. Amigo acepta (2v2) → modal cambia a "¡Aceptado! Sala ABC123"
    → Muestra botón "Copiar link" + "Esperando jugadores..." + timer 3min

[Receiver Flow]
1. Recibe notificación: "Amigo te desafía a 2v2 por 100 🪙"
2. Al aceptar → se une a sala → se le asigna equipo automáticamente
3. Ve pantalla: "Esperando oponentes..." + código de sala

[Otros jugadores]
1. Pueden unirse con código de sala (si es pública)
2. O via matchmaking automático
```

## Consideraciones Técnicas

### Timeout y Refund

- Si la sala 2v2 no se llena en 3 minutos, el servidor debe:
  1. Emitir `room_timeout` a los jugadores en sala
  2. Refundear las apuestas (escrow reversal)
  3. Cerrar la sala

### Team Assignment

- Quien crea la sala → Team 1
- El amigo que acepta → Team 1 (mismo equipo)
- Nuevos jugadores via matchmaking/código → Team 2 (equipo contrario)
- Permitir cambiar de equipo manualmente (ya implementado en frontend)

### Estado del Modal

El modal debe soportar un estado adicional:

```typescript
type ChallengeState = 
  | 'idle'          // Mostrando selector de modo/apuesta
  | 'waiting'        // Esperando respuesta del amigo
  | 'accepted'       // Amigo aceptó (1v1: redirect, 2v2: waiting for players)
  | 'waiting_players' // 2v2: esperando más jugadores
  | 'expired'        // Timeout
  | 'cancelled';     // Cancelado por usuario
```

### Eventos Socket Nuevos

| Evento | Dirección | Propósito |
|---|---|---|
| `room_fill_timeout` | Server → Client | Notificar que la sala no se llenó a tiempo |
| `room_almost_full` | Server → Client | Notificar cuando solo falta 1 jugador |
| `leave_room` | Client → Server | Salir de sala parcialmente llena |

## Posibles Problemas

1. **Race condition**: Dos personas invitan a la misma persona a diferentes salas 2v2
2. **Balance de equipos**: Si 3 personas están en sala, el 4to debe ir al equipo necesario
3. **Notificaciones**: El receptor necesita saber que es un desafío 2v2 (vs 1v1)
4. **Refund parcial**: Si un jugador se va antes de timeout, ¿se refund a todos? (Backend ya maneja esto: refund solo si escrow falla)

## Priorización

| Item | Prioridad | Esfuerzo |
|---|---|---|
| Modo 2v2 en selector del modal | Alta | Pequeño |
| Estado `waiting_players` + código sala | Alta | Medio |
| Timeout y refund automático | Alta | Medio |
| Matchmaking automático post-aceptación | Baja | Grande |
| Banner persistente en lobby | Media | Medio |
| Invitación grupal (varios amigos) | Baja | Grande |
