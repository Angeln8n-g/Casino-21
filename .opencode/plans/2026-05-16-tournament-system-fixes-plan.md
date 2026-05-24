# Tournament System Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 bugs in the tournament system: winner advancement, status lifecycle, spectator disconnect, real-time bracket, status mapping, player notification, and legacy cleanup.

**Architecture:** Server-side patching of `server/src/index.ts` (disconnect handler, match completion advancement, status updates) plus frontend subscription/listener additions in EventsPage, MainMenu, TournamentBracket, and useGame hook.

**Tech Stack:** TypeScript (Node.js + React), Socket.io, Supabase (realtime subscriptions + RPCs)

---

### Task 1: Fix Server-Side Winner Advancement (CRITICAL)

**Files:**
- Modify: `server/src/index.ts:1146-1233`

- [ ] **Step 1: Replace the broken next_match_id logic with round_number + match_order calculation**

Replace lines 1146-1233 (from `// Si es torneo, avanzar llave` up to the closing `}` before `} catch (error) {`) with the following:

```typescript
    // Si es torneo, avanzar llave
    if (isTournament && winnerId) {
      console.log(`[Torneo] Procesando avance de torneo para la sala ${roomId}. Ganador: ${winnerId}`);
      const { data: matchData, error: matchError } = await supabase
        .from('tournament_matches')
        .select('id, event_id, round_number, match_order, status')
        .eq('game_room_id', roomId)
        .single();

      if (matchError) {
        console.error(`[Torneo] Error buscando tournament_match asociado a la sala ${roomId}:`, matchError);
      }

      if (!matchError && matchData) {
        if (matchData.status === 'completed') {
          console.log(`[Torneo] Match ${matchData.id} ya estaba completado. Saltando reprocesamiento.`);
          return;
        }

        console.log(`[Torneo] Actualizando status a 'completed' para el match ${matchData.id}`);
        await supabase.from('tournament_matches')
          .update({ winner_id: winnerId, status: 'completed' })
          .eq('id', matchData.id);

        // Calcular siguiente match usando round_number + match_order
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

          const { error: advanceError } = await supabase
            .from('tournament_matches')
            .update(updateData)
            .eq('id', nextMatch.id);

          if (advanceError) {
            console.error(`[Torneo] Error avanzando jugador ${winnerId} a la siguiente ronda:`, advanceError);
          } else {
            console.log(`[Torneo] Jugador ${winnerId} avanzado a ronda ${nextRound}, match ${nextMatch.id}`);

            // Verificar si el siguiente match ya tiene ambos jugadores
            const filledSlot = matchData.match_order % 2 !== 0 ? 'player1_id' : 'player2_id';
            const otherSlot = filledSlot === 'player1_id' ? 'player2_id' : 'player1_id';

            if (nextMatch[otherSlot]) {
              // Ambos jugadores están listos — notificar
              notifyTournamentPlayers(nextMatch.game_room_id, matchData.event_id);
            }
          }
        } else {
          // No hay siguiente ronda → final del torneo, entregar premio
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
      }
    }
```

- [ ] **Step 2: Add the `notifyTournamentPlayers` helper function**

Add after the `closeRoom` function (after line 305) and before the `scheduleBotTurnIfNeeded` function (before line 307):

```typescript
function notifyTournamentPlayers(gameRoomId: string, eventId: string) {
  for (const [roomId, room] of Object.entries(rooms)) {
    for (const player of room.players) {
      const playerSocket = io.sockets.sockets.get(player.socketId);
      if (playerSocket) {
        playerSocket.emit('tournament_ready', {
          gameRoomId,
          eventId
        });
        console.log(`[Torneo] Notificación tournament_ready enviada a ${player.name} (sala ${gameRoomId})`);
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "fix: replace broken next_match_id with round_number advancement in tournaments"
```

---

### Task 2: Add match status = 'playing' when game starts (CRITICAL)

**Files:**
- Modify: `server/src/index.ts:688-693`

- [ ] **Step 1: Add tournament status update when game starts**

After line 688 (`startTurnTimer(roomId, room);`) and before line 691 (`broadcastGameState(roomId, room);`), add:

