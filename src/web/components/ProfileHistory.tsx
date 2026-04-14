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
      <div className="text-center p-8 glass-panel rounded-2xl">
        <Swords className="mx-auto text-gray-500 mb-4 opacity-50" size={48} />
        <p className="text-gray-400 font-bold">Aún no has jugado ninguna partida.</p>
        <p className="text-sm text-gray-500 mt-2">¡Entra al Matchmaking para empezar a escribir tu historia!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display font-black text-xl text-white mb-6 flex items-center gap-2">
        <Clock className="text-casino-gold" />
        HISTORIAL DE PARTIDAS
      </h3>

      <div className="grid gap-4">
        {history.map((match) => {
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
              className={`glass-panel p-4 rounded-2xl border-l-4 relative overflow-hidden flex items-center justify-between gap-4 transition-all hover:bg-white/5 ${
                isWinner ? 'border-l-green-500' : isTie ? 'border-l-gray-500' : 'border-l-red-500'
              }`}
            >
              {/* Background gradient hint */}
              <div className={`absolute inset-0 opacity-10 pointer-events-none ${
                isWinner ? 'bg-gradient-to-r from-green-500 to-transparent' : 
                isTie ? 'bg-gradient-to-r from-gray-500 to-transparent' : 
                'bg-gradient-to-r from-red-500 to-transparent'
              }`} />

              {/* Left: Result & Mode */}
              <div className="relative z-10 w-1/4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-black uppercase tracking-wider text-sm ${
                    isWinner ? 'text-green-400' : isTie ? 'text-gray-400' : 'text-red-400'
                  }`}>
                    {isWinner ? 'VICTORIA' : isTie ? 'EMPATE' : 'DERROTA'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                  <Calendar size={12} />
                  {formattedDate}
                </div>
                <div className="mt-2 text-[10px] font-bold uppercase bg-white/10 text-gray-300 inline-block px-2 py-0.5 rounded">
                  {match.game_mode === 'tournament' ? '🏆 Torneo' : match.game_mode.toUpperCase()}
                </div>
              </div>

              {/* Middle: Scores */}
              <div className="relative z-10 flex-1 flex justify-center items-center gap-6">
                <div className="text-right">
                  <div className="text-sm font-bold text-white truncate max-w-[100px]">{myData.name}</div>
                  <div className="text-2xl font-black text-casino-gold">{myData.score}</div>
                </div>
                
                <div className="text-gray-600 font-black text-xl italic px-4">VS</div>
                
                <div className="text-left">
                  <div className="text-sm font-bold text-gray-400 truncate max-w-[100px]">{opponentData?.name || '???'}</div>
                  <div className="text-2xl font-black text-gray-300">{opponentData?.score || 0}</div>
                </div>
              </div>

              {/* Right: Rewards (ELO & Coins) */}
              <div className="relative z-10 w-1/4 text-right flex flex-col items-end gap-1">
                <div className={`font-mono font-bold flex items-center gap-1 text-sm ${
                  myData.elo_change > 0 ? 'text-green-400' : myData.elo_change < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  <Trophy size={14} />
                  {myData.elo_change > 0 ? '+' : ''}{myData.elo_change} ELO
                </div>
                
                <div className="font-mono font-bold flex items-center gap-1 text-sm text-casino-gold">
                  🪙 +{myData.coins_earned}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}