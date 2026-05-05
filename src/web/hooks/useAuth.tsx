import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { socketService } from '../services/socket';
import { logger } from '../utils/logger';

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
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  presenceByUserId: {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, PresenceEntry>>({});
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de autenticación
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

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let isSubscribed = false;
    let isDisposed = false;

    const presenceChannel = supabase.channel('global-presence', {
      config: { presence: { key: user.id } },
    });
    presenceChannelRef.current = presenceChannel;

    const trackPresence = async () => {
      if (isDisposed) return;
      try {
        await presenceChannel.track({
          online_at: new Date().toISOString(),
          room_id: socketService.currentRoomId,
        });
      } catch (err) {
        if (!isDisposed) logger.error('Presence track error:', err);
      }
    };

    const syncPresence = () => {
      const state = presenceChannel.presenceState<PresenceEntry>();
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

    presenceChannel
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
          if (!isDisposed) {
            setPresenceByUserId({});
          }
        }
      });

    const handleRoomChange = () => {
      if (!isSubscribed || isDisposed) return;
      trackPresence();
    };

    window.addEventListener('room_joined_event', handleRoomChange);
    window.addEventListener('room_left_event', handleRoomChange);

    return () => {
      isDisposed = true;
      isSubscribed = false;
      window.removeEventListener('room_joined_event', handleRoomChange);
      window.removeEventListener('room_left_event', handleRoomChange);
      presenceChannel.unsubscribe();
      supabase.removeChannel(presenceChannel);
      if (presenceChannelRef.current === presenceChannel) {
        presenceChannelRef.current = null;
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    let disposed = false;

    const heartbeat = async () => {
      if (disposed) return;
      const { error } = await supabase
        .from('profiles')
        .update({
          last_seen_at: new Date().toISOString(),
          current_room_id: socketService.currentRoomId,
        })
        .eq('id', user.id);
      if (error && !disposed) {
        logger.warn('Heartbeat update failed:', error.message);
      }
    };

    const handleRoomChange = () => {
      heartbeat();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        heartbeat();
      }
    };

    heartbeat();
    const intervalId = window.setInterval(heartbeat, 15_000);

    window.addEventListener('room_joined_event', handleRoomChange);
    window.addEventListener('room_left_event', handleRoomChange);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener('room_joined_event', handleRoomChange);
      window.removeEventListener('room_left_event', handleRoomChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.id]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        throw error;
      } else {
        setProfile(data);
        
        // Asignar misiones diarias automáticamente al cargar el perfil
        try {
          await supabase.rpc('assign_daily_quests', { p_player_id: userId });
        } catch (questError) {
          logger.error('Error auto-assigning daily quests:', questError);
        }
      }
    } catch (error: any) {
      const message = String(error?.message || '');
      if (error?.name === 'TypeError' && message.includes('Failed to fetch')) return;
      logger.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const handleProfileUpdated = () => {
      fetchProfile(user.id);
    };
    
    // Listen to global events to refetch profile
    window.addEventListener('profile_updated', handleProfileUpdated);
    window.addEventListener('coins_updated', handleProfileUpdated);
    window.addEventListener('elo_updated', handleProfileUpdated);
    
    return () => {
      window.removeEventListener('profile_updated', handleProfileUpdated);
      window.removeEventListener('coins_updated', handleProfileUpdated);
      window.removeEventListener('elo_updated', handleProfileUpdated);
    };
  }, [user?.id]);

  // Suscripción en tiempo real a cambios en el perfil del usuario
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          logger.debug('Profile updated in DB via realtime:', payload);
          // Actualizar el perfil con los nuevos datos
          if (payload.new) {
            setProfile(payload.new);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('Subscribed to profile changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('Profile subscription error:', status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, presenceByUserId, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
