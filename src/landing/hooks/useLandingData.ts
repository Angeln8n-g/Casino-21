import { useEffect, useState } from 'react';
import { supabase } from '../../web/services/supabase';

export interface LeaderboardEntry {
  username: string;
  elo: number;
  wins: number;
  losses: number;
  level: number;
  avatar_url?: string | null;
}

export interface TournamentEvent {
  id: string;
  title: string;
  description?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  tournament_format?: 'sit_and_go' | 'scheduled' | string;
  participants_count: number;
  max_participants: number;
  entry_fee_coins?: number;
  guaranteed_prize_coins?: number;
  current_prize_coins?: number;
  reward_xp_winner?: number;
  image_url?: string | null;
}

export interface LandingStats {
  totalPlayers: number;
  totalMatches: number;
  activeEvents: number;
  onlineNow: number;
}

export interface TestimonialEntry {
  name: string;
  text: string;
  rating: number;
  rank: string;
  rankClass: string;
  elo: number;
}

const DEFAULT_TESTIMONIALS: TestimonialEntry[] = [
  {
    name: 'Carlos M. (@ElAudaz)',
    text: 'El mejor juego de 21 online en español. Los torneos Sit & Go arrancan en segundos y el conteo de cartas en la Regla de Cierre es puro esports.',
    rating: 5,
    rank: 'Diamante',
    rankClass: 'division-diamond',
    elo: 2150,
  },
  {
    name: 'María L. (@Reyna21)',
    text: 'Jugar en 2v2 con mi compañero coordinando sumatorias y cantos de As es adictivo. Cero bugs, rápido en móvil y sin apuestas de dinero real.',
    rating: 5,
    rank: 'Platino',
    rankClass: 'division-platinum',
    elo: 1890,
  },
  {
    name: 'Javier R. (@DonVirado)',
    text: 'Llegar a 20 puntos y tener que ganar con mayoría de picas le da una tensión que ningún otro juego de cartas tiene. La adrenalina de barrer la mesa es única.',
    rating: 5,
    rank: 'Oro',
    rankClass: 'division-gold',
    elo: 1620,
  },
  {
    name: 'Ana P. (@CardMaster)',
    text: 'Subir de Bronce a Oro ganando misiones diarias y personalizando el tapete neón fue súper gratificante. Funciona perfecto en navegador sin instalar nada.',
    rating: 5,
    rank: 'Oro',
    rankClass: 'division-gold',
    elo: 1540,
  },
];

const FALLBACK_LEADERBOARD: LeaderboardEntry[] = [
  { username: 'El-Miedo', elo: 1910, wins: 45, losses: 10, level: 9 },
  { username: 'Burgos', elo: 1500, wins: 28, losses: 12, level: 7 },
  { username: 'Muñeca', elo: 1420, wins: 25, losses: 16, level: 6 },
  { username: 'Ian', elo: 1350, wins: 18, losses: 9, level: 5 },
  { username: 'Roqueton28', elo: 1280, wins: 14, losses: 8, level: 4 },
  { username: 'Nenela', elo: 1210, wins: 11, losses: 7, level: 3 },
  { username: 'Ircania', elo: 1150, wins: 9, losses: 6, level: 3 },
  { username: 'Moisespro', elo: 1090, wins: 7, losses: 5, level: 2 },
];

const FALLBACK_EVENTS: TournamentEvent[] = [
  {
    id: 'sit-and-go-default',
    title: 'Sit & Go Relámpago 8J',
    description: 'Torneo eliminatorio directo de 8 jugadores. Comienza en cuanto se llenan los cupos.',
    status: 'upcoming',
    tournament_format: 'sit_and_go',
    participants_count: 5,
    max_participants: 8,
    entry_fee_coins: 0,
    guaranteed_prize_coins: 1000,
    current_prize_coins: 1450,
    reward_xp_winner: 250,
  },
  {
    id: 'championship-scheduled',
    title: 'Copa Dominical 16 Duelistas',
    description: 'Torneo programado con llaves de eliminación directa y check-in previo.',
    status: 'upcoming',
    tournament_format: 'scheduled',
    participants_count: 12,
    max_participants: 16,
    entry_fee_coins: 50,
    guaranteed_prize_coins: 5000,
    current_prize_coins: 5800,
    reward_xp_winner: 500,
  },
];

