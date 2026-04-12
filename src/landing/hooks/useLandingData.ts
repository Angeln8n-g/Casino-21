import { useEffect, useState } from 'react';
import { supabase } from '../../web/services/supabase';

export interface LeaderboardEntry {
  username: string;
  elo: number;
  wins: number;
  losses: number;
  level: number;
}

export interface ActiveTournament {
  id: string;
  name: string;
  code: string;
  current_players: number;
  max_players: number;
  status: string;
}

export interface LandingStats {
  totalPlayers: number;
  totalMatches: number;
  activeTournaments: number;
}

export function useLandingData() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tournaments, setTournaments] = useState<ActiveTournament[]>([]);
  const [stats, setStats] = useState<LandingStats>({ totalPlayers: 0, totalMatches: 0, activeTournaments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchAll() {
      try {
        const [profilesRes, matchesRes, tournamentsRes] = await Promise.all([
          supabase.from('profiles').select('username, elo, wins, losses, level').order('elo', { ascending: false }).limit(10),
          supabase.from('matches').select('id', { count: 'exact', head: true }),
          supabase.from('tournaments').select('id, name, code, current_players, max_players, status').eq('status', 'waiting').limit(4),
        ]);

        if (!isMounted) return;

        if (profilesRes.data) setLeaderboard(profilesRes.data);
        if (tournamentsRes.data) setTournaments(tournamentsRes.data);

        setStats({
          totalPlayers: profilesRes.data?.length ?? 0,
          totalMatches: matchesRes.count ?? 0,
          activeTournaments: tournamentsRes.data?.length ?? 0,
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

    return () => {
      isMounted = false;
    };
  }, []);

  return { leaderboard, tournaments, stats, loading };
}
