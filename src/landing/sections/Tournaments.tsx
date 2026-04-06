import React from 'react';
import { ActiveTournament } from '../hooks/useLandingData';

interface Props {
  tournaments: ActiveTournament[];
  loading: boolean;
}

export default function Tournaments({ tournaments, loading }: Props) {
  return (
    <div>
      <h2 className="text-3xl font-black mb-2">Torneos Abiertos</h2>
      <p className="text-gray-400 text-sm mb-8">Únete ahora y compite por el título</p>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))
          : tournaments.length === 0
          ? (
            <div className="bg-white/3 border border-white/8 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <p className="text-gray-400 text-sm">No hay torneos abiertos ahora mismo.</p>
              <p className="text-gray-500 text-xs mt-1">¡Crea uno desde el juego!</p>
            </div>
          )
          : tournaments.map((t) => {
              const pct = (t.current_players / t.max_players) * 100;
              const spotsLeft = t.max_players - t.current_players;
              return (
                <div
                  key={t.id}
                  className="bg-white/3 border border-white/8 rounded-xl p-4 hover:border-yellow-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold">{t.name || `Torneo ${t.code}`}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">#{t.code}</div>
                    </div>
                    <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-lg border border-green-500/30">
                      ABIERTO
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {t.current_players}/{t.max_players} · {spotsLeft} libre{spotsLeft !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
      </div>

      <a
        href="/index.html"
        className="mt-6 block text-center bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors text-sm"
      >
        Ver todos los torneos →
      </a>
    </div>
  );
}
