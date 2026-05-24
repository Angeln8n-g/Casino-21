# Event System Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 independent improvements to the event/tournament system: global auto-start notification, enhanced participants view, server tests, and auto-complete events.

**Architecture:** Extract tournament logic from ~1500-line `server/src/index.ts` into a focused `tournament-service.ts` module, then add Jest test infrastructure. The frontend already has toast (`useNotifications`) and sound (`useAudio`) systems — we add a lightweight global listener in `App.tsx`. The participants modal in `AdminPanel.tsx` is enhanced minimally with wins/losses columns. The auto-complete extends the existing `checkScheduledEvents` scheduler.

**Tech Stack:** Jest + ts-jest (server), Socket.io (frontend + backend), Supabase (DB), React 19 (frontend)

**File Structure:**

| File | Action | Responsibility |
|---|---|---|
| `server/src/tournament-service.ts` | Create | Tournament advancement, BO3 series, `handleTournamentFinal` |
| `server/src/index.ts:1296-1404` | Modify | Replace inlined logic with `import { processTournamentAdvancement } from './tournament-service'` |
| `server/jest.config.js` | Create | Jest config for server tests |
| `server/tsconfig.test.json` | Create | TypeScript config for server tests |
| `server/package.json` | Modify | Add jest deps + test script |
| `server/tests/tournament-service.test.ts` | Create | Tests for tournament logic + scheduler |
| `src/web/App.tsx` | Modify | Add global socket listeners for `event_started` + `event_completed` |
| `src/web/components/AdminPanel.tsx` | Modify | Enhance participants query/modal with wins/losses |
| `server/src/index.ts:1474-1498` | Modify | Add auto-complete query to `checkScheduledEvents` |

---

### Phase 1: Extract Tournament Service

**Reference:** `server/src/index.ts:333-357` (`handleTournamentFinal`), `server/src/index.ts:1296-1404` (advancement logic), `server/src/index.ts:313-331` (`notifyTournamentPlayers`)

### Task 1.1: Create `server/src/tournament-service.ts`

**Files:**
- Create: `server/src/tournament-service.ts`
- Test: (no test yet, extracted in this task)

