import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';

const ONLINE_THRESHOLD_MS = 90 * 1000; // 90s

export interface ProfilePresenceInfo {
  isOnline: boolean;
  isInRoom: boolean;
  currentRoomId: string | null;
}

export function useProfilePresence(
  friendIds: string[],
  initialData?: Record<string, { last_seen_at?: string | null; current_room_id?: string | null }>
): Record<string, ProfilePresenceInfo> {
  const [presenceMap, setPresenceMap] = useState<Record<string, { lastSeenAt: string | null; currentRoomId: string | null }>>({});
  const [tick, setTick] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const sortedKey = useMemo(() => [...friendIds].sort().join(','), [friendIds]);

  // Semilla inicial desde la consulta de amigos
  useEffect(() => {
    if (!initialData) return;
    setPresenceMap((prev) => {
      const next = { ...prev };
      for (const [id, data] of Object.entries(initialData)) {
        if (!next[id] || data.last_seen_at) {
          next[id] = {
            lastSeenAt: data.last_seen_at ?? next[id]?.lastSeenAt ?? null,
            currentRoomId: data.current_room_id !== undefined ? data.current_room_id : (next[id]?.currentRoomId ?? null),
          };
        }
      }
      return next;
    });
  }, [initialData]);

  // Suscripción Realtime a cambios de presencia (last_seen_at, current_room_id) en profiles
  useEffect(() => {
    if (friendIds.length === 0) return;

    const filterValue = `id=in.(${friendIds.join(',')})`;

    const channel = supabase
      .channel(`profile-presence-mobile-${sortedKey.slice(0, 32)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: filterValue,
        },
        (payload) => {
          const updated = payload.new as { id: string; last_seen_at?: string | null; current_room_id?: string | null };
          if (!updated?.id) return;
          setPresenceMap((prev) => ({
            ...prev,
            [updated.id]: {
              lastSeenAt: updated.last_seen_at ?? null,
              currentRoomId: updated.current_room_id ?? null,
            },
          }));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [sortedKey]);

  // Re-evaluación periódica cada 15s por si expira last_seen_at
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    const now = Date.now();
    const result: Record<string, ProfilePresenceInfo> = {};

    for (const id of friendIds) {
      const entry = presenceMap[id];
      const lastSeenMs = entry?.lastSeenAt ? new Date(entry.lastSeenAt).getTime() : 0;
      const isOnline = lastSeenMs > 0 && now - lastSeenMs < ONLINE_THRESHOLD_MS;
      const currentRoomId = isOnline ? (entry?.currentRoomId ?? null) : null;

      result[id] = {
        isOnline,
        isInRoom: Boolean(currentRoomId),
        currentRoomId,
      };
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenceMap, sortedKey, tick]);
}
