import React, { useEffect, useRef, useState } from 'react';
import { useLandingData } from '../hooks/useLandingData';
import TournamentCarousel from './TournamentCarousel';

function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1500;
          const steps = 30;
          const stepTime = duration / steps;
          let current = 0;
          const increment = value / steps;

          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, stepTime);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

const AVATAR_COLORS = ['#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'];

export default function CompetitiveHub() {
  const { leaderboard, events, stats, loading } = useLandingData();
  const top5 = leaderboard.slice(0, 5);

  return (
    <section className="py-20 px-6 relative">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-yellow-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-purple-500/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-[0.25em] text-casino-gold font-bold mb-2">
            Actualidad Competitiva
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            La <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">acción</span> en vivo
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Carrusel de Eventos */}
          <TournamentCarousel events={events} />

          {/* RIGHT: Rankings */}
          <div className="border-cyber-strong bg-white/[0.02] rounded-2xl p-6 sm:p-8 relative overflow-hidden group hover:bg-white/[0.04] transition-all duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/[0.06] to-transparent rounded-bl-full" />

            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold font-['Chakra_Petch']">Ranking Global</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black font-['Russo_One'] text-white mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Tablón</span> de Líderes
            </h3>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : top5.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm font-['Chakra_Petch']">Aún no hay datos</p>
                <p className="text-gray-600 text-xs mt-1 font-['Chakra_Petch']">Sé el primero en jugar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {top5.map((entry, i) => (
                  <div
                    key={entry.username}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:bg-white/[0.04] ${
                      i === 0 ? 'border-cyber bg-yellow-500/[0.04]' : ''
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black font-['Russo_One'] ${
                      i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-white/[0.06] text-gray-400'
                    }`}>
                      {i + 1}
                    </div>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-black"
                      style={{ backgroundColor: AVATAR_COLORS[i] || '#666' }}
                    >
                      {entry.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate font-['Chakra_Petch']">{entry.username}</span>
                        {i === 0 && <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider animate-glitch-fast">Leyenda</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black font-['Russo_One'] text-yellow-400">{entry.elo}</div>
                      <div className="text-[10px] text-gray-500">ELO</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 text-center">
              <a
                href="/login"
                className="text-xs text-gray-500 hover:text-yellow-400 transition-colors font-['Chakra_Petch'] uppercase tracking-wider cursor-pointer"
              >
                Ver Rankings Completos →
              </a>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-4 text-center">
            <div className="text-xl sm:text-2xl font-black font-['Russo_One'] text-yellow-400">
              {loading ? '...' : <CountUp value={stats.totalPlayers} />}
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">Jugadores</div>
          </div>
          <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-4 text-center">
            <div className="text-xl sm:text-2xl font-black font-['Russo_One'] text-yellow-400">
              {loading ? '...' : <CountUp value={stats.totalMatches} />}
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">Partidas</div>
          </div>
          <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-4 text-center">
            <div className="text-xl sm:text-2xl font-black font-['Russo_One'] text-yellow-400">
              {loading ? '...' : <CountUp value={stats.activeEvents} />}
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">Eventos</div>
          </div>
        </div>
      </div>
    </section>
  );
}
