import React from 'react';
import { LandingStats } from '../hooks/useLandingData';

interface Props {
  stats: LandingStats;
  loading: boolean;
}

export default function StatsBar({ stats, loading }: Props) {
  const items = [
    { label: 'Jugadores registrados', value: loading ? '...' : stats.totalPlayers.toLocaleString() },
    { label: 'Partidas jugadas', value: loading ? '...' : stats.totalMatches.toLocaleString() },
    { label: 'Torneos activos', value: loading ? '...' : stats.activeTournaments.toString() },
    { label: 'Modos de juego', value: '2' },
  ];

  return (
    <section className="bg-black/40 border-y border-white/5 py-10">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {items.map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="text-3xl md:text-4xl font-black text-yellow-400 mb-1">{value}</div>
            <div className="text-gray-400 text-sm uppercase tracking-widest">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
