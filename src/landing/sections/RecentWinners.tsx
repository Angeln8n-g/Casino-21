import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ShieldCheck, ArrowRight, Trophy } from 'lucide-react';
import type { WinnerProofItem } from '../hooks/useChampionshipLanding';

interface Props {
  winners: WinnerProofItem[];
  onOpenWinnersWall: () => void;
}

export default function RecentWinners({ winners, onOpenWinnersWall }: Props) {
  return (
    <section id="ganadores-section" className="py-16 px-4 sm:px-6 relative overflow-hidden bg-[#030712]">
      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Encabezado Bloque 3 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3.5 py-1.5 rounded-full mb-3 font-['Chakra_Petch'] uppercase tracking-widest">
            <ShieldCheck size={14} className="text-emerald-400" /> Pagos Reales Verificados
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-wide uppercase flex items-center justify-center gap-3">
            ACABAN DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">GANAR</span>
            <Trophy size={32} className="text-emerald-400 inline-block drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
          </h2>
          
          <p className="text-gray-400 text-sm sm:text-base font-['Chakra_Petch'] mt-2 max-w-lg mx-auto">
            Premios transferidos directamente a las cuentas bancarias o monederos de los jugadores.
          </p>
        </div>

        {/* CARDS DE GANADORES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {winners.slice(0, 2).map((winner, idx) => (
            <motion.div
              key={winner.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              onClick={onOpenWinnersWall}
              className="bg-[#080e1e] border border-emerald-500/30 hover:border-emerald-500/60 rounded-3xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-300 relative group overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

              <div className="flex items-center gap-4">
                {/* Foto avatar pixelada / retro */}
                <div className={`w-14 h-14 rounded-2xl border ${winner.avatarBg} flex items-center justify-center font-black font-['Russo_One'] text-2xl flex-shrink-0 shadow-md`}>
                  {winner.avatarLetter}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-white text-lg font-['Chakra_Petch'] truncate">{winner.name}</h3>
                    <span className="text-xs text-gray-400">({winner.city})</span>
                  </div>

                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black font-['Russo_One'] text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                      Ganó ${winner.amountUsd} USD
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400 font-['Chakra_Petch'] pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      Pagado por {winner.paymentMethod} hace {winner.hoursAgo} horas <CheckCircle2 size={13} className="text-emerald-400" />
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* LINK AL MURO COMPLETO DE GANADORES */}
        <div className="text-center">
          <button
            onClick={onOpenWinnersWall}
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-black text-base font-['Chakra_Petch'] uppercase tracking-wider transition-colors hover:underline group cursor-pointer"
          >
            <span>Ver muro de ganadores completo</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </section>
  );
}