```typescript
        // Actualizar status del match de torneo a 'playing'
        if (room.isTournament) {
          supabase.from('tournament_matches')
            .update({ status: 'playing' })
            .eq('game_room_id', roomId)
            .then(({ error }) => {
              if (error) console.warn(`[Torneo] No se pudo actualizar status a playing para ${roomId}:`, error.message);
            });
        }
```

(Use `.then()` with `.catch()` instead of await to avoid blocking game start)

- [ ] **Step 2: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: update tournament match status to playing when game starts"
```

---

### Task 3: Fix Spectator Disconnect Bug (CRITICAL)

**Files:**
- Modify: `server/src/index.ts:950-964`

- [ ] **Step 1: Add spectator detection in disconnect handler**

Replace the disconnect handler (lines 950-964):

```typescript
  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);
    const roomId = socketToRoomMap.get(socket.id);
    socketToRoomMap.delete(socket.id);
    actionTimestamps.delete(socket.id);
    if (roomId) {
      const room = rooms[roomId];
      if (!room) return;

      // Verificar si es un espectador que se desconectó
      const spectatorIndex = room.spectators.findIndex(s => s.socketId === socket.id);
      if (spectatorIndex !== -1) {
        room.spectators.splice(spectatorIndex, 1);
        console.log(`Espectador ${socket.id} eliminado de sala ${roomId}`);
        return;
      }

      // Es un jugador — notificar a la sala
      io.to(roomId).emit('player_disconnected', { 
        userId: userId, 
        message: 'El oponente se ha desconectado. Esperando reconexión...' 
      });
      if (!room.state) {
        closeRoom(roomId, 'creator_disconnected');
      }
    }
  });
```

- [ ] **Step 2: Commit**

```bash
git add server/src/index.ts
git commit -m "fix: don't emit player_disconnected when spectator disconnects from tournament"
```

---

### Task 4: Real-time Bracket Updates + Status Mapping (HIGH)

**Files:**
- Modify: `src/web/components/EventsPage.tsx:188-293`

- [ ] **Step 1: Add bracket channel state variable**

After line 195 (`const [now, setNow] = useState(() => Date.now());`), add:

```typescript
  const [bracketChannel, setBracketChannel] = useState<any>(null);
```

- [ ] **Step 2: Add `mapMatchStatus` helper function**

Add after line 193 (after `const [now, setNow]...`) and before `const handleJoinMatch` (line 202):

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

- [ ] **Step 3: Extract `fetchBracketData` function**

Add after `mapMatchStatus` (before `handleJoinMatch`):

```typescript
  const fetchBracketData = async (eventId: string) => {
    const { data, error } = await supabase
      .from('tournament_matches')
      .select(`
        id, round_number, match_order, status, winner_id,
        player1_id,
        player2_id,
        game_room_id
      `)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching matches:', error);
      return;
    }
    if (!data) return;

    const playerIds = Array.from(new Set(data.flatMap(m => [m.player1_id, m.player2_id]).filter(Boolean)));
    
    let profiles: Record<string, any> = {};
    if (playerIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, equipped_avatar')
        .in('id', playerIds);
        
      if (profilesError) {
        logger.error('Error fetching profiles:', profilesError);
      }
        
      if (profilesData) {
        profilesData.forEach(p => {
          profiles[p.id] = p;
        });
      }
    }

    const mappedMatches: TournamentMatch[] = data.map(m => {
      const p1 = m.player1_id ? profiles[m.player1_id] : null;
      const p2 = m.player2_id ? profiles[m.player2_id] : null;
      
      return {
        id: m.id,
        round: m.round_number,
        position: m.match_order,
        player1: p1 ? { id: p1.id, name: p1.username || 'Desconocido', avatar: p1.equipped_avatar || p1.avatar_url, isWinner: m.winner_id === p1.id } : null,
        player2: p2 ? { id: p2.id, name: p2.username || 'Desconocido', avatar: p2.equipped_avatar || p2.avatar_url, isWinner: m.winner_id === p2.id } : null,
        status: mapMatchStatus(m.status),
        game_room_id: m.game_room_id
      };
    });
    setTournamentMatches(mappedMatches);
  };