```typescript
import { supabase } from './supabase';
import { Server } from 'socket.io';

export async function handleTournamentFinal(matchData: any, winnerId: string) {
  const { data: eventData } = await supabase
    .from('events')
    .select('prize_pool')
    .eq('id', matchData.event_id)
    .single();

  let finalPrize = 0;
  if (eventData?.prize_pool) {
    const matchAmount = eventData.prize_pool.match(/\d[\d,.]*/);
    if (matchAmount) finalPrize = parseInt(matchAmount[0].replace(/,/g, ''), 10);
  }

  if (finalPrize > 0) {
    console.log(`[Torneo] Final del torneo completada. Entregando premio de ${finalPrize} a ${winnerId}`);
    const { error: rewardError } = await supabase.rpc('award_tournament_prize', {
      event_id_param: matchData.event_id, winner_id_param: winnerId, prize_amount: finalPrize
    });
    if (rewardError) {
      console.error(`[Torneo] Error entregando premio final:`, rewardError);
    } else {
      console.log(`[Torneo] Premio entregado exitosamente.`);
    }
  }
}

export function notifyTournamentPlayers(
  io: Server,
  rooms: Record<string, any>,
  gameRoomId: string,
  eventId: string,
  player1Id?: string,
  player2Id?: string
) {
  const targetIds = new Set([player1Id, player2Id].filter(Boolean));
  if (targetIds.size === 0) return;

  for (const [, room] of Object.entries(rooms)) {
    for (const player of room.players) {
      if (targetIds.has(player.userId)) {
        const playerSocket = io.sockets.sockets.get(player.socketId);
        if (playerSocket) {
          playerSocket.emit('tournament_ready', { gameRoomId, eventId });
          console.log(`[Torneo] Notificación tournament_ready enviada a ${player.name} (sala ${gameRoomId})`);
        }
      }
    }
  }
}

export async function processTournamentAdvancement(
  io: Server,
  rooms: Record<string, any>,
  roomId: string,
  winnerId: string,
  isTournament: boolean
) {
  if (!isTournament || !winnerId) return;

  console.log(`[Torneo] Procesando avance de torneo para la sala ${roomId}. Ganador: ${winnerId}`);
  const { data: matchData, error: matchError } = await supabase
    .from('tournament_matches')
    .select('id, event_id, round_number, match_order, status, best_of, series_game, series_id, player1_id, player2_id')
    .eq('game_room_id', roomId)
    .single();

  if (matchError) {
    console.error(`[Torneo] Error buscando tournament_match asociado a la sala ${roomId}:`, matchError);
  }

  if (matchError || !matchData) return;

  if (matchData.status === 'completed') {
    console.log(`[Torneo] Match ${matchData.id} ya estaba completado. Saltando reprocesamiento.`);
    return;
  }

  console.log(`[Torneo] Actualizando status a 'completed' para el match ${matchData.id}`);
  await supabase.from('tournament_matches')
    .update({ winner_id: winnerId, status: 'completed' })
    .eq('id', matchData.id);

  // Check if this is a best-of series
  if (matchData.best_of > 1) {
    await handleBestOfSeriesAdvancement(matchData, winnerId, io, rooms);
  } else {
    await handleSingleMatchAdvancement(matchData, winnerId, io, rooms);
  }
}

async function handleBestOfSeriesAdvancement(
  matchData: any,
  winnerId: string,
  io: Server,
  rooms: Record<string, any>
) {
  const { data: seriesMatches } = await supabase
    .from('tournament_matches')
    .select('winner_id')
    .eq('series_id', matchData.series_id)
    .not('winner_id', 'is', null);

  const p1Wins = seriesMatches?.filter(m => m.winner_id === matchData.player1_id).length || 0;
  const p2Wins = seriesMatches?.filter(m => m.winner_id === matchData.player2_id).length || 0;
  const requiredWins = Math.ceil(matchData.best_of / 2);

  console.log(`[Torneo] Serie: ${p1Wins}-${p2Wins} (necesario: ${requiredWins})`);

  if (p1Wins >= requiredWins || p2Wins >= requiredWins) {
    const seriesWinner = p1Wins >= requiredWins ? matchData.player1_id : matchData.player2_id;
    console.log(`[Torneo] Serie completada. Ganador: ${seriesWinner} (${p1Wins}-${p2Wins})`);
    await handleTournamentFinal(matchData, seriesWinner);
  } else {
    const nextGame = matchData.series_game + 1;
    const { data: nextGameMatch } = await supabase
      .from('tournament_matches')
      .select('id, player1_id, player2_id, game_room_id')
      .eq('series_id', matchData.series_id)
      .eq('series_game', nextGame)
      .single();

    if (nextGameMatch) {
      await supabase.from('tournament_matches')
        .update({
          player1_id: matchData.player1_id,
          player2_id: matchData.player2_id
        })
        .eq('id', nextGameMatch.id);

      console.log(`[Torneo] Avanzado a game ${nextGame} de la serie (${nextGameMatch.id})`);
      notifyTournamentPlayers(io, rooms, nextGameMatch.game_room_id, matchData.event_id, matchData.player1_id, matchData.player2_id);
    }
  }
}

async function handleSingleMatchAdvancement(
  matchData: any,
  winnerId: string,
  io: Server,
  rooms: Record<string, any>
) {
  const nextRound = matchData.round_number + 1;
  const nextOrder = Math.ceil(matchData.match_order / 2);

  const { data: nextMatch } = await supabase
    .from('tournament_matches')
    .select('id, player1_id, player2_id, game_room_id')
    .eq('event_id', matchData.event_id)
    .eq('round_number', nextRound)
    .eq('match_order', nextOrder)
    .single();

  if (nextMatch) {
    const updateData: any = {};
    if (matchData.match_order % 2 !== 0) {
      updateData.player1_id = winnerId;
    } else {
      updateData.player2_id = winnerId;
    }

    await supabase.from('tournament_matches')
      .update(updateData)
      .eq('id', nextMatch.id);

    console.log(`[Torneo] Jugador ${winnerId} avanzado a ronda ${nextRound}, match ${nextMatch.id}`);

    const filledSlot = matchData.match_order % 2 !== 0 ? 'player1_id' : 'player2_id';
    const otherSlot = filledSlot === 'player1_id' ? 'player2_id' : 'player1_id';

    if (nextMatch[otherSlot]) {
      const p1Id = filledSlot === 'player1_id' ? winnerId : nextMatch[otherSlot];
      const p2Id = filledSlot === 'player2_id' ? winnerId : nextMatch[otherSlot];
      notifyTournamentPlayers(io, rooms, nextMatch.game_room_id, matchData.event_id, p1Id, p2Id);
    }
  } else {
    await handleTournamentFinal(matchData, winnerId);
  }
}
```

- [ ] **Step 1: Create `server/src/tournament-service.ts`** with the above code.

- [ ] **Step 2: Update `server/src/index.ts` — imports**

