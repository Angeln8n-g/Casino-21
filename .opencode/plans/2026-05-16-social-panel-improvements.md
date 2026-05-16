# SocialPanel Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the SocialPanel with realtime online status, haptic feedback, mobile-friendly chat button, quick challenge from friend list, sorted/searchable friend list, Escape key modal close, and deterministic Supabase channel names.

**Architecture:** All changes are scoped to `src/web/components/SocialPanel.tsx` with one new utility hook. No backend changes needed — leverages existing Supabase realtime, existing challenge/invitation system, and existing haptics utility.

**Tech Stack:** React 19, Supabase realtime, Vibration API (triggerHaptic), TypeScript, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/web/hooks/useProfilePresence.ts` | **Create** | Custom hook: subscribes to `profiles` table changes via Supabase realtime, returns online status map |
| `src/web/components/SocialPanel.tsx` | **Modify** | All 8 improvements: replace polling with hook, add haptics, fix mobile chat button, add quick challenge, sort/filter friends, Escape key, deterministic channels |

---

### Task 1: Create `useProfilePresence` hook (realtime online status)

**Files:**
- Create: `src/web/hooks/useProfilePresence.ts`
- Modify: `src/web/components/SocialPanel.tsx` (remove polling, import hook)

- [ ] **Step 1: Create the hook file**

```typescript
// src/web/hooks/useProfilePresence.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

const ONLINE_WINDOW_MS = 45_000;

interface ProfilePresence {
  id: string;
  last_seen_at: string | null;
  current_room_id: string | null;
}

interface UseProfilePresenceResult {
  /** Map of friend ID → { isOnline, isInRoom } */
  presenceMap: Record<string, { isOnline: boolean; isInRoom: boolean }>;
  /** Refresh presence for a specific set of friend IDs */
  refreshPresence: (ids: string[]) => Promise<void>;
}

