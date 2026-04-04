# Prompt Detallado — Casino 21 Mobile App (React Native / Expo)

## Contexto del Proyecto

Estás desarrollando **Casino 21**, un juego de cartas multijugador online para móvil. El proyecto ya tiene:

- Una app React Native con Expo (`src/mobile/`) con navegación, hooks, servicios y pantallas parcialmente implementadas.
- Un servidor Node.js en `/server/` con Socket.io.
- Supabase como base de datos y autenticación.
- El dominio del juego en `src/domain/` y la lógica de aplicación en `src/application/`.

El stack tecnológico es:
- **Frontend**: React Native 0.74, Expo 51, TypeScript, React Navigation v6, Reanimated 3, Gesture Handler
- **Backend**: Node.js, Socket.io 4, Express
- **Base de datos**: Supabase (PostgreSQL)
- **Estado**: hooks personalizados + Context API
- **Testing**: Jest + jest-expo + fast-check (property-based testing)

---

## Descripción del Juego

Casino 21 es un juego de cartas tradicional con naipes estándar (52 cartas). Los jugadores compiten para alcanzar **21 puntos** acumulando cartas del tablero.

### Reglas Fundamentales

**Valores de cartas**: As=1, 2-10=valor nominal, J=11, Q=12, K=13.

**Inicio de partida**:
- Se barajan 52 cartas.
- Cada jugador recibe 4 cartas ocultas (Hand).
- Se colocan 4 cartas descubiertas en el tablero (Board).
- Se elige aleatoriamente quién empieza.

**Acciones por turno** (el jugador DEBE jugar exactamente 1 carta):

1. **Llevar**: Si una carta de tu Hand tiene el mismo valor que una o más cartas del Board, las recoges todas. Esas cartas van a tu colección.
2. **Formar sumatoria (Formation)**: Seleccionas cartas del Board cuya suma de valores es igual a una carta de tu Hand. Las cartas quedan agrupadas en el Board como Formation. Cualquier jugador con la carta correcta puede llevársela después.
3. **Poner en el tablero**: Si no puedes llevar ni formar, colocas tu carta en el Board.
4. **Cantar un As**: Solo si tienes 2 Ases en la Hand. Colocas un As en el Board de forma especial; nadie puede llevárselo hasta tu próximo turno.

**Virado**: Si llevas la última carta del Board (dejándolo vacío) antes de que termine la partida, obtienes un Virado (+1 punto al final de la ronda).

**Fin de ronda**: Cuando todos los jugadores han jugado sus 4 cartas. Se calculan puntos:
- +3 puntos: mayoría de cartas recolectadas
- +1 punto: mayoría de picas recolectadas
- +2 puntos: tener el 10 de diamantes
- +1 punto: tener el 2 de picas
- +1 punto: por cada As recolectado
- +1 punto: por cada Virado

**Reglas especiales al acercarse a 21**:
- Con 17 puntos: solo se otorgan puntos por mayoría de cartas y mayoría de picas.
- Con 18-19 puntos: solo se otorgan puntos por mayoría de cartas.
- Con 20 puntos: solo se otorgan puntos por mayoría de picas.

**Victoria**: El primer jugador o equipo en alcanzar 21 puntos (o más) gana.

**Modos de juego**:
- 1 vs 1: 2 jugadores, 6 jugadas por jugador por ronda.
- 2 vs 2: 4 jugadores en 2 equipos, 3 jugadas por jugador por ronda.

---

## Arquitectura de la App Móvil

### Estructura de Carpetas