export function useLandingData() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(FALLBACK_LEADERBOARD);
  const [events, setEvents] = useState<TournamentEvent[]>(FALLBACK_EVENTS);
  const [stats, setStats] = useState<LandingStats>({
    totalPlayers: 1420,
    totalMatches: 8940,
    activeEvents: 2,
    onlineNow: 28,
  });
  const [testimonials, setTestimonials] = useState<TestimonialEntry[]>(DEFAULT_TESTIMONIALS);
  const [loading, setLoading] = useState(true);

  async function fetchEvents(): Promise<TournamentEvent[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, description, status, start_date, end_date, tournament_format, max_participants, participants_count, entry_fee_coins, guaranteed_prize_coins, current_prize_coins, reward_xp_winner, image_url')
        .in('status', ['upcoming', 'live', 'check_in'])
        .order('created_at', { ascending: false })
        .limit(6);

      if (error || !data || data.length === 0) {
        return FALLBACK_EVENTS;
      }

      return data.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        status: item.status,
        start_date: item.start_date,
        end_date: item.end_date,
        tournament_format: item.tournament_format || 'sit_and_go',
        participants_count: item.participants_count || 0,
        max_participants: item.max_participants || 8,
        entry_fee_coins: item.entry_fee_coins || 0,
        guaranteed_prize_coins: item.guaranteed_prize_coins || 1000,
        current_prize_coins: item.current_prize_coins || item.guaranteed_prize_coins || 1000,
        reward_xp_winner: item.reward_xp_winner || 250,
        image_url: item.image_url,
      }));
    } catch {
      return FALLBACK_EVENTS;
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function fetchAll() {
      try {
        const [profilesRes, matchesRes, eventsData, testimonialsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('username, elo, wins, losses, level, avatar_url')
            .order('elo', { ascending: false, nullsFirst: false })
            .limit(10),
          supabase.from('matches').select('id', { count: 'exact', head: true }),
          fetchEvents(),
          supabase
            .from('testimonials')
            .select('name, text, rating, rank, rank_class, elo')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(6),
        ]);

        if (!isMounted) return;

        // Clear stale session if 401
        if (profilesRes.error?.status === 401) {
          await supabase.auth.signOut().catch(() => {});
        }

        if (profilesRes.data && profilesRes.data.length > 0) {
          const sanitized = profilesRes.data
            .filter((p) => p.username && p.elo)
            .map((p) => ({
              username: p.username,
              elo: Number(p.elo) || 1000,
              wins: Number(p.wins) || 0,
              losses: Number(p.losses) || 0,
              level: Number(p.level) || 1,
              avatar_url: p.avatar_url,
            }));
          if (sanitized.length > 0) setLeaderboard(sanitized);
        }

        if (eventsData && eventsData.length > 0) {
          setEvents(eventsData);
        }

        const matchCount = Number(matchesRes.count) || 8940;
        const playerCount = Math.max(leaderboard.length * 150, 1200);

        setStats({
          totalPlayers: playerCount,
          totalMatches: matchCount,
          activeEvents: eventsData.length,
          onlineNow: Math.floor(Math.random() * 12) + 24,
        });

        if (testimonialsRes.data && testimonialsRes.data.length > 0) {
          setTestimonials(
            testimonialsRes.data.map((item) => ({
              name: item.name,
              text: item.text,
              rating: item.rating || 5,
              rank: item.rank || 'Oro',
              rankClass: item.rank_class || 'division-gold',
              elo: item.elo || 1500,
            }))
          );
        }
      } catch {
        // Fallbacks preserved
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAll();

    const channel = supabase
      .channel('landing-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, async () => {
        const updated = await fetchEvents();
        if (isMounted) setEvents(updated);
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel).catch(() => {});
    };
  }, []);

  return {
    leaderboard,
    events,
    stats,
    testimonials,
    loading,
  };
}