export function useProfilePresence(friendIds: string[]): UseProfilePresenceResult {
  const [profiles, setProfiles] = useState<ProfilePresence[]>([]);

  const refreshPresence = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setProfiles([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, last_seen_at, current_room_id')
      .in('id', ids);
    if (data) setProfiles(data);
  }, []);

  useEffect(() => {
    refreshPresence(friendIds);
  }, [friendIds.join(','), refreshPresence]);

  useEffect(() => {
    if (friendIds.length === 0) return;

    const channel = supabase
      .channel(`profile_presence_${friendIds.slice(0, 3).join('_')}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const updated = payload.new as { id: string; last_seen_at: string | null; current_room_id: string | null };
          if (friendIds.includes(updated.id)) {
            setProfiles((prev) => {
              const idx = prev.findIndex((p) => p.id === updated.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = updated;
                return next;
              }
              return [...prev, updated];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [friendIds.join(',')]);

  const presenceMap: Record<string, { isOnline: boolean; isInRoom: boolean }> = {};
  for (const p of profiles) {
    const ts = p.last_seen_at ? Date.parse(p.last_seen_at) : 0;
    const isOnline = Number.isFinite(ts) && Date.now() - ts <= ONLINE_WINDOW_MS;
    presenceMap[p.id] = {
      isOnline,
      isInRoom: isOnline && !!p.current_room_id,
    };
  }

  return { presenceMap, refreshPresence };
}
```

- [ ] **Step 2: Remove polling useEffect from SocialPanel**

In `SocialPanel.tsx`, remove lines 107-113:
```typescript
// DELETE this entire block:
useEffect(() => {
  if (!user) return;
  const intervalId = window.setInterval(() => {
    fetchFriends();
  }, 10_000);
  return () => window.clearInterval(intervalId);
}, [user, fetchFriends]);
```

- [ ] **Step 3: Integrate the hook into SocialPanel**

Add import at top:
```typescript
import { useProfilePresence } from '../hooks/useProfilePresence';
```

After `const [friendUnreadMap, setFriendUnreadMap] = useState<Record<string, number>>({});`, add:
```typescript
const friendIds = friends.map((f) => f.id);
const { presenceMap, refreshPresence } = useProfilePresence(friendIds);
```

- [ ] **Step 4: Update `isFriendOnline` to use presenceMap**

Replace the `isFriendOnline` callback:
```typescript
const isFriendOnline = useCallback(
  (friend: Friend) => {
    const presence = presenceMap[friend.id];
    if (presence) return presence.isOnline;
    // Fallback to local data if presence not yet loaded
    if (!friend.last_seen_at) return false;
    const ts = Date.parse(friend.last_seen_at);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts <= ONLINE_WINDOW_MS;
  },
  [presenceMap]
);
```

- [ ] **Step 5: Update `isInRoom` logic in friend list rendering**

In the friend list render (around line 472), replace:
```typescript
const roomId = friend.current_room_id;
const isInRoom = !!roomId;
```
with:
```typescript
const presence = presenceMap[friend.id];
const isInRoom = presence?.isInRoom ?? !!friend.current_room_id;
```

---

### Task 2: Add haptic feedback to SocialPanel interactions

**Files:**
- Modify: `src/web/components/SocialPanel.tsx`

- [ ] **Step 1: Import triggerHaptic**

Add to imports:
```typescript
import { triggerHaptic } from '../utils/haptics';
```

- [ ] **Step 2: Add haptics to tab switches**

Replace each tab button `onClick`:
```typescript
onClick={() => { triggerHaptic('light'); setActiveTab('friends'); }}
onClick={() => { triggerHaptic('light'); setActiveTab('search'); }}
onClick={() => { triggerHaptic('light'); setActiveTab('chat'); }}
```

- [ ] **Step 3: Add haptics to friend interactions**

In the friend list item, add to the avatar/name click handlers:
```typescript
onClick={() => { triggerHaptic('card_tap'); openFriendModal(friend); }}
```

In the chat button:
```typescript
onClick={() => {
  triggerHaptic('card_tap');
  setActiveChatFriendId(friend.id);
  setActiveTab('chat');
}}
```

In the pending request click:
```typescript
onClick={() => { triggerHaptic('card_tap'); setSelectedRequest(req); }}
```

---

### Task 3: Fix chat button visibility on mobile

**Files:**
- Modify: `src/web/components/SocialPanel.tsx`

- [ ] **Step 1: Replace opacity-0 group-hover pattern**

In the chat button (around line 546-557), replace:
```typescript
className="shrink-0 p-2 rounded-lg bg-white/5 text-gray-400 hover:text-casino-gold hover:bg-casino-gold/10 hover:border-casino-gold/30 border border-transparent transition-all opacity-0 group-hover:opacity-100 shadow-sm"
```
with:
```typescript
className="shrink-0 p-2 rounded-lg bg-white/5 text-gray-400 hover:text-casino-gold hover:bg-casino-gold/10 hover:border-casino-gold/30 border border-transparent transition-all md:opacity-0 md:group-hover:opacity-100 opacity-100 shadow-sm"
```

This makes the button always visible on mobile (`opacity-100` by default) and hover-revealed on desktop (`md:opacity-0 md:group-hover:opacity-100`).

---

### Task 4: Add quick challenge button from friend list

**Files:**
- Modify: `src/web/components/SocialPanel.tsx`

- [ ] **Step 1: Add challenge state and handler**

Add after the existing modal state declarations:
```typescript
const [quickChallengeFriend, setQuickChallengeFriend] = useState<Friend | null>(null);
```

- [ ] **Step 2: Add quick challenge button to friend list items**

After the chat button in the friend list item, add a challenge button (only for online friends not in a room):
```typescript
{isFriendOnline(friend) && !isInRoom && (
  <button
    onClick={() => {
      triggerHaptic('card_tap');
      setQuickChallengeFriend(friend);
    }}
    className="shrink-0 p-2 rounded-lg bg-white/5 text-gray-400 hover:text-casino-gold hover:bg-casino-gold/10 hover:border-casino-gold/30 border border-transparent transition-all md:opacity-0 md:group-hover:opacity-100 opacity-100 shadow-sm"
    title="Desafiar"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m18 16 4-4-4-4M6 8l-4 4 4 4m8.5-12-5 16" />
    </svg>
  </button>
)}
```

- [ ] **Step 3: Add QuickChallengeModal render**

Add at the bottom of the JSX (before the closing `</>`):
```typescript
{quickChallengeFriend && (
  <QuickChallengeModal
    friend={{
      id: quickChallengeFriend.id,
      username: quickChallengeFriend.username,
      avatar_url: quickChallengeFriend.avatar_url,
      equipped_avatar: quickChallengeFriend.equipped_avatar,
      elo: quickChallengeFriend.elo,
      level: quickChallengeFriend.level,
      wins: quickChallengeFriend.wins,
      losses: quickChallengeFriend.losses,
      xp: quickChallengeFriend.xp,
      isOnline: true,
      roomId: null,
    }}
    onClose={() => setQuickChallengeFriend(null)}
  />
)}
```

- [ ] **Step 4: Create QuickChallengeModal component**

Add this component at the bottom of the file (before the final `}`):
```typescript
function QuickChallengeModal({ friend, onClose }: { friend: FriendForModal; onClose: () => void }) {
  const { user } = useAuth();
  const [state, setState] = useState<'idle' | 'waiting' | 'accepted' | 'expired'>('idle');
  const [progress, setProgress] = useState(100);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [challengeRoomId, setChallengeRoomId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const closeChallengeRoom = async (roomId?: string | null) => {
    if (!roomId) return;
    try {
      const socket = await socketService.connect();
      socket.emit('cancel_room', { roomId, reason: 'challenge_cancelled' });
    } catch { /* ignore */ }
  };

  const startCountdown = (invId: string, roomId: string) => {
    startTimeRef.current = Date.now();
    setProgress(100);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.max(0, 100 - (elapsed / CHALLENGE_DURATION_MS) * 100);
      setProgress(pct);
      if (pct <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setState('expired');
        supabase.from('game_invitations').update({ status: 'expired' }).eq('id', invId).then(() => {});
        closeChallengeRoom(roomId);
      }
    }, 250);
  };

  const handleChallenge = async () => {
    if (!user) return;
    setState('waiting');
    try {
      const socket = await socketService.connect();
      const roomId = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
        socket.once('room_created', ({ roomId }: { roomId: string }) => {
          clearTimeout(timeout);
          resolve(roomId);
        });
        socket.emit('create_room', {
          playerName: user.user_metadata?.username || user.email?.split('@')[0] || 'Jugador',
          mode: '1v1',
          betAmount: 0,
        });
      });

      const expiresAt = new Date(Date.now() + CHALLENGE_DURATION_MS).toISOString();
      const { data, error } = await supabase
        .from('game_invitations')
        .insert({ sender_id: user.id, receiver_id: friend.id, status: 'pending', expires_at: expiresAt, room_id: roomId })
        .select('id')
        .single();
      if (error) throw error;
      setInvitationId(data.id);
      setChallengeRoomId(roomId);

      const { data: senderProfile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      await supabase.from('notifications').insert({
        player_id: friend.id,
        type: 'game_invitation',
        content: `¡${senderProfile?.username || 'Un amigo'} te ha desafiado!`,
        is_read: false,
        metadata: { sender_id: user.id, invitation_id: data.id, roomId, senderName: senderProfile?.username, expiresAt },
      });

      startCountdown(data.id, roomId);

      const channel = supabase
        .channel(`quick_challenge_${data.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_invitations', filter: `id=eq.${data.id}` }, (payload) => {
          if (payload.new.status === 'accepted') {
            if (timerRef.current) clearInterval(timerRef.current);
            setState('accepted');
            setChallengeRoomId(null);
            supabase.removeChannel(channel);
            setTimeout(onClose, 1250);
          } else if (['rejected', 'cancelled', 'expired'].includes(payload.new.status)) {
            if (timerRef.current) clearInterval(timerRef.current);
            setState('expired');
            closeChallengeRoom(roomId);
            setChallengeRoomId(null);
            supabase.removeChannel(channel);
          }
        })
        .subscribe();
    } catch {
      setState('idle');
    }
  };

  const handleCancel = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (invitationId) await supabase.from('game_invitations').update({ status: 'cancelled' }).eq('id', invitationId);
    await closeChallengeRoom(challengeRoomId);
    setState('idle');
    setInvitationId(null);
    setChallengeRoomId(null);
  };

  const secondsLeft = Math.ceil((progress / 100) * (CHALLENGE_DURATION_MS / 1000));

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.97) 0%, rgba(2,6,23,0.99) 100%)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 50px rgba(251,191,36,0.1)' }}>
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all z-10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="h-16 bg-gradient-to-r from-casino-gold/20 via-casino-emerald/10 to-casino-gold/20 flex items-center justify-center">
          <span className="text-sm font-black text-casino-gold tracking-widest uppercase">Desafiar a {friend.username}</span>
        </div>

        <div className="px-6 py-5 space-y-4">
          {state === 'idle' && (
            <button onClick={handleChallenge} className="w-full py-3 rounded-xl bg-gradient-to-r from-casino-gold to-yellow-500 text-black font-bold text-sm hover:from-yellow-400 hover:to-casino-gold transition-all active:scale-[0.98] shadow-lg shadow-casino-gold/20">
              Enviar Desafío
            </button>
          )}
          {state === 'waiting' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-bold">⏳ Esperando...</span>
                <span className={`text-sm font-mono font-bold ${secondsLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-casino-gold'}`}>{secondsLeft}s</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-casino-gold to-yellow-400 transition-all" style={{ width: `${progress}%`, transition: 'width 0.25s linear' }} />
              </div>
              <button onClick={handleCancel} className="w-full py-2 rounded-xl bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 font-bold text-xs border border-white/10 transition-all">Cancelar</button>
            </div>
          )}
          {state === 'accepted' && (
            <div className="py-3 rounded-xl text-center bg-casino-emerald/10 border border-casino-emerald/30 animate-pulse">
              <p className="text-casino-emerald font-bold text-sm">🎮 ¡Desafío aceptado!</p>
            </div>
          )}
          {state === 'expired' && (
            <div className="space-y-2">
              <div className="py-3 rounded-xl text-center bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 font-bold text-sm">⏱ Sin respuesta</p>
              </div>
              <button onClick={() => { setState('idle'); setInvitationId(null); }} className="w-full py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white text-xs font-bold border border-white/10 transition-all">Intentar de nuevo</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add required imports to SocialPanel**

Ensure these imports exist at the top:
```typescript
import { FriendForModal } from './FriendProfileModal';
import { socketService } from '../services/socket';
```

Add constant (if not already present from FriendProfileModal):
```typescript
const CHALLENGE_DURATION_MS = 60_000;
```

---

### Task 5: Sort friends list (online first, then by ELO)

**Files:**
- Modify: `src/web/components/SocialPanel.tsx`

- [ ] **Step 1: Add useMemo import**

Add `useMemo` to the React import:
```typescript
import React, { useEffect, useState, useCallback, useMemo } from 'react';
```

- [ ] **Step 2: Add sorting before rendering**

Add before the return statement:
```typescript
const sortedFriends = useMemo(() => {
  let filtered = friends;
  if (friendSearchQuery.trim()) {
    const q = friendSearchQuery.toLowerCase();
    filtered = friends.filter((f) => f.username.toLowerCase().includes(q));
  }
  return [...filtered].sort((a, b) => {
    const aOnline = isFriendOnline(a);
    const bOnline = isFriendOnline(b);
    const aInRoom = presenceMap[a.id]?.isInRoom ?? !!a.current_room_id;
    const bInRoom = presenceMap[b.id]?.isInRoom ?? !!b.current_room_id;
    const aOrder = aOnline && !aInRoom ? 0 : aOnline && aInRoom ? 1 : 2;
    const bOrder = bOnline && !bInRoom ? 0 : bOnline && bInRoom ? 1 : 2;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.elo - a.elo;
  });
}, [friends, presenceMap, isFriendOnline, friendSearchQuery]);
```

- [ ] **Step 3: Use sortedFriends in render**

Replace `friends.map((friend) => {` with `sortedFriends.map((friend) => {`

---

### Task 6: Add search/filter to friends tab

**Files:**
- Modify: `src/web/components/SocialPanel.tsx`

- [ ] **Step 1: Add search state**

Add after existing state declarations:
```typescript
const [friendSearchQuery, setFriendSearchQuery] = useState('');
```

- [ ] **Step 2: Add search input to friends tab**

After the "👥 Mis Amigos" header (around line 441-446), add:
```typescript
{friends.length > 3 && (
  <div className="relative shrink-0">
    <input
      type="text"
      value={friendSearchQuery}
      onChange={(e) => setFriendSearchQuery(e.target.value)}
      placeholder="Filtrar amigos..."
      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-casino-gold/50 transition-colors"
    />
    {friendSearchQuery && (
      <button
        onClick={() => setFriendSearchQuery('')}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
)}
```

---

### Task 7: Add Escape key handler for modals

**Files:**
- Modify: `src/web/components/SocialPanel.tsx`

- [ ] **Step 1: Add useEffect for Escape key**

Add after the existing state declarations:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (selectedRequest) setSelectedRequest(null);
      else if (selectedFriend) setSelectedFriend(null);
      else if (quickChallengeFriend) setQuickChallengeFriend(null);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedRequest, selectedFriend, quickChallengeFriend]);
