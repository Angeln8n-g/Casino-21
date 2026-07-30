import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Eye, Target, Zap, Send } from 'lucide-react';

interface Props {
  onOpenSponsorModal: () => void;
}

export default function BrandCTA({ onOpenSponsorModal }: Props) {
  return (
    <section id="marcas-section" className="py-20 px-4 sm:px-6 relative overflow-hidden bg-[#030612]">
      {/* Subtle Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-b from-[#0b1329] to-[#050a18] border-2 border-blue-500/30 rounded-3xl p-8 sm:p-12 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative overflow-hidden backdrop-blur-xl"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-bl-full pointer-events-none" />

          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold px-3.5 py-1.5 rounded-full mb-6 font-['Chakra_Petch'] uppercase tracking-widest">
            <Building2 size={14} className="text-blue-400" /> Patrocinio Corporativo
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-wide uppercase leading-tight mb-4">
            ¿TU MARCA QUIERE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500">PATROCINAR EL PRÓXIMO?</span>
          </h2>

          <p className="text-xl sm:text-2xl font-bold font-['Chakra_Petch'] text-cyan-300 mb-8">
            12,000+ jugadores esperando ver tus anuncios
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-9 text-left font-['Chakra_Petch']">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <Eye size={22} className="text-cyan-400 flex-shrink-0" />
              <div>
                <div className="text-white font-bold text-sm">100% Atención</div>
                <div className="text-gray-400 text-xs">Vistas completas sin saltar</div>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <Target size={22} className="text-yellow-400 flex-shrink-0" />
              <div>
                <div className="text-white font-bold text-sm">Target Gamer/RD</div>
                <div className="text-gray-400 text-xs">Público activo 18-35 años</div>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <Zap size={22} className="text-emerald-400 flex-shrink-0" />
              <div>
                <div className="text-white font-bold text-sm">Reportes CTR</div>
                <div className="text-gray-400 text-xs">Métricas de clics en vivo</div>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenSponsorModal}
            className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 hover:from-blue-400 hover:to-cyan-300 text-black font-black text-lg px-10 py-5 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all duration-300 transform hover:scale-105 font-['Russo_One'] uppercase tracking-wider w-full sm:w-auto cursor-pointer"
          >
            <Send size={20} className="text-black" />
            COTIZAR TORNEO PARA MARCAS
          </button>
        </motion.div>
      </div>
    </section>
  );
}