Replace:
```typescript
import { DefaultGameEngine } from './application/game-engine';
```
With:
```typescript
import { DefaultGameEngine } from './application/game-engine';
import { processTournamentAdvancement, handleTournamentFinal, notifyTournamentPlayers } from './tournament-service';
```

- [ ] **Step 3: Remove `notifyTournamentPlayers` function** from `server/src/index.ts` (lines 313-331).

- [ ] **Step 4: Remove `handleTournamentFinal` function** from `server/src/index.ts` (lines 333-357).

- [ ] **Step 5: Replace tournament advancement logic** in `server/src/index.ts` (lines 1296-1404) with a single call:

Find this:
```typescript
    // Si es torneo, avanzar llave
    if (isTournament && winnerId) {
      console.log(`[Torneo] Procesando avance de torneo para la sala ${roomId}. Ganador: ${winnerId}`);
      const { data: matchData, matchError } = ...
      ... (entire block to line 1404)
```

Replace with:
```typescript
    // Tournament advancement (delegated to tournament-service)
    if (isTournament && winnerId) {
      await processTournamentAdvancement(io, rooms, roomId, winnerId, true);
    }
```

- [ ] **Step 6: Build to verify**

Run: `npm --prefix server run build`
Expected: `tsc` compiles without errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/tournament-service.ts server/src/index.ts
git commit -m "refactor: extract tournament logic to tournament-service.ts"
```

---

### Phase 2: Server Test Infrastructure + Tests

### Task 2.1: Install Jest dependencies + config

**Files:**
- Modify: `server/package.json`
- Create: `server/jest.config.js`
- Create: `server/tsconfig.test.json`

- [ ] **Step 1: Add Jest dependencies to server/package.json**

Add to `devDependencies`:
```json
"jest": "^30.3.0",
"ts-jest": "^30.0.0",
"@types/jest": "^30.0.0"
```

Run: `npm --prefix server install`

- [ ] **Step 2: Create `server/jest.config.js`**

```javascript
/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",
  preset: "ts-jest",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: "tsconfig.test.json",
    }],
  },
  testMatch: ["**/tests/**/*.test.ts"],
};
```

- [ ] **Step 3: Create `server/tsconfig.test.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "types": ["jest", "node"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 4: Update test script in `server/package.json`**

Replace:
```json
"test": "echo \"Error: no test specified\" && exit 1"
```
With:
```json
"test": "jest"
```

- [ ] **Step 5: Verify Jest runs**

Run: `npm --prefix server test`
Expected: `No tests found, exiting with code 0` (no tests yet, but Jest starts successfully)

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/jest.config.js server/tsconfig.test.json
git commit -m "test: add Jest infrastructure for server"
```

### Task 2.2: Write tournament service tests

**Files:**
- Create: `server/tests/tournament-service.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { processTournamentAdvancement, handleTournamentFinal } from '../src/tournament-service';
import { Server } from 'socket.io';

// Mock supabase
jest.mock('../src/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '../src/supabase';

describe('processTournamentAdvancement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early if not a tournament', async () => {
    const result = await processTournamentAdvancement({} as Server, {}, 'room1', 'winner1', false);
    expect(result).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns early if no winnerId', async () => {
    const result = await processTournamentAdvancement({} as Server, {}, 'room1', '', true);
    expect(result).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('handles missing tournament match gracefully', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
        }),
      }),
    });

    const result = await processTournamentAdvancement({} as Server, {}, 'room1', 'winner1', true);
    expect(result).toBeUndefined();
  });
});

