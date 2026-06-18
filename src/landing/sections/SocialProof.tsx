import React from 'react';
import { motion } from 'framer-motion';
import { Star, ShieldCheck, Users, Flame, Percent } from 'lucide-react';
import type { TestimonialEntry } from '../hooks/useLandingData';

interface Props {
  testimonials: TestimonialEntry[];
  loading: boolean;
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < count ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
        />
      ))}
    </div>
  );
}

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function SocialProof({ testimonials, loading }: Props) {
  return (
    <section className="py-24 px-6 relative overflow-hidden bg-gradient-to-b from-black to-[#020617]">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold mb-2 font-['Chakra_Petch']">
            Opinión de la Comunidad
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            Lo que dicen nuestros <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">jugadores</span>
          </h2>
          <p className="text-gray-400 text-sm mt-3 font-['Chakra_Petch'] max-w-md mx-auto">
            Únete a una comunidad en crecimiento con miles de duelos disputados a diario.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-44 bg-white/[0.02] border border-white/[0.06] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
          >
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={itemVariants}
                whileHover={{ y: -5, borderColor: 'rgba(251,191,36,0.15)' }}
                className="bg-white/[0.015] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl relative transition-all duration-300 flex flex-col justify-between"
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 25px rgba(0,0,0,0.5)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-xs font-black text-yellow-400 font-['Russo_One'] border border-yellow-500/20">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-1 font-['Chakra_Petch']">
                          {t.name} <ShieldCheck size={12} className="text-yellow-400" />
                        </div>
                        <Stars count={t.rating} />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed font-['Chakra_Petch']">
                    "{t.text}"
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                  <span className={`division-badge ${t.rankClass} text-[8px] py-0 px-2 rounded-full font-bold uppercase`}>
                    {t.rank}
                  </span>
                  <span className="text-[10px] text-yellow-500 font-bold font-['Chakra_Petch']">
                    {t.elo} ELO
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Global Stats Counter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-center border border-white/[0.06] bg-white/[0.01] rounded-3xl p-8 backdrop-blur-xl">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-3 text-yellow-400">
              <Star size={18} fill="currentColor" />
            </div>
            <div className="text-2xl font-black text-white font-['Russo_One']">4.8/5</div>
            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-['Chakra_Petch']">Valoración Media</div>
          </div>
          <div className="w-full h-px bg-white/5 sm:hidden" />
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-3 text-cyan-400">
              <Flame size={18} />
            </div>
            <div className="text-2xl font-black text-white font-['Russo_One']">+10K</div>
            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-['Chakra_Petch']">Partidas Diarias</div>
          </div>
          <div className="w-full h-px bg-white/5 sm:hidden" />
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-emerald-400">
              <Percent size={18} />
            </div>
            <div className="text-2xl font-black text-white font-['Russo_One']">99.9%</div>
            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-['Chakra_Petch']">Uptime del Servidor</div>
          </div>
        </div>
      </div>
    </section>
  );
}
