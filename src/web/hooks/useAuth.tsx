import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { socketService } from '../services/socket';

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

    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
    let isSubscribed = false;

    const setupPresence = async () => {
      // Remove any existing channel with the same name before creating a new one
      // to avoid 'tried to subscribe multiple times' in React StrictMode
      const existingChannel = supabase.getChannels().find(c => c.topic === 'realtime:global:presence');
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }

      presenceChannel = supabase.channel('global:presence', {
        config: { presence: { key: user.id } },
      });

      const syncPresence = () => {
        if (!presenceChannel) return;
        const state = presenceChannel.presenceState<PresenceEntry>();
        const next: Record<string, PresenceEntry> = {};

        for (const [userId, presenceList] of Object.entries(state)) {
          const list = presenceList as unknown as PresenceEntry[];
          if (!Array.isArray(list) || list.length === 0) continue;

          const latest = list.reduce<PresenceEntry>((acc, cur) => {
            const accTs = Date.parse(acc?.online_at || '') || 0;
            const curTs = Date.parse(cur?.online_at || '') || 0;
            return curTs >= accTs ? cur : acc;
          }, list[0]);

          if (latest?.online_at) next[userId] = latest;
        }

        setPresenceByUserId(next);
      };

      presenceChannel
        .on('presence', { event: 'sync' }, syncPresence)
        .on('presence', { event: 'join' }, syncPresence)
        .on('presence', { event: 'leave' }, syncPresence)
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            isSubscribed = true;
            await presenceChannel!.track({
              online_at: new Date().toISOString(),
              room_id: socketService.currentRoomId,
            });
          }
        });
    };

    setupPresence();

    const handleRoomChange = () => {
      if (presenceChannel && isSubscribed) {
        presenceChannel.track({
          online_at: new Date().toISOString(),
          room_id: socketService.currentRoomId,
        }).catch(console.error);
      }
    };

    window.addEventListener('room_joined_event', handleRoomChange);
    window.addEventListener('room_left_event', handleRoomChange);

    return () => {
      window.removeEventListener('room_joined_event', handleRoomChange);
      window.removeEventListener('room_left_event', handleRoomChange);
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
        isSubscribed = false;
      }
    };
  }, [user]);

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
      }
    } catch (error: any) {
      const message = String(error?.message || '');
      if (error?.name === 'TypeError' && message.includes('Failed to fetch')) return;
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

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