```
src/mobile/
├── App.tsx                    # Entry point, providers globales
├── navigation/
│   ├── RootNavigator.tsx      # Stack principal (Auth / App)
│   ├── AppNavigator.tsx       # Tab navigator del juego
│   └── types.ts               # Tipos de navegación
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── lobby/
│   │   ├── LobbyScreen.tsx    # Menú principal
│   │   ├── CreateRoomScreen.tsx
│   │   └── JoinRoomScreen.tsx
│   ├── game/
│   │   ├── WaitingRoomScreen.tsx
│   │   ├── GameScreen.tsx     # Tablero principal
│   │   └── ResultsScreen.tsx
│   ├── social/
│   │   ├── FriendsScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── competitive/
│   │   ├── TournamentsScreen.tsx
│   │   └── LeagueScreen.tsx
│   └── NotificationsScreen.tsx
├── components/
│   ├── game/
│   │   ├── Card.tsx           # Componente carta individual
│   │   ├── Board.tsx          # Tablero con cartas descubiertas
│   │   ├── Hand.tsx           # Mano del jugador
│   │   ├── Formation.tsx      # Agrupación de cartas en sumatoria
│   │   ├── ScoreBoard.tsx     # Marcador de puntos
│   │   └── TurnTimer.tsx      # Contador regresivo
│   ├── social/
│   │   ├── FriendCard.tsx
│   │   └── ChatPanel.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── NotificationBadge.tsx
├── hooks/
│   ├── useSocket.ts           # Conexión WebSocket global
│   ├── useGame.ts             # Estado del juego en tiempo real
│   ├── useAuth.ts             # Autenticación con Supabase
│   ├── useFriends.ts          # Lista de amigos y solicitudes
│   └── useNotifications.ts   # Notificaciones en tiempo real
├── services/
│   ├── socket.service.ts      # Instancia y configuración de socket.io-client
│   ├── supabase.service.ts    # Cliente Supabase
│   ├── auth.service.ts        # Login, registro, logout
│   └── api.service.ts         # Llamadas REST al backend
├── store/
│   ├── AuthContext.tsx        # Contexto de autenticación
│   ├── GameContext.tsx        # Estado global del juego
│   └── NotificationContext.tsx
└── utils/
    ├── cardUtils.ts           # Helpers para valores y comparaciones de cartas
    └── scoreUtils.ts          # Lógica de cálculo de puntos
```

---

## Pantallas y Flujos

### 1. Autenticación

**LoginScreen / RegisterScreen**
- Campos: nombre de usuario, email, contraseña.
- Login con Supabase Auth (email/password).
- Al autenticarse, navegar al Lobby.
- Mostrar errores de validación inline.

### 2. Lobby (Menú Principal)

**LobbyScreen**
- Mostrar: nombre del jugador, nivel, Elo actual, división de liga.
- Botones principales:
  - "Jugar Online" → CreateRoomScreen o JoinRoomScreen.
  - "Jugar Local" → selección de modo (1v1 / 2v2) sin servidor.
  - "Torneos" → TournamentsScreen.
  - "Liga" → LeagueScreen.
  - "Amigos" → FriendsScreen.
  - "Perfil" → ProfileScreen.
- Badge de notificaciones no leídas en el ícono de notificaciones.

### 3. Crear / Unirse a Sala

**CreateRoomScreen**
- Seleccionar modo: 1 vs 1 o 2 vs 2.
- Emitir evento `create_room` al servidor.
- Mostrar el código de sala generado (6 caracteres) para compartir.
- Navegar a WaitingRoomScreen.

**JoinRoomScreen**
- Input para ingresar código de sala.
- Emitir evento `join_room`.
- Navegar a WaitingRoomScreen.

### 4. Sala de Espera

**WaitingRoomScreen**
- Mostrar jugadores conectados a la sala.
- Mostrar "Esperando oponente..." hasta que todos estén listos.
- Escuchar evento `game_start` para navegar a GameScreen.
- Botón "Cancelar" para salir de la sala.

### 5. Tablero de Juego (Pantalla Principal)

**GameScreen** — la pantalla más compleja.

Layout sugerido (vertical, portrait):
```
┌─────────────────────────────┐
│  Oponente: nombre | pts | ♠  │  ← ScoreBoard oponente
│  Cartas: XX  Virados: X      │
├─────────────────────────────┤
│         TABLERO (Board)      │  ← 4 cartas descubiertas
│   [C1]  [C2]  [C3]  [C4]    │     + Formations agrupadas
├─────────────────────────────┤
│  Turno: [Nombre] ⏱ 30s      │  ← Indicador de turno + timer
├─────────────────────────────┤
│         MI MANO (Hand)       │  ← 4 cartas del jugador local
│   [C1]  [C2]  [C3]  [C4]    │
├─────────────────────────────┤
│  Yo: nombre | pts | ♠        │  ← ScoreBoard propio
│  Cartas: XX  Virados: X      │
└─────────────────────────────┘
```

