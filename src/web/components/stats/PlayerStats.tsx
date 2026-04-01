import React, { useEffect, useState } from 'react';
import { TrendingUp, Swords, Zap, Target } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Stats {
  totalGames: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  currentElo: number;
  maxElo: number;
}

export function PlayerStats() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: matches } = await supabase
        .from('matches')
        .select('winner_id')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`);

      const total = matches?.length || 0;
      const wins = matches?.filter(m => m.winner_id === user.id).length || 0;
      const losses = total - wins;

      let currentStreak = 0, bestStreak = 0, cur = 0;
      for (const m of (matches || []).reverse()) {
        if (m.winner_id === user.id) { cur++; bestStreak = Math.max(bestStreak, cur); }
        else cur = 0;
      }
      currentStreak = cur;

      setStats({
        totalGames: total, wins, losses, currentStreak, bestStreak,
        currentElo: profile?.elo || 1000,
        maxElo: profile?.elo || 1000,
      });
      setLoading(false);
    };
    load();
  }, [user, profile]);

  if (loading) return <div className="animate-pulse h-40 bg-white/5 rounded-2xl" />;
  if (!stats) return null;

  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard icon={<Swords size={18} />} label="Partidas" value={stats.totalGames} color="blue" />
      <StatCard icon={<Target size={18} />} label="Win Rate" value={`${winRate}%`} color="green" />
      <StatCard icon={<TrendingUp size={18} />} label="ELO" value={stats.currentElo} color="yellow" />
      <StatCard icon={<Zap size={18} />} label="Mejor racha" value={stats.bestStreak} color="purple" />
      <div className="col-span-2 bg-white/5 rounded-2xl p-4 border border-white/10">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-green-400 font-bold">V: {stats.wins}</span>
          <span className="text-gray-400">vs</span>
          <span className="text-red-400 font-bold">D: {stats.losses}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full"
            style={{ width: `${winRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colors = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };
  return (
    <div className={`rounded-2xl p-4 border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1 opacity-70">{icon}<span className="text-xs uppercase tracking-widest font-bold">{label}</span></div>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  );
}
