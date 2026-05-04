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
  const tournamentsWon = (profile as any)?.tournaments_won || 0;
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
    { label: 'Torneos', value: tournamentsWon, icon: '🏆', color: 'text-orange-400' },
    { label: 'Win Rate', value: `${winRate}%`, icon: '📊', color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {stats.map((stat, idx) => {
          let shadowClass = '';
          let glowColor = '';
          
          if (stat.color.includes('yellow') || stat.color.includes('gold')) {
            shadowClass = 'drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]';
            glowColor = 'rgba(251,191,36,0.15)';
          }
          if (stat.color.includes('emerald')) {
            shadowClass = 'drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]';
            glowColor = 'rgba(16,185,129,0.15)';
          }
          if (stat.color.includes('red')) {
            shadowClass = 'drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]';
            glowColor = 'rgba(239,68,68,0.15)';
          }
          if (stat.color.includes('orange')) {
            shadowClass = 'drop-shadow-[0_0_15px_rgba(251,146,60,0.8)]';
            glowColor = 'rgba(251,146,60,0.15)';
          }
          if (stat.color.includes('blue')) {
            shadowClass = 'drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]';
            glowColor = 'rgba(59,130,246,0.15)';
          }

          return (
            <div 
              key={stat.label} 
              className="relative overflow-hidden p-5 rounded-2xl text-center animate-slide-up flex flex-col justify-center items-center gap-2 transition-all duration-300 group cursor-default hover:-translate-y-1"
              style={{ 
                animationDelay: `${idx * 60}ms`,
                background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.4) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: `0 8px 32px 0 rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.02), inset 0 0 20px ${glowColor}`
              }}
            >
              {/* Animated hover gradient */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                   style={{ background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)` }} />
                   
              <div className={`text-3xl mb-1 ${stat.color} ${shadowClass} transform group-hover:scale-110 transition-transform duration-300`}>
                {stat.icon}
              </div>
              <div className="text-white font-black text-2xl font-display leading-none tracking-tight z-10">
                {stat.value}
              </div>
              <div className="text-gray-400 text-[11px] uppercase tracking-[0.2em] font-bold mt-1 z-10 group-hover:text-white transition-colors">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Division Card */}
        <div 
          className={`relative overflow-hidden p-8 rounded-2xl text-center border transition-all duration-500 group animate-slide-up hover:-translate-y-1`}
          style={{ 
            animationDelay: '360ms',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.6) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: division.name === 'gold' ? 'rgba(251,191,36,0.3)' :
                         division.name === 'diamond' ? 'rgba(167,139,250,0.3)' :
                         division.name === 'platinum' ? 'rgba(34,211,238,0.3)' :
                         'rgba(255,255,255,0.1)',
            boxShadow: `0 10px 40px -10px rgba(0,0,0,0.5), inset 0 0 30px ${
                         division.name === 'gold' ? 'rgba(251,191,36,0.1)' :
                         division.name === 'diamond' ? 'rgba(167,139,250,0.1)' :
                         division.name === 'platinum' ? 'rgba(34,211,238,0.1)' :
                         'rgba(255,255,255,0.05)'
                       }`
          }}
        >
          {/* Animated Background Overlay */}
          <div className={`absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-700 ${
            division.name === 'gold' ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500/40 via-transparent to-transparent' :
            division.name === 'diamond' ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/40 via-transparent to-transparent' :
            division.name === 'platinum' ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/40 via-transparent to-transparent' :
            'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-400/40 via-transparent to-transparent'
          }`}></div>
          
          {/* Scanline effect overlay */}
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.5) 50%)', backgroundSize: '100% 4px' }}></div>

          <div className="relative z-10 flex flex-col items-center justify-center h-full">
            <div className={`text-6xl mb-4 transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_0_20px_${
              division.name === 'gold' ? 'rgba(251,191,36,0.8)' :
              division.name === 'diamond' ? 'rgba(167,139,250,0.8)' :
              division.name === 'platinum' ? 'rgba(34,211,238,0.8)' :
              'rgba(255,255,255,0.5)'
            }] animate-pulse-slow`}>
              {division.icon}
            </div>
            <p className="font-display font-black text-3xl text-white tracking-[0.15em] uppercase drop-shadow-md">
              {division.label}
            </p>
            <p className="text-gray-400 text-xs uppercase tracking-[0.25em] font-bold mt-3">División Actual</p>
          </div>
        </div>

        {/* Mini Leaderboard */}
        <div 
          className="relative overflow-hidden p-6 rounded-2xl border border-white/10 transition-all duration-300 flex flex-col animate-slide-up"
          style={{ 
            animationDelay: '420ms',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.5) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3)'
          }}
        >
          <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
            <h3 className="text-sm font-display font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
              <span className="text-casino-gold drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">🏆</span> 
              Top Jugadores
            </h3>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Global</span>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {loadingLeaderboard ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center opacity-50">
                <span className="text-3xl mb-2 grayscale">📊</span>
                <span className="text-xs uppercase tracking-widest font-bold">Sin datos aún</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {leaderboard.map((entry, idx) => {
                  const entryDiv = getDivisionFromElo(entry.elo);
                  const isCurrentUser = entry.username === profile?.username;
                  
                  return (
                    <div 
                      key={idx}
                      className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 border ${
                        isCurrentUser 
                          ? 'bg-casino-gold/10 border-casino-gold/30 shadow-[inset_0_0_15px_rgba(251,191,36,0.1)]' 
                          : 'bg-white/[0.02] border-transparent hover:bg-white/[0.06] hover:border-white/10'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${
                        idx === 0 ? 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 
                        idx === 1 ? 'bg-gray-400/20 text-gray-300 shadow-[0_0_10px_rgba(156,163,175,0.3)]' : 
                        idx === 2 ? 'bg-amber-700/20 text-amber-600 shadow-[0_0_10px_rgba(180,83,9,0.3)]' : 
                        'bg-white/5 text-gray-500'
                      }`}>
                        {idx === 0 ? '1' : idx === 1 ? '2' : idx === 2 ? '3' : `${idx + 1}`}
                      </div>
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span className={`text-sm truncate tracking-wide ${
                          isCurrentUser ? 'text-casino-gold font-black' : 
                          idx < 3 ? 'text-white font-bold' : 'text-gray-300 font-medium'
                        }`}>
                          {entry.username}
                        </span>
                        {isCurrentUser && <span className="text-[9px] text-casino-gold/70 uppercase tracking-widest">Tú</span>}
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <div className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border bg-black/60 shadow-inner ${entryDiv.cssClass.replace('division-', 'border-').replace('text-', '')}`}>
                          {entry.elo} ELO
                        </div>
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