**Interacciones del jugador**:
1. Tap en carta de la Hand → la selecciona (highlight).
2. Con carta seleccionada, tap en carta(s) del Board → selecciona cartas del Board.
3. Botón "Llevar" → emite `play_action` con tipo `TAKE`.
4. Botón "Formar" → emite `play_action` con tipo `FORM`.
5. Botón "Poner" → emite `play_action` con tipo `PLACE`.
6. Botón "Cantar As" → visible solo si el jugador tiene 2 Ases, emite `play_action` con tipo `SING_ACE`.

**Estado del juego** (recibido via `game_state_update`):
```typescript
interface GameState {
  board: Card[];
  formations: Formation[];
  myHand: Card[];
  players: PlayerState[];
  currentTurn: string; // playerId
  turnTimeLeft: number;
  roundNumber: number;
  phase: 'playing' | 'round_end' | 'match_end';
}

interface Card {
  id: string;
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  value: number; // 1-13
  faceUp: boolean;
}

interface Formation {
  id: string;
  cards: Card[];
  totalValue: number;
  createdBy: string;
}

interface PlayerState {
  id: string;
  name: string;
  score: number;
  collectedCards: number;
  spades: number;
  virados: number;
  isConnected: boolean;
}
```

**Feedback visual requerido**:
- Carta seleccionada: borde destacado + elevación.
- Turno del oponente: overlay semitransparente sobre la Hand propia + texto "Esperando turno del oponente".
- Virado obtenido: animación de celebración + texto "¡Virado!".
- Fin de ronda: modal con desglose de puntos.
- Desconexión del oponente: banner de aviso.

### 6. Resultados

**ResultsScreen**
- Mostrar: ganador, puntuación final, cambio de Elo, XP ganado.
- Desglose de puntos de la última ronda.
- Botones: "Revancha", "Volver al Lobby".

### 7. Perfil

**ProfileScreen**
- Avatar, nombre, nivel, barra de XP, título activo.
- Estadísticas: partidas, victorias, derrotas, racha, Elo actual/máximo.
- Gráfico de evolución del Elo (últimos 30 días).
- Historial de últimas 20 partidas.
- Logros desbloqueados.

### 8. Amigos

**FriendsScreen**
- Lista de amigos con estado (online 🟢 / offline ⚫ / en partida 🎮).
- Buscador de jugadores por nombre.
- Solicitudes de amistad pendientes (aceptar / rechazar).
- Botón "Invitar a partida" para amigos online.

### 9. Torneos

**TournamentsScreen**
- Lista de torneos activos y próximos.
- Crear torneo: seleccionar tamaño (4/8/16/32 jugadores).
- Unirse con código.
- Vista de bracket en tiempo real.

### 10. Liga

**LeagueScreen**
- División actual del jugador con ícono.
- Tabla de clasificación top 100 de la división.
- Tiempo restante de la temporada.
- Historial de temporadas anteriores.

---

## Hook Principal: `useGame.ts`

```typescript
// src/mobile/hooks/useGame.ts
import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';

export function useGame(roomId: string) {
  const { socket } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedHandCard, setSelectedHandCard] = useState<Card | null>(null);
  const [selectedBoardCards, setSelectedBoardCards] = useState<Card[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('game_state_update', (state: GameState) => {
      setGameState(state);
      setSelectedHandCard(null);
      setSelectedBoardCards([]);
    });

    return () => {
      socket.off('game_state_update');
    };
  }, [socket]);

  const playAction = useCallback((type: 'TAKE' | 'FORM' | 'PLACE' | 'SING_ACE') => {
    if (!socket || !selectedHandCard) return;
    socket.emit('play_action', {
      roomId,
      type,
      handCard: selectedHandCard,
      boardCards: selectedBoardCards,
    });
  }, [socket, roomId, selectedHandCard, selectedBoardCards]);

  return {
    gameState,
    selectedHandCard,
    selectedBoardCards,
    setSelectedHandCard,
    setSelectedBoardCards,
    playAction,
  };
}
```

---

## Eventos Socket.io (Cliente)

