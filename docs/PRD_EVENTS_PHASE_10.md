# PRD - Fase 10: Historial de Partidas y Replays

## 1. Visión y Objetivos
Proporcionar a los jugadores un sentido de progreso continuo y retención de datos. El Historial de Partidas permite revisar resultados anteriores, ganancias de monedas, fluctuaciones de ELO y estadísticas generales en el Perfil de Usuario.

## 2. Alcance y Requerimientos

### 2.1. Base de Datos (Supabase)
- **Tabla `match_history`**:
  - `id`: UUID primario
  - `game_mode`: '1v1', '2v2', 'tournament'
  - `winner_id`: (FK a profiles, opcional si fue empate)
  - `end_time`: Timestamp
  - `metadata`: JSONB con el resultado de todos los jugadores (puntaje final, virados hechos, variaciones de ELO, monedas ganadas).

### 2.2. Servidor (Node.js)
- Al momento de detectar la victoria (`gameState.phase === 'completed'`), el servidor ejecuta un RPC de Supabase o inserta directamente un nuevo registro en `match_history` con los detalles consolidados del estado de juego.

### 2.3. Interfaz de Usuario (UI)
- **Componente `ProfileHistory.tsx`**: Una nueva pestaña en el perfil o en `QuickStats` que cargue la lista de partidas.
- **Diseño Visual**: Filas de historial estilo "Historial de Batallas" (Victoria/Derrota en verde/rojo, ELO +/- , Monedas ganadas, y foto del Oponente).
- **Detalle de Partida (Opcional/V2)**: Al hacer clic, poder ver qué cartas se llevó cada quien al final (Replay estático).

## 3. Plan de Implementación
1. **Migración SQL**: Crear `match_history` y sus políticas RLS (para que un jugador solo pueda ver los partidos donde participó).
2. **Backend Node.js**: Integrar la llamada de inserción a Supabase en el bloque de "Juego Terminado".
3. **Frontend**: Desarrollar la vista del historial en el Menú Principal, y un hook `useMatchHistory` para recuperar la data.