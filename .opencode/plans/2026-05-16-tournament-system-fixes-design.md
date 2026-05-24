# Tournament System Fixes — Design Spec

## Problem Summary

The tournament (events-based) system has 7 identified issues across backend, frontend, and database layers. Full analysis: see brainstorming session 2026-05-16.

---

## 1. Server-side Winner Advancement (CRITICAL)

### Problem
`server/src/index.ts:1151` queries `next_match_id` from `tournament_matches` but this column was **never added to the schema** (`database/database-migration-events-phase2.sql`). The query returns undefined, making automatic winner advancement completely broken. The system relies entirely on manual admin intervention via `AdminPanel.tsx:342-416` which uses `round_number + match_order` math instead.

### Solution
Replace `next_match_id`-based logic with `round_number + match_order` calculation, matching what the admin panel already uses.

#### Server changes (`server/src/index.ts`, lines 1147-1199)

**Before (broken):**
```typescript
if (isTournament && winnerId) {
  const { data: matchData } = await supabase
    .from('tournament_matches')
    .select('id, event_id, next_match_id, status') // next_match_id doesn't exist
    .eq('game_room_id', roomId)
    .single();

  if (matchData.next_match_id) { // always false
    // advance via next_match_id — never reached
  } else {
    // treats every match as final — wrong for non-finals
  }
}
```

**After:**
```typescript
if (isTournament && winnerId) {
  const { data: matchData } = await supabase
    .from('tournament_matches')
    .select('id, event_id, round_number, match_order, status')
    .eq('game_room_id', roomId)
    .single();

  if (!matchData || matchData.status === 'completed') return;

  // 1. Mark current match as completed
  await supabase.from('tournament_matches')
    .update({ winner_id: winnerId, status: 'completed' })
    .eq('id', matchData.id);

  // 2. Calculate next match position
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
    // 3. Fill the correct slot (odd orders → player1, even → player2)
    const updateData: Record<string, any> = {};
    if (matchData.match_order % 2 !== 0) {
      updateData.player1_id = winnerId;
    } else {
      updateData.player2_id = winnerId;
    }

    await supabase.from('tournament_matches')
      .update(updateData)
      .eq('id', nextMatch.id);

    // 4. If next match now has both players, emit tournament_ready
    if (nextMatch.player1_id && nextMatch.player2_id) {
      // Both already assigned → notify both players
      notifyTournamentPlayers(nextMatch.game_room_id, matchData.event_id);
    } else {
      // Only one player assigned, check if this filled the last slot
      const filledSlot = matchData.match_order % 2 !== 0 ? 'player1_id' : 'player2_id';
      const otherSlot = filledSlot === 'player1_id' ? 'player2_id' : 'player1_id';
      if (nextMatch[otherSlot]) {
        notifyTournamentPlayers(nextMatch.game_room_id, matchData.event_id);
      }
    }
  } else {
    // No next match → this is the final. Award prize.
    handleTournamentFinal(matchData, winnerId);
  }
}
```

**New helper function:**
```typescript
function notifyTournamentPlayers(gameRoomId: string, eventId: string) {
  // Find all sockets for players in the given game room
  for (const [rid, room] of Object.entries(rooms)) {
    if (rid !== gameRoomId) continue;
    for (const player of room.players) {
      const socket = io.sockets.sockets.get(player.socketId);
      if (socket) {
        socket.emit('tournament_ready', { gameRoomId, eventId });
      }
    }
  }
}
```

**Note:** `notifyTournamentPlayers` iterates rooms to find sockets by gameRoomId. This works because tournament rooms are created when players join. When the match hasn't started yet (room doesn't exist), the notification is simply not sent — the bracket modal's real-time subscription will still update the view.

### Key invariant
The `round_number` + `match_order` math **must match** the bracket generation in `AdminPanel.tsx:174-211`:
- Round 4 = Final, Round 3 = Semis, Round 2 = Cuartos, Round 1 = Octavos, Round 0 = 16avos
- `nextRound = round_number + 1`, `nextOrder = Math.ceil(match_order / 2)`

