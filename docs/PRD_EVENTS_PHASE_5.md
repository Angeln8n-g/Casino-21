# PRD - Fase 5: Sistema de Misiones Diarias y Recompensas (Daily Quests)

## 1. Visión y Objetivos
Para mantener el interés y la retención de los jugadores todos los días (retención D1, D7, D30), introducimos un sistema de **Misiones Diarias**. Este sistema complementa la economía introducida en la Fase 4, ofreciendo a los jugadores formas de ganar Monedas y Experiencia (XP) sin necesidad de ganar siempre los torneos.

## 2. Alcance (Fase 5)
El sistema constará de una rotación diaria de misiones para cada usuario.

### 2.1 Misiones y Rotación
- **Tipos de Misiones**:
  - Jugar un número específico de partidas (ej. Juega 3 partidas 1v1).
  - Ganar partidas (ej. Gana 2 partidas).
  - Realizar acciones específicas en el juego (ej. Juega 10 cartas especiales, consigue un Blackjack).
- **Asignación Diaria**: Cada jugador recibirá un conjunto de 3 misiones diarias al iniciar sesión por primera vez en el día.
- **Reinicio Diario**: A medianoche (hora del servidor o local), las misiones se reinician o reemplazan.

### 2.2 Recompensas y Reclamación
- **Recompensas**: Completar misiones otorgará Monedas (🪙) y XP.
- **Reclamación Manual**: Las recompensas no se otorgan automáticamente al completarse; el jugador debe hacer clic en un botón "Reclamar" en la UI. Esto genera un sentido de gratificación.

### 2.3 Visualización (Frontend)
- **Panel de Misiones Diarias**: Un nuevo componente UI (por ejemplo, `DailyQuests.tsx`) accesible desde el menú principal o el perfil.
- **Barras de Progreso**: Visualización clara del progreso de cada misión (ej. "2/3 Partidas jugadas").
- **Notificaciones**: Un pequeño indicador rojo en el menú cuando hay una misión completada lista para reclamar.

## 3. Modelo de Datos (Backend - PostgreSQL)

Se necesitan dos tablas principales: un catálogo de misiones y el progreso por jugador.

```sql
-- Catálogo global de misiones disponibles
CREATE TABLE public.quest_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- ej: 'play_3_matches'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_amount INTEGER NOT NULL, -- ej: 3
  reward_coins INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  quest_type TEXT NOT NULL, -- 'play_match', 'win_match', 'play_card'
  is_active BOOLEAN DEFAULT TRUE
);

-- Misiones asignadas a los jugadores
CREATE TABLE public.player_daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id),
  quest_id UUID NOT NULL REFERENCES public.quest_catalog(id),
  progress INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Para saber de qué día es
  UNIQUE(player_id, quest_id, assigned_date) -- Evita duplicados en el mismo día
);
```

## 4. Funciones RPC (Remote Procedure Calls)

Se necesitará lógica de base de datos para manejar las misiones de forma segura.

- `assign_daily_quests(p_id UUID)`: Asigna aleatoriamente 3 misiones activas al jugador para el día actual si aún no las tiene.
- `claim_quest_reward(player_quest_id UUID)`:
  - Verifica que la misión esté completada (`is_completed = TRUE`) y no reclamada (`is_claimed = FALSE`).
  - Actualiza el estado a `is_claimed = TRUE`.
  - Añade las monedas y XP al jugador en la tabla `profiles`.
  - (Opcional) Registra la transacción en `wallet_transactions`.

## 5. Actualización del Backend (Node.js)

El servidor de juego (Socket.io) deberá ser modificado para emitir eventos de progreso de misiones al final de cada partida:
- Al terminar un partido, incrementar el progreso de misiones tipo `play_match` o `win_match` para los jugadores involucrados mediante Supabase.

## 6. Siguientes Pasos (Implementación)
1. **Paso 5.1**: Crear archivo de migración SQL con las nuevas tablas, datos semilla (sembrar unas 10 misiones) y funciones RPC.
2. **Paso 5.2**: Crear el componente frontend `DailyQuests.tsx` y añadirlo a la UI principal.
3. **Paso 5.3**: Actualizar el backend (`server/src/index.ts`) para registrar el progreso de las misiones al finalizar las partidas.
4. **Paso 5.4**: Implementar la lógica de reclamación en el frontend conectando con el RPC.
