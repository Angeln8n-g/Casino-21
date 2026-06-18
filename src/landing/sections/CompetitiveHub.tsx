import React, { useEffect, useRef, useState } from 'react';
import TournamentCarousel from './TournamentCarousel';
import { Trophy, Users, Activity, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LeaderboardEntry, EventItem, LandingStats } from '../hooks/useLandingData';

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
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

const AVATAR_COLORS = ['#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'];

function getDivisionStyle(elo: number): { name: string; class: string } {
  if (elo >= 2100) return { name: 'Diamante', class: 'division-diamond' };
  if (elo >= 1800) return { name: 'Platino', class: 'division-platinum' };
  if (elo >= 1500) return { name: 'Oro', class: 'division-gold' };
  if (elo >= 1200) return { name: 'Plata', class: 'division-silver' };
  return { name: 'Bronce', class: 'division-bronze' };
}

interface Props {
  leaderboard: LeaderboardEntry[];
  events: EventItem[];
  stats: LandingStats;
  loading: boolean;
}

export default function CompetitiveHub({ leaderboard, events, stats, loading }: Props) {
  const top5 = leaderboard.slice(0, 5);

  // Live activity simulated notifications feed
  const [liveFeed, setLiveFeed] = useState<string[]>([]);
  const tickerItems = [
    'Carlos_99 acaba de ganar un Duelo 1v1 en Mesa Diamante.',
    'Torneo Relámpago comenzará en 10 minutos. ¡Inscríbete ya!',
    'Jugador "Pro21" alcanzó una racha de 5 victorias consecutivas.',
    'Un nuevo torneo con pozo de $1,500 en premios ha sido creado.',
    'Mesa 2v2 activa: TeamAlpha vs TeamOmega jugando ahora.',
  ];

  useEffect(() => {
    setLiveFeed([tickerItems[0], tickerItems[1]]);
    const interval = setInterval(() => {
      const randomMsg = tickerItems[Math.floor(Math.random() * tickerItems.length)];
      setLiveFeed(prev => [randomMsg, prev[0]]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 px-6 relative overflow-hidden bg-transparent">
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-yellow-500/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-[10px] uppercase tracking-[0.25em] text-yellow-400 font-bold mb-2 font-['Chakra_Petch']">
            Competición Activa
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            La <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">acción</span> en vivo
          </h2>
          <p className="text-gray-400 text-sm mt-3 font-['Chakra_Petch']">
            Torneos semanales oficiales y rankings globales actualizados en tiempo real.
          </p>
        </div>

        {/* Live Feed Ticker */}
        <div className="mb-10 bg-white/[0.01] border border-white/[0.04] rounded-xl py-3 px-6 overflow-hidden flex items-center gap-4 max-w-4xl mx-auto">
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] flex-shrink-0 animate-pulse font-['Chakra_Petch']">
            <Activity size={10} /> En Vivo
          </span>
          <div className="flex-1 min-w-0 h-5 relative">
            {liveFeed.map((msg, i) => (
              <motion.p
                key={`${msg}-${i}`}
                initial={{ opacity: 0, y: i === 0 ? 15 : -15 }}
                animate={{ opacity: i === 0 ? 1 : 0, y: i === 0 ? 0 : -15 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 text-xs text-gray-400 truncate font-['Chakra_Petch']"
              >
                {msg}
              </motion.p>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: Carrusel de Eventos */}
          <div className="flex flex-col h-full">
            <TournamentCarousel events={events} />
          </div>

          {/* RIGHT: Rankings */}
          <div className="border border-white/[0.06] bg-[#050811]/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden group hover:border-yellow-500/20 transition-all duration-500 flex flex-col justify-between shadow-lg backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-500/[0.04] to-transparent rounded-bl-full pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold font-['Chakra_Petch']">Ranking Global</span>
                <span className="text-yellow-400 text-[10px] uppercase font-bold font-['Chakra_Petch'] flex items-center gap-1">
                  <Trophy size={12} /> Top Leyendas
                </span>
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
                <div className="text-center py-12 flex flex-col items-center justify-center border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.005]">
                  <ShieldAlert className="text-gray-600 mb-2" size={24} />
                  <p className="text-gray-500 text-xs font-['Chakra_Petch']">Aún no hay datos de ELO registrados</p>
                  <p className="text-gray-600 text-[10px] mt-1 font-['Chakra_Petch'] uppercase tracking-wider">¡Sé el primero en jugar ranked!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {top5.map((entry, i) => {
                    const divStyle = getDivisionStyle(entry.elo);
                    return (
                      <div
                        key={entry.username}
                        className={`flex items-center gap-3.5 p-3 rounded-xl transition-all duration-300 hover:bg-white/[0.03] border border-transparent ${
                          i === 0 ? 'bg-yellow-500/[0.03] border-yellow-500/10' : 'bg-white/[0.005]'
                        }`}
                      >
                        {/* Rank Medals */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black font-['Russo_One'] ${
                          i === 0 ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-[0_0_10px_rgba(251,191,36,0.3)]' :
                          i === 1 ? 'bg-gray-400 text-black' :
                          i === 2 ? 'bg-amber-700 text-white' :
                          'bg-white/[0.04] text-gray-500 border border-white/[0.02]'
                        }`}>
                          {i + 1}
                        </div>

                        {/* Custom Avatar Icon */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-black select-none"
                          style={{ backgroundColor: AVATAR_COLORS[i] || '#666' }}
                        >
                          {entry.username.charAt(0).toUpperCase()}
                        </div>

                        {/* Username & Division */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate font-['Chakra_Petch']">{entry.username}</span>
                            {i === 0 && (
                              <span className="text-[7px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">
                                Leyenda
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`division-badge ${divStyle.class} text-[8px] py-0 px-2 rounded-full font-bold uppercase`}>
                              {divStyle.name}
                            </span>
                            <span className="text-[10px] text-gray-500 font-['Chakra_Petch']">Nv. {entry.level}</span>
                          </div>
                        </div>

                        {/* Elo Count */}
                        <div className="text-right">
                          <div className="text-sm font-black font-['Russo_One'] text-yellow-400">{entry.elo}</div>
                          <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest font-['Chakra_Petch']">ELO</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <a
                href="/login"
                className="inline-flex items-center text-xs text-gray-500 hover:text-yellow-400 transition-colors font-['Chakra_Petch'] uppercase tracking-widest cursor-pointer"
              >
                Ver Rankings Completos →
              </a>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="border border-white/[0.06] bg-[#050811]/20 rounded-2xl p-4 text-center backdrop-blur-xl relative group hover:border-yellow-500/10 transition-all duration-300">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-yellow-500/[0.01] rounded-full blur-xl group-hover:bg-yellow-500/[0.03] transition-all" />
            <div className="text-2xl sm:text-3xl font-black font-['Russo_One'] text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">
              {loading ? '...' : <CountUp value={stats.totalPlayers} />}
            </div>
            <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.25em] text-gray-500 mt-1 font-['Chakra_Petch']">Jugadores</div>
          </div>
          
          <div className="border border-white/[0.06] bg-[#050811]/20 rounded-2xl p-4 text-center backdrop-blur-xl relative group hover:border-yellow-500/10 transition-all duration-300">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-yellow-500/[0.01] rounded-full blur-xl group-hover:bg-yellow-500/[0.03] transition-all" />
            <div className="text-2xl sm:text-3xl font-black font-['Russo_One'] text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">
              {loading ? '...' : <CountUp value={stats.totalMatches} />}
            </div>
            <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.25em] text-gray-500 mt-1 font-['Chakra_Petch']">Partidas</div>
          </div>

          <div className="border border-white/[0.06] bg-[#050811]/20 rounded-2xl p-4 text-center backdrop-blur-xl relative group hover:border-yellow-500/10 transition-all duration-300">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-yellow-500/[0.01] rounded-full blur-xl group-hover:bg-yellow-500/[0.03] transition-all" />
            <div className="text-2xl sm:text-3xl font-black font-['Russo_One'] text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">
              {loading ? '...' : <CountUp value={stats.activeEvents} />}
            </div>
            <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.25em] text-gray-500 mt-1 font-['Chakra_Petch']">Eventos</div>
          </div>
        </div>
      </div>
    </section>
  );
}