```

---

### Task 8: Deterministic Supabase channel names

**Files:**
- Modify: `src/web/components/SocialPanel.tsx`

- [ ] **Step 1: Replace Math.random() in channel names**

Replace line 177:
```typescript
// Before:
const channelName = `social_panel_friend_requests_${user.id}_${Date.now()}_${Math.random()}`;
// After:
const channelName = `social_panel_fr_${user.id}`;
```

Replace line 278:
```typescript
// Before:
const channelName = `unread_messages_sync_${user.id}_${Date.now()}_${Math.random()}`;
// After:
const channelName = `social_panel_msgs_${user.id}`;
```

---

## Self-Review

**Spec coverage checklist:**
1. ✅ Realtime online status — Task 1 (useProfilePresence hook)
2. ✅ Haptic feedback — Task 2 (all interactions)
3. ✅ Mobile chat button — Task 3 (opacity fix)
4. ✅ Quick challenge — Task 4 (QuickChallengeModal)
5. ✅ Sort friends — Task 5 (online first, ELO desc)
6. ✅ Search/filter — Task 6 (input + filter in sortedFriends)
7. ✅ Escape key — Task 7 (keydown handler)
8. ✅ Deterministic channels — Task 8 (stable names)

**Placeholder scan:** No TBD, TODO, or vague references found. All code is complete.

**Type consistency:** `FriendForModal` imported from `FriendProfileModal`, `triggerHaptic` from `utils/haptics`, `socketService` from `services/socket`, `CHALLENGE_DURATION_MS` matches FriendProfileModal's value (60_000).

---

## Execution Handoff

Plan complete. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
