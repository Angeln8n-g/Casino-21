import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

interface Tournament {
  id: string;
  code: string;
  name: string;
  max_players: number;
  current_players: number;
  status: 'waiting' | 'in_progress' | 'completed';
  created_at: string;
}

export function TournamentList() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    fetchTournaments();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`tournaments-lobby_${Math.random()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournaments',
      }, () => {
        fetchTournaments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['waiting', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (!error && data) {
        setTournaments(data);
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (tournament: Tournament) => {
    if (!user || tournament.status !== 'waiting') return;
    setJoining(tournament.id);
    try {
      // Insert the user as a participant - the server handles validation
      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournament.id,
          player_id: user.id,
        });

      if (error) {
        console.error('Error joining tournament:', error);
      } else {
        fetchTournaments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(null);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'waiting':
        return { label: 'Esperando', color: 'text-casino-gold', bg: 'bg-casino-gold/10', border: 'border-casino-gold/20', dot: 'bg-casino-gold' };
      case 'in_progress':
        return { label: 'En Curso', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', dot: 'bg-blue-400' };
      default:
        return { label: 'Completado', color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/20', dot: 'bg-gray-400' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-panel p-4 animate-pulse">
            <div className="h-4 bg-white/5 rounded w-2/3 mb-2" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="glass-panel p-6 text-center">
        <div className="text-3xl mb-2">🏆</div>
        <p className="text-gray-400 text-sm">No hay torneos activos</p>
        <p className="text-gray-500 text-xs mt-1">Los torneos aparecerán aquí cuando se creen</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {tournaments.map((tournament, idx) => {
        const statusConfig = getStatusConfig(tournament.status);
        const isFull = tournament.current_players >= tournament.max_players;
        const canJoin = tournament.status === 'waiting' && !isFull;
        const playerRatio = tournament.current_players / tournament.max_players;

        return (
          <div
            key={tournament.id}
            className="tournament-card group animate-slide-up"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-display font-bold text-white text-sm truncate group-hover:text-casino-gold transition-colors">
                  {tournament.name || 'Torneo'}
                </h4>
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border mt-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} animate-pulse`} />
                  {statusConfig.label}
                </div>
              </div>

              {/* Tournament Code */}
              <div className="shrink-0 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.06]">
                <span className="text-[10px] text-gray-500 block leading-none">CÓDIGO</span>
                <span className="font-mono text-casino-gold font-bold text-sm tracking-wider">{tournament.code}</span>
              </div>
            </div>

            {/* Player slots */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>Jugadores</span>
                <span>{tournament.current_players}/{tournament.max_players}</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    playerRatio >= 1 ? 'bg-red-500' : playerRatio > 0.5 ? 'bg-casino-gold' : 'bg-casino-emerald'
                  }`}
                  style={{ width: `${Math.min(playerRatio * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Join Button */}
            {canJoin ? (
              <button
                onClick={() => handleJoin(tournament)}
                disabled={joining === tournament.id}
                className="btn-emerald w-full py-2 text-xs disabled:opacity-40 disabled:scale-100"
              >
                {joining === tournament.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Uniéndose...
                  </span>
                ) : (
                  'Unirse al Torneo'
                )}
              </button>
            ) : tournament.status === 'in_progress' ? (
              <div className="text-center text-xs text-blue-400/60 py-1.5 font-medium">
                ⚔ Torneo en curso
              </div>
            ) : (
              <div className="text-center text-xs text-gray-500 py-1.5">
                Torneo lleno
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
