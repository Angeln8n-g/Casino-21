import React, { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';

type Division = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

const DIVISION_CONFIG: Record<Division, { label: string; color: string; min: number; max: number }> = {
  bronze:   { label: 'Bronce',   color: 'text-orange-400',  min: 0,    max: 1199 },
  silver:   { label: 'Plata',    color: 'text-gray-300',    min: 1200, max: 1499 },
  gold:     { label: 'Oro',      color: 'text-yellow-400',  min: 1500, max: 1799 },
  platinum: { label: 'Platino',  color: 'text-cyan-400',    min: 1800, max: 2099 },
  diamond:  { label: 'Diamante', color: 'text-blue-400',    min: 2100, max: Infinity },
};

interface Entry {
  id: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
}

export function LeagueLeaderboard() {
  const { user, profile } = useAuth();
  const [division, setDivision] = useState<Division>('gold');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  // Detectar división del jugador actual
  useEffect(() => {
    if (!profile?.elo) return;
    const elo = profile.elo;
    for (const [div, cfg] of Object.entries(DIVISION_CONFIG)) {
      if (elo >= cfg.min && elo <= cfg.max) {
        setDivision(div as Division);
        break;
      }
    }
  }, [profile]);

  useEffect(() => {
    setLoading(true);
    const cfg = DIVISION_CONFIG[division];
    supabase
      .from('profiles')
      .select('id, username, elo, wins, losses')
      .gte('elo', cfg.min)
      .lte('elo', cfg.max === Infinity ? 9999 : cfg.max)
      .order('elo', { ascending: false })
      .limit(100)
      .then(({ data }) => { setEntries(data || []); setLoading(false); });
  }, [division]);

  const cfg = DIVISION_CONFIG[division];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Crown size={18} className="text-yellow-400" />
        <h3 className="text-white font-bold">Clasificación</h3>
      </div>

      {/* Tabs de división */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(DIVISION_CONFIG) as Division[]).map(d => (
          <button
            key={d}
            onClick={() => setDivision(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${division === d ? `bg-white/20 ${DIVISION_CONFIG[d].color}` : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
          >
            {DIVISION_CONFIG[d].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${entry.id === user?.id ? 'bg-yellow-500/20 border border-yellow-500/30' : 'hover:bg-white/5'}`}
            >
              <span className={`w-6 text-center font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                {i + 1}
              </span>
              <span className="flex-1 text-white font-medium truncate">{entry.username}</span>
              <span className={`font-black ${cfg.color}`}>{entry.elo}</span>
              <span className="text-gray-500 text-xs">{entry.wins}V/{entry.losses}D</span>
            </div>
          ))}
          {entries.length === 0 && <p className="text-center text-gray-500 text-sm py-4">Sin jugadores en esta división</p>}
        </div>
      )}
    </div>
  );
}