describe('handleTournamentFinal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing if no prize_pool', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { prize_pool: '' }, error: null }),
        }),
      }),
    });

    await handleTournamentFinal({ event_id: 'evt1' }, 'winner1');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('calls award_tournament_prize with parsed amount', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { prize_pool: '5000' }, error: null }),
        }),
      }),
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

    await handleTournamentFinal({ event_id: 'evt1' }, 'winner1');
    expect(supabase.rpc).toHaveBeenCalledWith('award_tournament_prize', {
      event_id_param: 'evt1',
      winner_id_param: 'winner1',
      prize_amount: 5000,
    });
  });

  it('parses formatted prize string', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { prize_pool: '$10,000 USD' }, error: null }),
        }),
      }),
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

    await handleTournamentFinal({ event_id: 'evt1' }, 'winner1');
    expect(supabase.rpc).toHaveBeenCalledWith('award_tournament_prize', {
      event_id_param: 'evt1',
      winner_id_param: 'winner1',
      prize_amount: 10000,
    });
  });

  it('does nothing on rpc error', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { prize_pool: '5000' }, error: null }),
        }),
      }),
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({ error: new Error('DB error') });

    await handleTournamentFinal({ event_id: 'evt1' }, 'winner1');
    // Should not throw, just log error
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm --prefix server test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/tests/tournament-service.test.ts
git commit -m "test: add tournament service tests"
```

---

### Phase 3: Auto-Complete Events

**Reference:** `server/src/index.ts:1474-1502` (`checkScheduledEvents`)

### Task 3.1: Add end_date check to scheduler

**Files:**
- Modify: `server/src/index.ts:1474-1498`

- [ ] **Step 1: Add auto-complete logic to `checkScheduledEvents`**

Replace the current function:
```typescript
// ─── Auto-inicio de Eventos Programados ───
async function checkScheduledEvents() {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .update({ status: 'live' })
      .eq('status', 'upcoming')
      .lte('start_date', new Date().toISOString())
      .select('id, title');

    if (error) {
      console.error('[Eventos] Error verificando eventos programados:', error);
      return;
    }

    if (events && events.length > 0) {
      for (const event of events) {
        console.log(`[Eventos] Evento "${event.title}" iniciado automáticamente`);
        io.emit('event_started', { eventId: event.id, title: event.title });
      }
    }
  } catch (err) {
    console.error('[Eventos] Error en checkScheduledEvents:', err);
  }
}
```

With:
```typescript
// ─── Auto-inicio y Auto-finalización de Eventos Programados ───
async function checkScheduledEvents() {
  try {
    // Auto-start upcoming events whose start_date has passed
    const { data: startedEvents, error: startError } = await supabase
      .from('events')
      .update({ status: 'live' })
      .eq('status', 'upcoming')
      .lte('start_date', new Date().toISOString())
      .select('id, title');

    if (startError) {
      console.error('[Eventos] Error auto-iniciando eventos:', startError);
    } else if (startedEvents && startedEvents.length > 0) {
      for (const event of startedEvents) {
        console.log(`[Eventos] Evento "${event.title}" iniciado automáticamente`);
        io.emit('event_started', { eventId: event.id, title: event.title });
      }
    }

    // Auto-complete live events whose end_date has passed
    const { data: completedEvents, error: completeError } = await supabase
      .from('events')
      .update({ status: 'completed' })
      .eq('status', 'live')
      .lte('end_date', new Date().toISOString())
      .select('id, title');

    if (completeError) {
      console.error('[Eventos] Error auto-finalizando eventos:', completeError);
    } else if (completedEvents && completedEvents.length > 0) {
      for (const event of completedEvents) {
        console.log(`[Eventos] Evento "${event.title}" finalizado automáticamente`);
        io.emit('event_completed', { eventId: event.id, title: event.title });
      }
    }
  } catch (err) {
    console.error('[Eventos] Error en checkScheduledEvents:', err);
  }
}
```

- [ ] **Step 2: Build to verify**

Run: `npm --prefix server run build`
Expected: `tsc` compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: auto-complete events when end_date passes"
```

---

### Phase 4: Global `event_started` + `event_completed` Handler

**Reference:** `src/web/App.tsx`, `src/web/services/socket.ts`, `src/web/hooks/useAudio.tsx`

### Task 4.1: Add global socket listeners + toast in App.tsx

**Files:**
- Modify: `src/web/App.tsx`

- [ ] **Step 1: Add import and state at top of App component**

In `src/web/App.tsx`, modify the `App` function (the exported default):

```typescript
import { socketService } from './services/socket';
import { useAudio } from './hooks/useAudio';
```

And add inside the `export default function App()`:

```typescript
export default function App() {
  const { playSfx } = useAudio();
  // ─── Legal Page Router (public, no auth required) ─────────────────────────
  ...
```

- [ ] **Step 2: Add toast state + socket listeners**

Inside `export default function App()`, before the legal page routing, add:

```typescript
const [eventToast, setEventToast] = useState<{ message: string; type: 'start' | 'end' } | null>(null);

useEffect(() => {
  let mounted = true;
  socketService.connect().then(socket => {
    if (!mounted) return;
    socket.on('event_started', (data: { eventId: string; title: string }) => {
      if (mounted) {
        setEventToast({ message: `🎲 "${data.title}" ha comenzado automáticamente`, type: 'start' });
        playSfx('alert');
        // Clear toast after 10s
        setTimeout(() => { if (mounted) setEventToast(null); }, 10000);
      }
    });
    socket.on('event_completed', (data: { eventId: string; title: string }) => {
      if (mounted) {
        setEventToast({ message: `✅ "${data.title}" ha finalizado`, type: 'end' });
        playSfx('alert');
        setTimeout(() => { if (mounted) setEventToast(null); }, 10000);
      }
    });
  }).catch(() => {});
  return () => { mounted = false; };
}, [playSfx]);
```