```typescript
// Emitir
socket.emit('create_room', { mode: '1v1' | '2v2', playerName: string });
socket.emit('join_room', { code: string, playerName: string });
socket.emit('play_action', { roomId: string, type: ActionType, handCard: Card, boardCards: Card[] });
socket.emit('send_message', { roomId: string, content: string });
socket.emit('send_friend_request', { targetUserId: string });
socket.emit('accept_friend_request', { requestId: string });
socket.emit('invite_to_game', { friendId: string });

// Escuchar
socket.on('room_created', ({ code: string, roomId: string }) => {});
socket.on('room_joined', ({ roomId: string, players: PlayerState[] }) => {});
socket.on('game_start', (initialState: GameState) => {});
socket.on('game_state_update', (state: GameState) => {});
socket.on('turn_timer', ({ timeLeft: number }) => {});
socket.on('player_disconnected', ({ playerId: string }) => {});
socket.on('player_reconnected', ({ playerId: string }) => {});
socket.on('chat_message', ({ author: string, content: string, timestamp: string }) => {});
socket.on('friend_request', ({ from: string, requestId: string }) => {});
socket.on('friend_online', ({ friendId: string, friendName: string }) => {});
socket.on('game_invitation', ({ from: string, roomCode: string }) => {});
socket.on('notification', ({ type: string, content: string }) => {});
socket.on('achievement_unlocked', ({ achievement: Achievement }) => {});
socket.on('level_up', ({ newLevel: number, xp: number }) => {});
```

---

## Consideraciones de UX Móvil

1. **Orientación**: Portrait obligatorio durante el juego. Landscape opcional en menús.
2. **Tamaño de cartas**: Mínimo 60x90px para ser tocables cómodamente. Usar `TouchableOpacity` con `hitSlop`.
3. **Feedback háptico**: Usar `expo-haptics` al seleccionar cartas, llevar cartas y obtener Virado.
4. **Sonidos**: Usar `expo-av` para sonidos de cartas (barajar, colocar, llevar).
5. **Animaciones**: Usar `react-native-reanimated` para:
   - Cartas que se mueven del Board a la colección del jugador.
   - Flip de cartas al revelarlas.
   - Animación de celebración al obtener Virado.
6. **Offline**: Mostrar banner cuando no hay conexión. Deshabilitar acciones de juego online.
7. **Safe Area**: Usar `react-native-safe-area-context` en todas las pantallas.
8. **Accesibilidad**: Incluir `accessibilityLabel` en todas las cartas e interacciones.

---

## Requisitos No Funcionales

- La app debe funcionar en iOS 14+ y Android 8+.
- El tiempo de respuesta del servidor debe ser < 100ms para acciones de juego.
- El estado del juego debe sincronizarse en < 500ms entre jugadores.
- La app debe manejar reconexiones automáticas al servidor.
- Todas las acciones del jugador deben validarse en el servidor (nunca confiar solo en el cliente).
- Los datos sensibles (tokens, credenciales) deben almacenarse en `expo-secure-store`.
- La app debe funcionar correctamente con el teclado virtual abierto (chat, búsqueda de amigos).

---

## Tareas de Implementación Prioritarias

### Alta Prioridad
1. Implementar `useSocket.ts` con reconexión automática y autenticación JWT.
2. Completar `GameScreen.tsx` con todas las interacciones de juego.
3. Implementar `Board.tsx` con soporte para Formations y selección múltiple.
4. Implementar `Hand.tsx` con selección de carta y estados visuales.
5. Conectar `useGame.ts` al servidor via Socket.io (eliminar motor local).

### Media Prioridad
6. Implementar `WaitingRoomScreen.tsx` con sala de espera en tiempo real.
7. Implementar `ResultsScreen.tsx` con desglose de puntos y cambio de Elo.
8. Implementar `FriendsScreen.tsx` con lista, búsqueda e invitaciones.
9. Implementar `ChatPanel.tsx` con rate limiting visual.
10. Implementar `NotificationsScreen.tsx` con historial.

### Baja Prioridad
11. Implementar `TournamentsScreen.tsx` con bracket visual.
12. Implementar `LeagueScreen.tsx` con tabla de clasificación.
13. Implementar `ProfileScreen.tsx` con gráfico de Elo.
14. Añadir sonidos con `expo-av`.
15. Añadir animaciones de cartas con `react-native-reanimated`.
