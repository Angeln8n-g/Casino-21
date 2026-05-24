import { useEffect, useState } from 'react';
import { supabase } from '../../web/services/supabase';

export interface LeaderboardEntry {
  username: string;
  elo: number;
  wins: number;
  losses: number;
  level: number;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  entry_fee: number;
  prize_pool: string;
  image_url: string | null;
  participants_count: number;
  max_participants: number;
  created_at: string;
}

export interface LandingStats {
  totalPlayers: number;
  totalMatches: number;
  activeEvents: number;
}

export function useLandingData() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [stats, setStats] = useState<LandingStats>({ totalPlayers: 0, totalMatches: 0, activeEvents: 0 });
  const [loading, setLoading] = useState(true);

  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select('id, title, description, type, status, start_date, end_date, entry_fee, prize_pool, image_url, participants_count, max_participants, created_at')
      .in('status', ['upcoming', 'live'])
      .order('start_date', { ascending: true })
      .limit(6);
    return (data || []) as EventItem[];
  }

  useEffect(() => {
    let isMounted = true;

    async function fetchAll() {
      try {
        const [profilesRes, matchesRes, eventsRes] = await Promise.all([
          supabase.from('profiles').select('username, elo, wins, losses, level').order('elo', { ascending: false }).limit(10),
          supabase.from('matches').select('id', { count: 'exact', head: true }),
          fetchEvents(),
        ]);

        if (!isMounted) return;

        if (profilesRes.data) setLeaderboard(profilesRes.data);
        setEvents(eventsRes);

        setStats({
          totalPlayers: profilesRes.data?.length ?? 0,
          totalMatches: matchesRes.count ?? 0,
          activeEvents: eventsRes.length,
        });
      } catch (err: any) {
        if (!isMounted) return;
        const message = String(err?.message || '');
        if (err?.name === 'TypeError' && message.includes('Failed to fetch')) return;
        console.error('Error fetching landing data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAll();

    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        async () => {
          const updated = await fetchEvents();
          if (isMounted) {
            setEvents(updated);
            setStats((prev) => ({ ...prev, activeEvents: updated.length }));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { leaderboard, events, stats, loading };
}
