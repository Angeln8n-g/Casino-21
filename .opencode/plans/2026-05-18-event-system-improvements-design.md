# Event System Improvements — Design Spec

**Date:** 2026-05-18

## Overview

Four independent features to improve the event/tournament system:
1. Global frontend handler for auto-start (`event_started`) + toast/sound notification
2. Enhanced admin participants view with wins/losses stats
3. Server test infrastructure + tournament logic extraction
4. Auto-complete events when `end_date` passes

---

## Feature 1: Global `event_started` Handler + Toast/Sound

### Problem
The server emits `event_started` (line 1492 of `server/src/index.ts`) when the scheduler auto-starts an event, but no frontend code listens for it.

### Solution
Add a global socket listener in `App.tsx`:

- **Socket listener:** `socket.on('event_started', ...)` on mount
- **Toast:** Simple inline toast component in `App.tsx` (not coupled to `useNotifications`), auto-dismiss at 10s
  - Content: `"🎲 Evento [title] ha comenzado automáticamente"`
- **Sound:** `playSfx('alert')` via `useAudio`
- **AdminPanel refresh:** Emit a custom DOM event or use a callback so the AdminPanel event table updates in real-time when an admin is viewing it

### Not in scope
- No integration with `useNotifications` (designed for friend requests/invites)
- No persistent notification list
- No `event_completed` toast (handled separately in Feature 4)

---

## Feature 2: Enhanced Participants View

### Problem
The AdminPanel participants modal shows avatar, username, and ELO but not wins/losses or per-event participation stats.

### Solution
Enhance `handleViewParticipants` in `AdminPanel.tsx`:

- Expand Supabase query to include `profiles.wins` and `profiles.losses`
- Add `matches_played` count per player: count of `tournament_matches` for this event where `player1_id` or `player2_id` matches
- Render columns in the modal table: Avatar, Username, ELO, Wins, Losses, Matches (in this event), Actions (kick)

No additional fields, no search, no filtering. Minimal change.

### Files
- `src/web/components/AdminPanel.tsx` — `handleViewParticipants`, modal `<table>` columns

---

## Feature 3: Server Tests

### Problem
`server/` has no test infrastructure. Tournament logic (~1500 lines in `server/src/index.ts`) is untested and difficult to extract because it's coupled with the monolithic server file.

### Solution

#### 3a. Extract tournament service module
Create `server/src/tournament-service.ts`:
- Move `handleTournamentFinal()` from `server/src/index.ts`
- Move the BO3 series advancement logic (counting wins, determining next `series_game`)
- Move `findNextMatchForWinner()` / bracket advancement logic

The extracted functions receive typed inputs and return typed outputs. They call Supabase and Socket.io through injected or imported references (same pattern as current code, but isolated).

#### 3b. Test infrastructure
- Add `jest`, `ts-jest`, `@types/jest` to `server/package.json` (devDependencies)
- Create `server/jest.config.js`
- Create `server/tsconfig.test.json` (extends `tsconfig.json`, adds `types: ["jest", "node"]`, sets `rootDir: "."`)
- Update `server/package.json` test script to `"jest"`

#### 3c. Tests to write
Files in `server/tests/`:

1. **`tournament-advancement.test.ts`** — BO3 series win counting, determining advancement
2. **`tournament-final.test.ts`** — `handleTournamentFinal` scenarios (normal win, edge cases)
3. **`scheduler.test.ts`** — `checkScheduledEvents` logic (date comparison, status update)

Supabase calls are mocked at the module level. Socket.io `io.emit` is a simple spy.

---

## Feature 4: Auto-Complete Events

### Problem
Events stay `'live'` forever after the tournament ends. Admin must manually click "Finalizar". Also, scheduled events with an `end_date` never auto-complete.

### Solution
Extend `checkScheduledEvents` in `server/src/index.ts` to also handle completion:

```typescript
// Existing: auto-start upcoming events
const { data: startedEvents } = await supabase
  .from('events')
  .update({ status: 'live' })
  .eq('status', 'upcoming')
  .lte('start_date', new Date().toISOString())
  .select('id, title');

// New: auto-complete live events past end_date
const { data: completedEvents } = await supabase
  .from('events')
  .update({ status: 'completed' })
  .eq('status', 'live')
  .lte('end_date', new Date().toISOString())
  .select('id, title');
```

Both queries emit socket events (`event_started` and `event_completed`).

### Frontend
Add `socket.on('event_completed', ...)` in the same `App.tsx` effect from Feature 1:
- Toast: `"✅ Evento [title] ha finalizado"` (auto-dismiss 10s)

### Not in scope
- `handleTournamentFinal` does NOT set `completed` — the `end_date` is the single trigger
- No prize distribution on auto-complete (prizes already handled by `handleTournamentFinal`)

---

## Independence & Ordering

These are independent and can be implemented in any order. Recommended order:

1. **Feature 3a** (extract tournament service) — enables Feature 3c
2. **Feature 3b+3c** (test infra + tests)
3. **Feature 4** (auto-complete, backend + frontend)
4. **Feature 1** (global event_started handler)
5. **Feature 2** (participants view enhancement)

Feature 3 first because extracting the tournament service makes the server cleaner and safer for subsequent changes. Features 4 and 1 share the same socket listener pattern and could be done together.
