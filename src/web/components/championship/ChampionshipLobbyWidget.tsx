import React, { useState, useEffect } from 'react';
import { Trophy, Gift, ArrowRight, Eye, Play, Star, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { ChampionshipLeaderboardModal } from './ChampionshipLeaderboardModal';

export const ChampionshipLobbyWidget: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPrize, setCurrentPrize] = useState(1240);
  const [targetViews, setTargetViews] = useState(60000);
  const [targetPrize, setTargetPrize] = useState(1250);
  const [viewsProgress, setViewsProgress] = useState(35000);
  const [rank, setRank] = useState<number | null>(47);
  const [phase, setPhase] = useState<'league' | 'cut' | 'final' | 'completed'>('league');
  
  const progressPercent = Math.min(100, Math.max(0, (viewsProgress / targetViews) * 100));

  return (
    <>
      <div className="relative w-full max-w-4xl mx-auto mb-6 group cursor-pointer" onClick={() => setIsModalOpen(true)}>
        {/* Animated glowing border */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-casino-gold via-yellow-300 to-casino-gold rounded-3xl opacity-50 blur-[2px] group-hover:opacity-100 transition-opacity duration-500 animate-gradient-x"></div>
        
        {/* Main content container */}
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 p-5 md:p-6 bg-slate-950/90 rounded-3xl overflow-hidden border border-casino-gold/30">
          
          {/* Background patterns */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute right-0 top-0 w-64 h-64 bg-casino-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          {/* Left section: Branding & Status */}
          <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-casino-gold to-yellow-700 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)]">
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest text-shadow-gold">KASINO21 CHAMPIONSHIP</h2>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-full">
                  {phase === 'league' ? 'Liga Activa' : phase === 'cut' ? 'Corte' : phase === 'final' ? 'Final en Vivo' : 'Completado'}
                </span>
              </div>
              <p className="text-xs md:text-sm text-casino-gold/80 font-bold tracking-widest uppercase">
                Patrocinado por <span className="text-casino-gold">Premium Brands</span>
              </p>
              {rank && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                  <Star className="w-3 h-3 text-casino-gold" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Tu Posición: <span className="text-casino-gold">#{rank}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Middle section: Prize Pool Progress */}
          <div className="relative z-10 w-full md:flex-1 md:max-w-md flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pozo Actual</p>
                <p className="text-2xl md:text-3xl font-black text-casino-gold drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                  ${currentPrize.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Próxima Meta</p>
                <p className="text-sm font-black text-white">${targetPrize.toLocaleString()}</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 relative">
              <motion.div 
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-yellow-600 via-casino-gold to-yellow-300 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
            
            <p className="text-[10px] md:text-xs font-bold text-center text-gray-300 uppercase tracking-wider">
              Faltan <span className="text-casino-gold">{(targetViews - viewsProgress).toLocaleString()} vistas</span> para aumentar el pozo
            </p>
          </div>

          {/* Right section: CTA */}
          <div className="relative z-10 w-full md:w-auto flex flex-col items-center gap-3">
            <button 
              className="w-full md:w-auto px-6 py-3 md:py-4 bg-gradient-to-r from-casino-gold to-yellow-600 hover:from-yellow-400 hover:to-casino-gold text-slate-950 font-black rounded-xl uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:shadow-[0_0_30px_rgba(251,191,36,0.6)] transform hover:-translate-y-1 flex items-center justify-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                // handle ads view logic
              }}
            >
              <Play className="w-5 h-5 fill-slate-950" />
              Ver Ads y Ganar
            </button>
            <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">
              Ver Ranking <ChevronRight className="w-3 h-3" />
            </div>
          </div>

        </div>
      </div>

      {isModalOpen && (
        <ChampionshipLeaderboardModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
};