---

## 2. Match Status Lifecycle (CRITICAL)

### Problem
The server never updates `tournament_matches.status` when both players join the room. The DB status stays `pending` throughout gameplay. The bracket UI has no way to show a match as "in progress" or "live".

### Solution

#### Status flow
```
pending → playing (when both players in room) → completed (when game ends)
```

#### Server change (`server/src/index.ts`, in `join_room` handler, ~line 581)

When `room.players.length === room.maxPlayers` and `room.isTournament`, after the escrow phase and before starting the game:

```typescript
if (room.isTournament) {
  await supabase.from('tournament_matches')
    .update({ status: 'playing' })
    .eq('game_room_id', roomId);
}
```

**Note:** This is a fire-and-forget update. If it fails, the game still works — the bracket just won't show "live" status.

---

## 3. Real-time Bracket Updates (HIGH)

### Problem
`EventsPage.tsx` has no subscription to `tournament_matches`. When a match completes or an admin advances a player, the bracket view is stale until the user manually closes and reopens the modal.

### Solution

Add a Supabase real-time subscription when the bracket modal opens.

#### EventsPage.tsx changes (in `handleViewBracket`)

```typescript
const [bracketChannel, setBracketChannel] = useState<RealtimeChannel | null>(null);

const handleViewBracket = async (eventId, ...) => {
  // ... existing fetch logic ...

  // Subscribe to changes
  const channel = supabase
    .channel(`bracket-${eventId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tournament_matches',
      filter: `event_id=eq.${eventId}`
    }, () => {
      fetchBracketData(eventId); // re-fetch and update state
    })
    .subscribe();

  setBracketChannel(channel);
};

// Cleanup on modal close
const closeBracketModal = () => {
  if (bracketChannel) {
    supabase.removeChannel(bracketChannel);
    setBracketChannel(null);
  }
  setBracketModalOpen(false);
};
```

#### fetchBracketData extraction
Extract the bracket data fetching + profile resolution logic from `handleViewBracket` into a reusable `fetchBracketData(eventId)` function so the subscription callback can call it.

---

## 4. Player Notification on Advancement (HIGH)

### Problem
When the server advances a winner to the next round, the player has no way of knowing they need to play.

### Solution

#### Server: `notifyTournamentPlayers` (see section 1)
Emits `tournament_ready` to both players' sockets when the next match has both players assigned.

#### Frontend: new listener in `MainMenu.tsx`

```typescript
socket.on('tournament_ready', (data: { gameRoomId: string; eventId: string }) => {
  // Show toast/banner
  showNotification('¡Avanzaste a la siguiente ronda!');
  
  // Store pending match info
  setPendingTournamentMatch(data);
});
```

#### Frontend: pending match banner
Show a persistent banner in the lobby: **"¡Avanzaste a la siguiente ronda! — Unirse a la partida"**. When clicked, dispatches `join_game_from_invite` with `gameRoomId` and `isTournament: true`.

---

## 5. Status Mapping Cleanup (MEDIUM)

### Problem
`EventsPage.tsx:285` casts DB status with `as any`, bypassing type safety. The DB uses `pending|ready|playing|completed|no_show` but the component expects `pending|live|completed`.

### Solution

#### EventsPage.tsx: add mapping function

```typescript
function mapMatchStatus(dbStatus: string): TournamentMatch['status'] {
  switch (dbStatus) {
    case 'ready':
    case 'playing':
      return 'live';
    case 'no_show':
    case 'completed':
      return 'completed';
    case 'pending':
    default:
      return 'pending';
  }
}
```

#### TournamentBracket.tsx: update `canJoin` logic

Current:
```typescript
const canJoin = (match.status === 'pending' || match.status === 'live') && ...;
```

Updated (more robust):
```typescript
const canJoin = match.status !== 'completed' && isPlayerInMatch && match.player1 && match.player2;
```

---

## 6. TournamentList Legacy Component (LOW)

### Problem
`src/web/components/TournamentList.tsx` queries the old `tournaments` table, separate from the `events`-based system.

### Solution
Add a `@deprecated` comment. No code changes.

---

## 7. Spectator Disconnect Bug (CRITICAL)

### Problem
When a spectator disconnects, the `disconnect` handler emits `player_disconnected` to the entire room. The frontend shows a blocking overlay that never clears.

### Solution

#### Server change (`server/src/index.ts`, lines 956-966)

```typescript
socket.on('disconnect', () => {
  matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);
  const roomId = socketToRoomMap.get(socket.id);
  socketToRoomMap.delete(socket.id);
  actionTimestamps.delete(socket.id);
  
  if (roomId) {
    const room = rooms[roomId];
    if (!room) return;
    
    // Spectator check
    const spectatorIndex = room.spectators.findIndex(s => s.socketId === socket.id);
    if (spectatorIndex !== -1) {
      room.spectators.splice(spectatorIndex, 1);
      return; // Don't emit player_disconnected
    }
    
    // Player disconnected
    io.to(roomId).emit('player_disconnected', { 
      userId, 
      message: 'El oponente se ha desconectado. Esperando reconexión...' 
    });
    
    if (!room.state) {
      closeRoom(roomId, 'creator_disconnected');
    }
  }
});
```

#### Frontend safety (`src/web/hooks/useGame.tsx`)

Add 30s auto-clear timeout:
```typescript
const [disconnectTimer, setDisconnectTimer] = useState<NodeJS.Timeout | null>(null);

