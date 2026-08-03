import React from 'react';
import { Trophy, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChampionshipCelebrationModalProps {
  rankPosition: number;
  currentPrizeUsd: number;
  onOpenKyc: () => void;
  onClose: () => void;
}

export const ChampionshipCelebrationModal: React.FC<ChampionshipCelebrationModalProps> = ({
  rankPosition,
  currentPrizeUsd,
  onOpenKyc,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 font-['Chakra_Petch']">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 30 }}
        className="w-full max-w-lg bg-[#0a0f24] border-2 border-casino-gold rounded-3xl p-6 sm:p-8 text-center relative shadow-[0_0_60px_rgba(251,191,36,0.5)] overflow-hidden"
      >
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-casino-gold/20 rounded-full blur-3xl pointer-events-none"></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Trophy icon */}
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-casino-gold via-amber-400 to-yellow-600 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-bounce">
          <Trophy className="w-10 h-10 text-slate-950" />
        </div>

        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-full text-xs font-black uppercase tracking-widest inline-block mb-2">
          🎉 ¡OFICIALMENTE CLASIFICADO!
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase font-['Russo_One'] tracking-wide mb-2">
          ¡ESTÁS EN EL TOP 32!
        </h2>

        <p className="text-sm text-gray-300 mb-6 leading-relaxed">
          Lograste el puesto <strong className="text-casino-gold font-mono">#{rankPosition}</strong> en el ranking acumulativo de la Liga. Has clasificado al Gran Torneo final para disputar el pozo de <strong className="text-emerald-400 font-mono">${currentPrizeUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</strong>.
        </p>

        <div className="bg-black/60 border border-white/10 rounded-2xl p-4 mb-6 space-y-2 text-left">
          <div className="flex items-center gap-2 text-xs text-yellow-400 font-bold">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Requisito Obligatorio: Verificación KYC</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Para garantizar la transparencia y poder efectuar el pago del premio en dólares en caso de ganar, debes verificar tu documento de identidad antes de iniciar tu primera ronda.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenKyc();
            }}
            className="flex-1 py-3.5 px-6 bg-gradient-to-r from-casino-gold to-yellow-600 hover:from-yellow-400 hover:to-casino-gold text-slate-950 font-black rounded-xl uppercase tracking-widest text-xs font-['Russo_One'] transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Verificar KYC Ahora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
