import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { socketService } from '../services/socket';
import { appEvents } from '../utils/events';

export interface PresenceEntry {
  online_at: string;
  room_id?: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  presenceByUserId: Record<string, PresenceEntry>;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  presenceByUserId: {},
  signOut: async () => {},
  refetchProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, PresenceEntry>>({});
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setProfile(data);
        // Asignar misiones diarias automáticamente al cargar el perfil
        try {
          await supabase.rpc('assign_daily_quests', { p_player_id: userId });
        } catch {}
      }
    } catch (e) {
      console.warn("Error fetching profile on mobile:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setPresenceByUserId({});
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Suscripción al canal de Presencia Global de Supabase ('global-presence')
  useEffect(() => {
    if (!user?.id) return;

    let isSubscribed = false;
    let isDisposed = false;

    const channel = supabase.channel('global-presence', {
      config: {
        presence: { key: user.id },
      },
    });
    presenceChannelRef.current = channel;

    const trackPresence = async () => {
      if (isDisposed) return;
      try {
        await channel.track({
          online_at: new Date().toISOString(),
          room_id: socketService.currentRoomId,
        });
      } catch {}
    };

    const syncPresence = () => {
      const state = channel.presenceState<PresenceEntry>();
      const next: Record<string, PresenceEntry> = {};

      for (const [userId, presenceList] of Object.entries(state)) {
        const list = presenceList as PresenceEntry[];
        if (!Array.isArray(list) || list.length === 0) continue;
        const latest = list[list.length - 1];
        if (latest?.online_at) {
          next[userId] = latest;
        }
      }
      if (!isDisposed) {
        setPresenceByUserId(next);
      }
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
          await trackPresence();
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          isSubscribed = false;
          if (!isDisposed) setPresenceByUserId({});
        }
      });

    const handleRoomChange = () => {
      if (!isSubscribed || isDisposed) return;
      trackPresence();
    };

    appEvents.on('room_joined_event', handleRoomChange);
    appEvents.on('room_left_event', handleRoomChange);

    return () => {
      isDisposed = true;
      isSubscribed = false;
      appEvents.off('room_joined_event', handleRoomChange);
      appEvents.off('room_left_event', handleRoomChange);
      channel.unsubscribe();
      supabase.removeChannel(channel);
      if (presenceChannelRef.current === channel) {
        presenceChannelRef.current = null;
      }
    };
  }, [user?.id]);

  // Heartbeat cada 15s en base de datos
  useEffect(() => {
    if (!user?.id) return;
    let disposed = false;

    const heartbeat = async () => {
      if (disposed) return;
      try {
        await supabase
          .from('profiles')
          .update({
            last_seen_at: new Date().toISOString(),
            current_room_id: socketService.currentRoomId,
          })
          .eq('id', user.id);
      } catch {}
    };

    heartbeat();
    const interval = setInterval(heartbeat, 15000);

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') heartbeat();
    };
    const appStateSub = AppState.addEventListener('change', handleAppState);

    return () => {
      disposed = true;
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [user?.id]);

  // Suscripción en tiempo real al perfil
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile_mobile_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new);
          }
        }
      )
      .subscribe();

    const handleUpdated = () => refetchProfile();
    appEvents.on('profile_updated', handleUpdated);
    appEvents.on('coins_updated', handleUpdated);
    appEvents.on('elo_updated', handleUpdated);

    return () => {
      supabase.removeChannel(channel);
      appEvents.off('profile_updated', handleUpdated);
      appEvents.off('coins_updated', handleUpdated);
      appEvents.off('elo_updated', handleUpdated);
    };
  }, [user?.id, refetchProfile]);

  const signOut = async () => {
    try {
      socketService.disconnect();
    } catch {}
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, presenceByUserId, signOut, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
