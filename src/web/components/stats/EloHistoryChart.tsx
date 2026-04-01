import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';

interface EloPoint {
  elo: number;
  change: number;
  timestamp: string;
}

export function EloHistoryChart() {
  const { user } = useAuth();
  const [history, setHistory] = useState<EloPoint[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('elo_history')
      .select('elo, change, timestamp')
      .eq('player_id', user.id)
      .order('timestamp', { ascending: true })
      .limit(30)
      .then(({ data }) => setHistory(data || []));
  }, [user]);

  if (history.length === 0) {
    return (
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
        <TrendingUp size={24} className="text-gray-500 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Sin historial de ELO aún</p>
      </div>
    );
  }

  const min = Math.min(...history.map(h => h.elo)) - 50;
  const max = Math.max(...history.map(h => h.elo)) + 50;
  const range = max - min;
  const w = 300, h = 100;

  const points = history.map((p, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((p.elo - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  const lastElo = history[history.length - 1]?.elo;
  const firstElo = history[0]?.elo;
  const diff = lastElo - firstElo;

  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-yellow-400" />
          <span className="text-sm font-bold text-white">Historial ELO</span>
        </div>
        <span className={`text-sm font-bold ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {diff >= 0 ? '+' : ''}{diff}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
        <polyline
          points={points}
          fill="none"
          stroke={diff >= 0 ? '#22c55e' : '#ef4444'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{firstElo}</span>
        <span className="text-white font-bold">{lastElo}</span>
      </div>
    </div>
  );
}