- [ ] **Step 3: Add toast rendering in JSX**

Inside the `<div className="absolute inset-0 w-screen h-screen ...">`, before the `noise-overlay` div or after it, add:

```tsx
{/* Event notification toast */}
{eventToast && (
  <div className="fixed top-4 right-4 z-[100] animate-slide-down">
    <div className={`px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md ${
      eventToast.type === 'start'
        ? 'bg-cyan-900/80 border-cyan-500/30 text-cyan-200'
        : 'bg-emerald-900/80 border-emerald-500/30 text-emerald-200'
    }`}>
      <p className="text-sm font-bold">{eventToast.message}</p>
    </div>
  </div>
)}
```

Note: You need to ensure `animate-slide-down` exists in Tailwind config or add a custom animation. Check if it already exists, or use `animate-fade-in` instead. Let's use `animate-fade-in` (already exists in the project).

- [ ] **Step 4: Verify the build**

Run: `npm run build` (just frontend)
Expected: Vite builds without errors.

- [ ] **Step 5: Commit**

```bash
git add src/web/App.tsx
git commit -m "feat: global event_started and event_completed handler with toast"
```

---

### Phase 5: Enhanced Participants View

**Reference:** `src/web/components/AdminPanel.tsx:292-309` and `src/web/components/AdminPanel.tsx:736-792`

### Task 5.1: Add wins/losses to participants query + modal

**Files:**
- Modify: `src/web/components/AdminPanel.tsx`

- [ ] **Step 1: Update `handleViewParticipants` to include wins/losses**

Change the query from:
```typescript
const { data, error } = await supabase
  .from('event_entries')
  .select('id, player_id, score, joined_at, profiles!inner(id, username, avatar_url, elo)')
  .eq('event_id', eventId);
```

To:
```typescript
const { data, error } = await supabase
  .from('event_entries')
  .select('id, player_id, score, joined_at, profiles!inner(id, username, avatar_url, elo, wins, losses)')
  .eq('event_id', eventId);
```

- [ ] **Step 2: For each participant, count their matches in this event**

After the first query succeeds, add:
```typescript
// Fetch per-player match counts in this tournament
const { data: allMatches } = await supabase
  .from('tournament_matches')
  .select('player1_id, player2_id')
  .eq('event_id', eventId);

const matchCountMap = new Map<string, number>();
if (allMatches) {
  for (const m of allMatches) {
    if (m.player1_id) matchCountMap.set(m.player1_id, (matchCountMap.get(m.player1_id) || 0) + 1);
    if (m.player2_id) matchCountMap.set(m.player2_id, (matchCountMap.get(m.player2_id) || 0) + 1);
  }
}

// Attach match count to each participant
const enriched = (data || []).map(p => ({
  ...p,
  matches_played: matchCountMap.get(p.player_id) || 0,
}));
setCurrentEventParticipants(enriched);
```

- [ ] **Step 3: Update participant card UI to show wins/losses/matches**

Replace lines 770-773 (the name + ELO div):
```tsx
<div>
  <div className="font-bold text-sm text-white">{p.profiles.username}</div>
  <div className="text-xs text-gray-400">ELO: {p.profiles.elo}</div>
</div>
```

With:
```tsx
<div>
  <div className="font-bold text-sm text-white">{p.profiles.username}</div>
  <div className="flex gap-3 text-xs text-gray-400">
    <span>ELO: {p.profiles.elo}</span>
    <span className="text-emerald-400">V: {p.profiles.wins || 0}</span>
    <span className="text-red-400">D: {p.profiles.losses || 0}</span>
    <span className="text-blue-400">PJ: {p.matches_played || 0}</span>
  </div>
</div>
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: Vite builds without errors.

- [ ] **Step 5: Commit**

```bash
git add src/web/components/AdminPanel.tsx
git commit -m "feat: enhance participants modal with wins/losses/match count"
```

---

## Self-Review Checklist

1. **Spec coverage:** All 4 features from the spec have corresponding phases with concrete tasks.
2. **Placebo check:** Every step has actual code or exact commands. No TBD, TODO, or hand-waving.
3. **Type consistency:** `processTournamentAdvancement` signature matches between service and index.ts. `notifyTournamentPlayers` receives `io` and `rooms` as parameters. Methods in test match actual exports.
4. **Scope check:** Each phase is focused on one concern. No unrelated changes.
