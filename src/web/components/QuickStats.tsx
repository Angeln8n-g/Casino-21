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
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat, idx) => (
          <div 
            key={stat.label} 
            className="glass-panel p-3 text-center animate-slide-up"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className={`text-lg ${stat.color}`}>{stat.icon}</div>
            <div className="text-white font-bold text-lg font-display">{stat.value}</div>
            <div className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Division Card */}
      <div className={`glass-panel p-4 text-center border ${
        division.name === 'gold' ? 'border-yellow-500/20' :
        division.name === 'diamond' ? 'border-violet-500/20' :
        division.name === 'platinum' ? 'border-cyan-500/20' :
        'border-white/[0.06]'
      }`}>
        <div className="text-3xl mb-1">{division.icon}</div>
        <p className="font-display font-bold text-white">{division.label}</p>
        <p className="text-gray-500 text-[10px] uppercase tracking-widest">División actual</p>
      </div>

      {/* Mini Leaderboard */}
      <div>
        <h3 className="section-header">🏆 Top Jugadores</h3>
        <div className="glass-panel overflow-hidden">
          {loadingLeaderboard ? (
            <div className="p-3 space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-6 bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Sin datos aún
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {leaderboard.map((entry, idx) => {
                const entryDiv = getDivisionFromElo(entry.elo);
                const isCurrentUser = entry.username === profile?.username;
                return (
                  <div 
                    key={idx}
                    className={`flex items-center gap-3 px-3 py-2.5 ${isCurrentUser ? 'bg-casino-gold/5' : ''}`}
                  >
                    <span className={`w-5 text-center text-xs font-bold shrink-0 ${idx < 3 ? 'text-casino-gold' : 'text-gray-500'}`}>
                      {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                    </span>
                    <span className={`flex-1 text-sm truncate ${isCurrentUser ? 'text-casino-gold font-bold' : 'text-gray-300'}`}>
                      {entry.username}
                    </span>
                    <div className={`division-badge ${entryDiv.cssClass} text-[8px]`}>
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
  );
}
