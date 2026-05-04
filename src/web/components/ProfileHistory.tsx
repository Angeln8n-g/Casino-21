import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Clock, Trophy, Swords, Calendar } from 'lucide-react';

interface MatchHistoryItem {
  id: string;
  game_mode: string;
  winner_id: string | null;
  end_time: string;
  metadata: {
    id: string;
    name: string;
    score: number;
    elo_change: number;
    coins_earned: number;
  }[];
}

export function ProfileHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  const fetchHistory = async (page = 0) => {
    if (!user) return;
    
    if (page === 0) setLoading(true);
    else setLoadingMore(true);
    
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from('match_history')
      .select('*', { count: 'exact' })
      .order('end_time', { ascending: false })
      .range(from, to);
      
    if (error) {
      console.error('Error fetching match history:', error);
    } else {
      if (page === 0) {
        setHistory(data || []);
      } else {
        setHistory(prev => [...prev, ...(data || [])]);
      }
      
      // Si devolvió menos del tamaño de página o llegamos al count total, ya no hay más
      if ((data?.length || 0) < PAGE_SIZE || (count !== null && history.length + (data?.length || 0) >= count)) {
        setHasMore(false);
      }
    }
    
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchHistory(0);
  }, [user]);

  const loadMore = () => {
    const nextPage = Math.ceil(history.length / PAGE_SIZE);
    fetchHistory(nextPage);
  };

  if (loading) {
    return (
      <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md shadow-lg flex flex-col gap-3">
        <div className="h-4 w-40 bg-white/10 rounded animate-pulse mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ animationDelay: `${i * 100}ms` }} />
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center p-12 glass-panel rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md shadow-lg">
        <Swords className="mx-auto text-gray-500 mb-4 opacity-50" size={48} />
        <p className="text-gray-400 font-bold">Aún no has jugado ninguna partida.</p>
        <p className="text-sm text-gray-500 mt-2">¡Entra al Matchmaking para empezar a escribir tu historia!</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md shadow-lg flex flex-col">
      <h3 className="text-xs font-display font-black text-white uppercase tracking-widest italic mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-casino-gold" />
        Historial de Partidas
      </h3>

      <div className="grid gap-3">
        {history.map((match, idx) => {
          // Encontrar mi data y separar a los demás
          const myData = match.metadata.find(m => m.id === user?.id);
          const opponents = match.metadata.filter(m => m.id !== user?.id);
          
          if (!myData) return null;

          // Determinar ganador (para 2v2 o torneos el winner_id puede ser de un equipo, pero usamos is_winner si está disponible en metadata o comparamos IDs)
          // Nota: Como actualizamos el atomic RPC para incluir 'is_winner' en la metadata, intentamos usar eso primero.
          const isWinner = (myData as any).is_winner !== undefined ? (myData as any).is_winner : match.winner_id === user?.id;
          const isTie = match.winner_id === null;
          
          // Formatear fecha
          const date = new Date(match.end_time);
          const formattedDate = new Intl.DateTimeFormat('es-ES', { 
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
          }).format(date);

          // Si hay múltiples oponentes, mostramos un resumen "VS Varios"
          const isMultiplayer = opponents.length > 1;
          const mainOpponent = opponents[0];

          return (
            <div 
              key={match.id} 
              className={`p-4 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 group cursor-default hover:-translate-y-1 shadow-lg ${
                isWinner 
                  ? 'bg-emerald-950/20 border border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_10px_30px_rgba(16,185,129,0.15)]' 
                  : isTie 
                    ? 'bg-gray-900/40 border border-gray-500/20 hover:border-gray-500/50 hover:shadow-[0_10px_30px_rgba(156,163,175,0.15)]' 
                    : 'bg-rose-950/20 border border-rose-500/20 hover:border-rose-500/50 hover:shadow-[0_10px_30px_rgba(244,63,94,0.15)]'
              }`}
              style={{ animationDelay: `${(idx + 5) * 60}ms` }}
            >
              {/* Decorative side bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                isWinner ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 
                isTie ? 'bg-gray-500 shadow-[0_0_10px_rgba(156,163,175,0.8)]' : 
                'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
              }`} />

              {/* Background gradient hint */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-500 ${
                isWinner ? 'bg-gradient-to-r from-emerald-500 to-transparent' : 
                isTie ? 'bg-gradient-to-r from-gray-500 to-transparent' : 
                'bg-gradient-to-r from-rose-500 to-transparent'
              }`} />

              {/* Left: Result & Mode */}
              <div className="relative z-10 w-full md:w-1/4 flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-black uppercase tracking-widest text-xs ${
                    isWinner ? 'text-emerald-400' : isTie ? 'text-gray-400' : 'text-red-400'
                  }`}>
                    {isWinner ? 'VICTORIA' : isTie ? 'EMPATE' : 'DERROTA'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  <Calendar size={12} />
                  {formattedDate}
                </div>
                <div className="mt-2 text-[9px] font-black uppercase tracking-widest bg-black/50 border border-white/10 text-gray-300 inline-block px-2 py-1 rounded-md hidden md:block">
                  {match.game_mode === 'tournament' ? '🏆 Torneo' : match.game_mode.toUpperCase()}
                </div>
              </div>

              {/* Middle: Scores */}
              <div className="relative z-10 flex-1 flex justify-center items-center gap-6 w-full md:w-auto">
                <div className="text-right flex-1 md:flex-none">
                  <div className="text-xs font-black text-white truncate max-w-[100px] uppercase tracking-wider">{myData.name}</div>
                  <div className={`text-2xl md:text-3xl font-black font-display leading-none ${isWinner ? 'text-emerald-400' : isTie ? 'text-gray-300' : 'text-red-400'}`}>{myData.score}</div>
                </div>
                
                <div className="text-white/20 font-black text-xl italic px-2">VS</div>
                
                <div className="text-left flex-1 md:flex-none">
                  {isMultiplayer ? (
                    <>
                      <div className="flex -space-x-2">
                        {opponents.slice(0, 3).map((opp, i) => (
                          <div key={opp.id} className="w-6 h-6 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center text-[8px] font-bold text-white z-10 relative" style={{ zIndex: 10 - i }}>
                            {opp.name.substring(0, 2).toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs font-black text-gray-500 mt-1 uppercase tracking-wider">{opponents.length} Jugadores</div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-black text-gray-500 truncate max-w-[100px] uppercase tracking-wider">{mainOpponent?.name || '???'}</div>
                      <div className="text-2xl md:text-3xl font-black text-gray-500 font-display leading-none">{mainOpponent?.score || 0}</div>
                    </>
                  )}
                </div>
              </div>

              {/* Right: Rewards (ELO & Coins) */}
              <div className="relative z-10 w-full md:w-1/4 flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end gap-1 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                <div className="md:hidden text-[9px] font-black uppercase tracking-widest bg-black/50 border border-white/10 text-gray-300 px-2 py-1 rounded-md">
                  {match.game_mode === 'tournament' ? '🏆 Torneo' : match.game_mode.toUpperCase()}
                </div>
                <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-1">
                  <div className={`font-mono font-bold flex items-center gap-1.5 text-xs ${
                    myData.elo_change > 0 ? 'text-emerald-400' : myData.elo_change < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    <Trophy size={14} />
                    {myData.elo_change > 0 ? '+' : ''}{myData.elo_change} ELO
                  </div>
                  
                  <div className="font-mono font-bold flex items-center gap-1.5 text-xs text-yellow-400">
                    🪙 +{myData.coins_earned}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Load More Button */}
      {hasMore && history.length > 0 && (
        <button 
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-6 mx-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 hover:border-casino-gold/30 text-gray-400 hover:text-casino-gold font-bold text-xs uppercase tracking-widest transition-all duration-300 group"
        >
          {loadingMore ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-casino-gold"></div>
          ) : (
            <>
              <span>Cargar Más Partidas</span>
              <span className="group-hover:translate-y-1 transition-transform">↓</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}