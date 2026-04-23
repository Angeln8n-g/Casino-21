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

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('match_history')
        .select('*')
        .order('end_time', { ascending: false })
        .limit(20);
        
      if (error) {
        console.error('Error fetching match history:', error);
      } else {
        setHistory(data || []);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-casino-gold"></div>
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
          // Encontrar mi data y la del oponente (asumiendo 1v1 por ahora)
          const myData = match.metadata.find(m => m.id === user?.id);
          const opponentData = match.metadata.find(m => m.id !== user?.id);
          
          if (!myData) return null;

          const isWinner = match.winner_id === user?.id;
          const isTie = match.winner_id === null;
          
          // Formatear fecha
          const date = new Date(match.end_time);
          const formattedDate = new Intl.DateTimeFormat('es-ES', { 
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
          }).format(date);

          return (
            <div 
              key={match.id} 
              className={`p-4 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 transition-all bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 border-l-4 animate-slide-up ${
                isWinner ? 'border-l-emerald-500 hover:border-emerald-500/50' : isTie ? 'border-l-gray-500 hover:border-gray-500/50' : 'border-l-red-500 hover:border-red-500/50'
              }`}
              style={{ animationDelay: `${(idx + 5) * 60}ms` }}
            >
              {/* Background gradient hint */}
              <div className={`absolute inset-0 opacity-10 pointer-events-none ${
                isWinner ? 'bg-gradient-to-r from-emerald-500 to-transparent' : 
                isTie ? 'bg-gradient-to-r from-gray-500 to-transparent' : 
                'bg-gradient-to-r from-red-500 to-transparent'
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
                  <div className="text-xs font-black text-gray-500 truncate max-w-[100px] uppercase tracking-wider">{opponentData?.name || '???'}</div>
                  <div className="text-2xl md:text-3xl font-black text-gray-500 font-display leading-none">{opponentData?.score || 0}</div>
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
    </div>
  );
}