socket.on('player_disconnected', ({ message }) => {
  setDisconnectionMessage(message);
  const t = setTimeout(() => setDisconnectionMessage(null), 30000);
  setDisconnectTimer(t);
});

socket.on('player_reconnected', () => {
  setDisconnectionMessage(null);
  if (disconnectTimer) clearTimeout(disconnectTimer);
});
```

---

## Files Changed Summary

| # | File | Change | Lines |
|---|------|--------|-------|
| 1 | `server/src/index.ts` | Advancement logic rewrite (next_match_id → round calc) + helper functions | ~1147-1233 |
| 2 | `server/src/index.ts` | Add `status: 'playing'` update when 2nd player joins | ~581 |
| 3 | `server/src/index.ts` | Spectator detection in disconnect handler | ~950-966 |
| 4 | `src/web/components/EventsPage.tsx` | Real-time subscription + mapMatchStatus + extract fetchBracketData | ~224-293 |
| 5 | `src/web/components/TournamentBracket.tsx` | Update `canJoin` to not rely on specific status strings | ~54 |
| 6 | `src/web/components/MainMenu.tsx` | Add `tournament_ready` socket listener + banner | ~140-156 |
| 7 | `src/web/hooks/useGame.tsx` | Add 30s auto-clear timeout for disconnect message | ~72-77 |
| 8 | `src/web/components/TournamentList.tsx` | Add deprecation comment | ~1 |

## Not in Scope

- Moving bracket generation from client (AdminPanel) to server: large refactor, deferred.
- Adding `next_match_id` column to DB: superseded by round-based calculation.
- Removing legacy `tournaments` table: cleanup for future pass.
- Tournament tests: deferred but strongly recommended.

## Testing Checklist

- [ ] Create event → enroll 4+ players → generate bracket → verify bracket structure
- [ ] First match: both players join → play → verify winner advances to next round automatically
- [ ] Second match completes → verify semi-final shows both advanced players
- [ ] Semi-final completes → verify final has winner → verify prize awarded
- [ ] Join as spectator → disconnect → verify NO disconnect overlay on players' screens
- [ ] Player disconnects → verify disconnect overlay appears → reconnects → overlay clears
- [ ] Admin manually advances winner → verify bracket auto-refreshes in modal
- [ ] Verify `live` status shows correctly in bracket UI (green/red glow)