```

- [ ] **Step 4: Replace `handleViewBracket` to use `fetchBracketData` and add subscription**

Replace lines 224-293 (the entire `handleViewBracket` function):

```typescript
  const handleViewBracket = async (eventId: string, title: string, maxParticipants: number, imageUrl?: string, audioUrl?: string) => {
    setSelectedTournament(title);
    setSelectedTournamentMaxParticipants(maxParticipants || 16);
    setSelectedTournamentImage(imageUrl);
    const event = events.find(e => e.id === eventId);
    setSelectedTournamentPrize(event?.prize_pool);
    setBracketModalOpen(true);
    setMatchesLoading(true);

    if (audioUrl) {
      startUrlLoop('event-bracket-audio', audioUrl);
    }

    await fetchBracketData(eventId);
    setMatchesLoading(false);

    // Subscribe to real-time changes on tournament_matches for this event
    const channel = supabase
      .channel(`bracket-${eventId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_matches',
        filter: `event_id=eq.${eventId}`
      }, () => {
        fetchBracketData(eventId);
      })
      .subscribe();

    setBracketChannel(channel);
  };
```

- [ ] **Step 5: Update bracket modal close to clean up subscription**

Find the bracket modal close (line 610): `onClick={() => { setBracketModalOpen(false); stopLoop('event-bracket-audio'); }}` — replace with:

```typescript
onClick={() => {
  setBracketModalOpen(false);
  stopLoop('event-bracket-audio');
  if (bracketChannel) {
    supabase.removeChannel(bracketChannel);
    setBracketChannel(null);
  }
}}
```

And in the same modal's header close button (line 629-638), update the `onClick` similarly:

```typescript
onClick={() => {
  setBracketModalOpen(false);
  stopLoop('event-bracket-audio');
  if (bracketChannel) {
    supabase.removeChannel(bracketChannel);
    setBracketChannel(null);
  }
}}
```

Also update the footer close button at line 662-670 similarly:

```typescript
onClick={() => {
  setBracketModalOpen(false);
  stopLoop('event-bracket-audio');
  if (bracketChannel) {
    supabase.removeChannel(bracketChannel);
    setBracketChannel(null);
  }
}}
```

- [ ] **Step 6: Commit**

```bash
git add src/web/components/EventsPage.tsx
git commit -m "feat: add real-time bracket updates and fix status mapping in tournament bracket"
```

---

### Task 5: Fix canJoin Logic in TournamentBracket (MEDIUM)

**Files:**
- Modify: `src/web/components/TournamentBracket.tsx:54`

- [ ] **Step 1: Update canJoin to not rely on specific status strings**

Replace line 54:

```typescript
  const canJoin = (match.status === 'pending' || match.status === 'live') && isPlayerInMatch && match.player1 && match.player2;
```

With:

```typescript
  const canJoin = match.status !== 'completed' && isPlayerInMatch && match.player1 && match.player2;
```

- [ ] **Step 2: Commit**

```bash
git add src/web/components/TournamentBracket.tsx
git commit -m "fix: update canJoin logic to work with all non-completed match statuses"
```

---

### Task 6: Add tournament_ready Listener + Notification in MainMenu (HIGH)

**Files:**
- Modify: `src/web/components/MainMenu.tsx:33-366` (state + listener + cleanup)

- [ ] **Step 1: Add pending tournament match state**

After line 74 (`const [linkCopied, setLinkCopied] = useState(false);`), add:

```typescript
  const [pendingTournamentMatch, setPendingTournamentMatch] = useState<{gameRoomId: string; eventId: string} | null>(null);
```

- [ ] **Step 2: Add tournament_ready listener in setupSocket**

After the `match_found` handler (after line 341, before the line 342 comment `// ─── FIN FASE 8 ───`), add:

```typescript
        socket.on('tournament_ready', (data: { gameRoomId: string; eventId: string }) => {
          setPendingTournamentMatch(data);
          setTimeout(() => setPendingTournamentMatch(null), 30000);
        });
```

- [ ] **Step 3: Add cleanup in socket off section**

In the socket.off cleanup (around lines 355-364), add:

```typescript
socket.off('tournament_ready');
```

After line 359 (`socket.off('room_closed');`):

```typescript
        socket.off('tournament_ready');
```

- [ ] **Step 4: Add notification banner in the UI**

After the error display (line 905), add the tournament notification banner:

```typescript
          {/* Tournament Notification */}
          {pendingTournamentMatch && (
            <div className="bg-casino-gold/10 text-casino-gold p-3 rounded-xl text-center text-sm border border-casino-gold/30 animate-slide-down font-medium cursor-pointer hover:bg-casino-gold/20 transition-colors"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('join_game_from_invite', {
                  detail: { roomId: pendingTournamentMatch.gameRoomId, isTournament: true, isSpectator: false }
                }));
                setPendingTournamentMatch(null);
              }}
            >
              <span className="mr-1">🏆</span>
              ¡Avanzaste a la siguiente ronda! — Haz clic para unirte a tu partida
            </div>
          )}
```

- [ ] **Step 5: Commit**

```bash
git add src/web/components/MainMenu.tsx
git commit -m "feat: add tournament_ready socket listener with notification banner"
```

---

### Task 7: Add 30s Auto-Clear for Disconnect Message (HIGH)

**Files:**
- Modify: `src/web/hooks/useGame.tsx:41,72-77`

- [ ] **Step 1: Add disconnect timer ref**

After line 41 (`const [disconnectionMessage, setDisconnectionMessage] = useState<string | null>(null);`), add:

```typescript
  const disconnectTimerRef = React.useRef<NodeJS.Timeout | null>(null);
```

- [ ] **Step 2: Update player_disconnected handler with auto-clear timeout**

Replace lines 72-77:

```typescript
      socket.on('player_disconnected', ({ message }: { message: string }) => {
        setDisconnectionMessage(message);
      });
      socket.on('player_reconnected', () => {
        setDisconnectionMessage(null);
      });
```

With:

```typescript
      socket.on('player_disconnected', ({ message }: { message: string }) => {
        setDisconnectionMessage(message);
        if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = setTimeout(() => {
          setDisconnectionMessage(null);
        }, 30000);
      });
      socket.on('player_reconnected', () => {
        setDisconnectionMessage(null);
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
      });
```

- [ ] **Step 3: Add cleanup in the cleanup section of bindSocketEvents**

Find the cleanup in bindSocketEvents where `socket.off('player_disconnected')` is called (line 54): add timer cleanup right after the `.off` lines or in the effect cleanup.

Add after line 62 (`socket.off('stats_updated');`):

```typescript
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
```

- [ ] **Step 4: Commit**

```bash
git add src/web/hooks/useGame.tsx
git commit -m "fix: add 30s auto-clear timeout for player disconnect message"
```

---

### Task 8: Mark TournamentList as Deprecated (LOW)

**Files:**
- Modify: `src/web/components/TournamentList.tsx:1` (add comment)

- [ ] **Step 1: Add deprecation comment**

Add at the very top of the file (before the imports):

```typescript
/**
 * @deprecated This component uses the legacy `tournaments` table.
 * The current tournament system uses the `events` table.
 * See `src/web/components/EventsPage.tsx` and `src/web/components/TournamentBracket.tsx`.
 */
```

- [ ] **Step 2: Commit**

```bash
git add src/web/components/TournamentList.tsx
git commit -m "docs: mark TournamentList as deprecated (uses legacy tournaments table)"
```

---

### Task 9: Build and Verify

**Files:** None (verification only)

- [ ] **Step 1: Build the backend**

```bash
cd server && npm run build
```
Expected: No TypeScript compilation errors.

- [ ] **Step 2: Run existing tests to verify no regressions**

```bash
npm test
```
Expected: All existing tests pass.

- [ ] **Step 3: Lint styles**

```bash
npx stylelint "src/web/**/*.css"
```
Expected: No new linting errors introduced.

- [ ] **Step 4: Commit final verification**

```bash
git add -A
git commit -m "chore: final verification after tournament fixes"
```
