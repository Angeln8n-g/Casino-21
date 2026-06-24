import React, { useEffect, useRef, useState } from 'react';
import { Trophy, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LeaderboardEntry } from '../hooks/useLandingData';

const AVATAR_COLORS = ['#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'];

function getDivisionStyle(elo: number): { name: string; class: string } {
  if (elo >= 2100) return { name: 'Diamante', class: 'division-diamond' };
  if (elo >= 1800) return { name: 'Platino', class: 'division-platinum' };
  if (elo >= 1500) return { name: 'Oro', class: 'division-gold' };
  if (elo >= 1200) return { name: 'Plata', class: 'division-silver' };
  return { name: 'Bronce', class: 'division-bronze' };
}

function getDivisionGlow(elo: number): string {
  if (elo >= 2100) return 'hover:border-violet-500/25 hover:shadow-[0_0_15px_rgba(139,92,246,0.1)]';
  if (elo >= 1800) return 'hover:border-cyan-500/25 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]';
  if (elo >= 1500) return 'hover:border-yellow-500/25 hover:shadow-[0_0_15px_rgba(251,191,36,0.1)]';
  if (elo >= 1200) return 'hover:border-gray-400/20 hover:shadow-[0_0_12px_rgba(156,163,175,0.05)]';
  return 'hover:border-amber-700/20 hover:shadow-[0_0_12px_rgba(180,83,9,0.05)]';
}

function RankBadge({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0 select-none">
        <Trophy size={18} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
        <span className="absolute bottom-0 right-0 bg-yellow-500 text-black text-[8px] font-black font-['Russo_One'] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-black shadow">1</span>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0 select-none">
        <Trophy size={18} className="text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.5)]" />
        <span className="absolute bottom-0 right-0 bg-gray-400 text-black text-[8px] font-black font-['Russo_One'] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-black shadow">2</span>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0 select-none">
        <Trophy size={16} className="text-amber-600 drop-shadow-[0_0_6px_rgba(180,83,9,0.4)]" />
        <span className="absolute bottom-0 right-0 bg-amber-700 text-white text-[8px] font-black font-['Russo_One'] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-black shadow">3</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-500 flex items-center justify-center text-xs font-black font-['Russo_One'] flex-shrink-0 select-none">
      {index + 1}
    </div>
  );
}

const listContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
} as const;

const rowVariants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 260, damping: 25 } },
} as const;

interface Props {
  leaderboard: LeaderboardEntry[];
  loading: boolean;
}

export default function LeaderboardSection({ leaderboard, loading }: Props) {
  const top5 = leaderboard.slice(0, 5);

  return (
    <section id="rankings" className="py-20 px-6 relative overflow-hidden bg-transparent">
      {/* Ambient background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-500/[0.01] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/[0.015] rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold mb-2 font-['Chakra_Petch'] flex items-center justify-center gap-1.5">
            <Trophy size={10} /> Competencia Global
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            Tablón de <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 neon-blue">Líderes</span>
          </h2>
          <p className="text-gray-400 text-sm mt-3 font-['Chakra_Petch'] max-w-md mx-auto">
            Los mejores duelistas de Kasino21. Juega ranked y reclama tu lugar entre las leyendas.
          </p>
        </div>

        {/* Leaderboard Card wrapper */}
        <div className="max-w-2xl mx-auto border border-white/[0.06] bg-[#050811]/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl hover:border-cyan-500/10 transition-colors duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/[0.02] to-transparent rounded-bl-full pointer-events-none" />

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
            <motion.div 
              variants={listContainerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-50px' }}
              className="space-y-2.5"
            >
              {top5.map((entry, i) => {
                const divStyle = getDivisionStyle(entry.elo);
                const glowClass = getDivisionGlow(entry.elo);
                return (
                  <motion.div
                    key={entry.username}
                    variants={rowVariants}
                    className={`flex items-center gap-3.5 p-3 rounded-xl transition-all duration-300 hover:bg-white/[0.03] border border-transparent ${glowClass} ${
                      i === 0 ? 'bg-cyan-500/[0.02] border-cyan-500/10' : 'bg-white/[0.005]'
                    }`}
                  >
                    {/* Rank Medals */}
                    <RankBadge index={i} />

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
                          <span className="text-[7px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">
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
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          <div className="mt-6 text-center">
            <a
              href="/login"
              className="inline-flex items-center text-xs text-gray-500 hover:text-cyan-400 transition-colors font-['Chakra_Petch'] uppercase tracking-widest cursor-pointer"
            >
              Ver Rankings Completos →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
