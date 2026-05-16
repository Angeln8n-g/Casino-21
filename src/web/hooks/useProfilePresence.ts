import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

export const ONLINE_WINDOW_MS = 45_000;

interface ProfilePresence {
  id: string;
  last_seen_at: string | null;
  current_room_id: string | null;
}

interface UseProfilePresenceResult {
  presenceMap: Record<string, { isOnline: boolean; isInRoom: boolean }>;
  refreshPresence: (ids: string[]) => Promise<void>;
}

export function useProfilePresence(friendIds: string[]): UseProfilePresenceResult {
  const [profiles, setProfiles] = useState<ProfilePresence[]>([]);

  const refreshPresence = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setProfiles([]);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, last_seen_at, current_room_id')
      .in('id', ids);
    if (error) {
      console.error('Error refreshing presence:', error);
      return;
    }
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
