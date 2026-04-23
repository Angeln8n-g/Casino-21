import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { getDivisionFromElo } from './ProfileHeader';

interface QuickStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

interface LeaderboardEntry {
  username: string;
  elo: number;
  wins: number;
}

export function QuickStats() {
  const { profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const elo = profile?.elo || 1000;
  const wins = profile?.wins || 0;
  const losses = profile?.losses || 0;
  const coins = profile?.coins || 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const division = getDivisionFromElo(elo);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, elo, wins')
        .order('elo', { ascending: false })
        .limit(5);

      if (!error && data) {
        setLeaderboard(data);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const stats: QuickStat[] = [
    { label: 'Monedas', value: coins.toLocaleString(), icon: '🪙', color: 'text-yellow-400' },
    { label: 'ELO', value: elo, icon: '⚔', color: 'text-casino-gold' },
    { label: 'Victorias', value: wins, icon: '✓', color: 'text-casino-emerald' },
    { label: 'Derrotas', value: losses, icon: '✗', color: 'text-red-400' },
    { label: 'Partidas', value: totalGames, icon: '🎲', color: 'text-purple-400' },
    { label: 'Win Rate', value: `${winRate}%`, icon: '📊', color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => {
          let shadowClass = '';
          if (stat.color.includes('yellow') || stat.color.includes('gold')) shadowClass = 'drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]';
          if (stat.color.includes('emerald')) shadowClass = 'drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]';
          if (stat.color.includes('red')) shadowClass = 'drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]';
          if (stat.color.includes('purple')) shadowClass = 'drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]';
          if (stat.color.includes('blue')) shadowClass = 'drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]';

          return (
            <div 
              key={stat.label} 
              className="glass-panel p-5 rounded-3xl text-center animate-slide-up flex flex-col justify-center items-center gap-1 border border-white/10 hover:border-casino-gold/30 transition-all bg-black/40 backdrop-blur-md shadow-lg"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className={`text-2xl mb-1 ${stat.color} ${shadowClass}`}>{stat.icon}</div>
              <div className="text-white font-black text-2xl font-display leading-none">{stat.value}</div>
              <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mt-1">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Division Card */}
        <div 
          className={`glass-panel p-6 rounded-3xl text-center border transition-all bg-black/40 backdrop-blur-md shadow-lg relative overflow-hidden group animate-slide-up ${
            division.name === 'gold' ? 'border-yellow-500/30 hover:border-yellow-500/50' :
            division.name === 'diamond' ? 'border-violet-500/30 hover:border-violet-500/50' :
            division.name === 'platinum' ? 'border-cyan-500/30 hover:border-cyan-500/50' :
            'border-white/10 hover:border-white/30'
          }`}
          style={{ animationDelay: '360ms' }}
        >
          <div className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity ${
            division.name === 'gold' ? 'bg-gradient-to-br from-yellow-500/40' :
            division.name === 'diamond' ? 'bg-gradient-to-br from-violet-500/40' :
            division.name === 'platinum' ? 'bg-gradient-to-br from-cyan-500/40' :
            'bg-gradient-to-br from-gray-500/40'
          }`}></div>
          <div className="relative z-10 flex flex-col items-center justify-center h-full">
            <div className="text-5xl mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse-slow">{division.icon}</div>
            <p className="font-display font-black text-3xl text-white tracking-widest uppercase">{division.label}</p>
            <p className="text-gray-500 text-xs uppercase tracking-widest font-bold mt-2">División Actual</p>
          </div>
        </div>

        {/* Mini Leaderboard */}
        <div 
          className="glass-panel p-5 rounded-3xl border border-white/10 hover:border-casino-gold/30 transition-all bg-black/40 backdrop-blur-md shadow-lg flex flex-col animate-slide-up"
          style={{ animationDelay: '420ms' }}
        >
          <h3 className="text-xs font-display font-black text-white uppercase tracking-widest italic mb-4 flex items-center gap-2">
            <span className="text-casino-gold">🏆</span> Top Jugadores
          </h3>
          <div className="flex-1 overflow-hidden">
            {loadingLeaderboard ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-8 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm font-bold uppercase tracking-widest">
                Sin datos aún
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => {
                  const entryDiv = getDivisionFromElo(entry.elo);
                  const isCurrentUser = entry.username === profile?.username;
                  return (
                    <div 
                      key={idx}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border border-transparent ${
                        isCurrentUser ? 'bg-casino-gold/10 border-casino-gold/30' : 'bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className={`w-6 text-center text-sm font-black shrink-0 ${idx < 3 ? 'text-casino-gold' : 'text-gray-500'}`}>
                        {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                      </span>
                      <span className={`flex-1 text-sm truncate tracking-wide ${isCurrentUser ? 'text-casino-gold font-black' : 'text-gray-300 font-bold'}`}>
                        {entry.username}
                      </span>
                      <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border bg-black/50 ${entryDiv.cssClass.replace('division-', 'border-').replace('text-', '')}`}>
                        {entry.elo}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
