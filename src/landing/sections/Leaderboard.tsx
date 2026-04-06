import React from 'react';
import { LeaderboardEntry } from '../hooks/useLandingData';

interface Props {
  entries: LeaderboardEntry[];
  loading: boolean;
}

const DIVISION_COLORS: Record<string, string> = {
  diamond: 'text-cyan-400',
  platinum: 'text-purple-400',
  gold: 'text-yellow-400',
  silver: 'text-gray-300',
  bronze: 'text-orange-400',
};

function getDivision(elo: number): string {
  if (elo >= 2100) return 'diamond';
  if (elo >= 1800) return 'platinum';
  if (elo >= 1500) return 'gold';
  if (elo >= 1200) return 'silver';
  return 'bronze';
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ entries, loading }: Props) {
  return (
    <div>
      <h2 className="text-3xl font-black mb-2">Top Jugadores</h2>
      <p className="text-gray-400 text-sm mb-8">Ranking global por ELO</p>

      <div className="space-y-2">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
            ))
          : entries.length === 0
          ? <p className="text-gray-500 text-sm">Sin datos aún. ¡Sé el primero en jugar!</p>
          : entries.map((entry, i) => {
              const div = getDivision(entry.elo);
              return (
                <div
                  key={entry.username}
                  className="flex items-center gap-4 bg-white/3 border border-white/8 rounded-xl px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <span className="w-8 text-center text-lg">
                    {i < 3 ? RANK_MEDALS[i] : <span className="text-gray-500 font-bold text-sm">#{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{entry.username}</div>
                    <div className="text-xs text-gray-500">Nv. {entry.level} · {entry.wins}V {entry.losses}D</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-black text-lg ${DIVISION_COLORS[div]}`}>{entry.elo}</div>
                    <div className={`text-xs capitalize ${DIVISION_COLORS[div]} opacity-70`}>{div}</div>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
