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
    name: 'Carlos M.',
    text: 'El mejor juego de 21 online que he probado. Los torneos semanales son altamente competitivos y el matchmaking por ELO funciona de maravilla.',
    rating: 5,
    rank: 'Diamante',
    rankClass: 'division-diamond',
    elo: 2150,
  },
  {
    name: 'María L.',
    text: 'Me encanta poder crear salas privadas y jugar con amigos en tiempo real. La interfaz corre súper fluida tanto en móvil como en PC.',
    rating: 5,
    rank: 'Platino',
    rankClass: 'division-platinum',
    elo: 1890,
  },
  {
    name: 'Javier R.',
    text: 'Llevo 3 temporadas compitiendo en el circuito de torneos. El balance de cartas es impecable y la comunidad en Discord es muy activa.',
    rating: 5,
    rank: 'Oro',
    rankClass: 'division-gold',
    elo: 1620,
  },
  {
    name: 'Ana P.',
    text: 'El sistema de logros diarios te motiva a jugar una partida rápida todos los días. Empecé en Bronce y ya voy subiendo poco a poco.',
    rating: 4,
    rank: 'Plata',
    rankClass: 'division-silver',
    elo: 1410,
  },
];

export function useLandingData() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [stats, setStats] = useState<LandingStats>({ totalPlayers: 0, totalMatches: 0, activeEvents: 0 });
  const [testimonials, setTestimonials] = useState<TestimonialEntry[]>(DEFAULT_TESTIMONIALS);
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
        const [profilesRes, matchesRes, eventsRes, testimonialsRes] = await Promise.all([
          supabase.from('profiles').select('username, elo, wins, losses, level').order('elo', { ascending: false }).limit(10),
          supabase.from('matches').select('id', { count: 'exact', head: true }),
          fetchEvents(),
          supabase.from('testimonials').select('name, text, rating, rank, rank_class, elo').eq('is_active', true).order('created_at', { ascending: false }).limit(8),
        ]);

        if (!isMounted) return;

        if (profilesRes.data) setLeaderboard(profilesRes.data);
        setEvents(eventsRes);

        setStats({
          totalPlayers: profilesRes.data?.length ?? 0,
          totalMatches: matchesRes.count ?? 0,
          activeEvents: eventsRes.length,
        });

        // Use database testimonials, mapping rank_class to camelCase rankClass
        if (testimonialsRes.data && testimonialsRes.data.length > 0) {
          const mapped = testimonialsRes.data.map(item => ({
            name: item.name,
            text: item.text,
            rating: item.rating,
            rank: item.rank,
            rankClass: item.rank_class,
            elo: item.elo
          }));
          setTestimonials(mapped);
        }
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

  return { leaderboard, events, stats, testimonials, loading };
}
