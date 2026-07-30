import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowDown, Flame, Sparkles, Radio } from 'lucide-react';
import brand21Icon from '../../Public/brand21Icon-164.webp';

interface Props {
  prizePoolUsd: number;
  globalViews: number;
  activeLiveUsers: number;
}

export default function HeroChampionship({ prizePoolUsd, globalViews, activeLiveUsers }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Compute goal values for progress bar
  const nextTargetPrize = 1250;
  const currentViews = globalViews;
  const viewsToNextTarget = Math.max(0, 178000 - currentViews);
  const progressPercent = Math.min(100, Math.max(15, ((currentViews % 100000) / 100000) * 100));

  const formattedPrize = prizePoolUsd.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-start text-center px-4 sm:px-6 pt-28 sm:pt-36 md:pt-40 pb-16 overflow-hidden">
      {/* Video Background with Subtle Overlay */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
        aria-hidden="true"
        key={isMobile ? 'mobile' : 'desktop'}
      >
        <source
          src={isMobile ? 'https://kasino21.com/storage/v1/object/public/Data/mp_3-4.mp4' : 'https://kasino21.com/storage/v1/object/public/Data/mp_.mp4'}
          type="video/mp4"
        />
      </video>

      {/* Dark Ambient Radial Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#030712]/70 via-[#090d1a]/85 to-[#020617] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-yellow-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* CRT Scanlines Overlay */}
      <div className="crt-overlay pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        
        {/* Badge & Live Users Indicator */}
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-2.5 mb-6"
        >
          <div className="flex items-center gap-2 bg-black/60 border border-yellow-500/30 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.15)] backdrop-blur-md">
            <img src={brand21Icon} alt="Kasino21" className="w-5 h-5 rounded-md object-contain" />
            <span className="text-yellow-400 text-xs font-black tracking-widest font-['Russo_One'] uppercase flex items-center gap-1.5">
              KASINO21 CHAMPIONSHIP
            </span>
          </div>

          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full shadow backdrop-blur-md font-['Chakra_Petch']">
            <Radio size={14} className="animate-pulse text-emerald-400" />
            <span>{activeLiveUsers} jugadores en vivo acumulando</span>
          </div>
        </motion.div>

        {/* TÍTULO GRANDE */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl sm:text-5xl md:text-6xl font-black mb-4 leading-[1.1] tracking-tight uppercase"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-500 neon-gold-strong font-['Russo_One']">
            EL PREMIO QUE CRECE<br className="hidden sm:block" /> MIENTRAS JUEGAS
          </span>
        </motion.h1>

        {/* CONTADOR ENORME ANIMADO DEL POZO */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="my-4 relative group cursor-default"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition duration-700 animate-pulse" />
          
          <div className="relative bg-gradient-to-b from-[#121929] to-[#080d19] border-2 border-yellow-500/40 rounded-3xl px-8 py-5 sm:px-14 sm:py-7 shadow-[0_0_50px_rgba(251,191,36,0.25)] flex flex-col items-center backdrop-blur-xl">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl sm:text-7xl font-black text-yellow-400 font-['Russo_One'] drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                ${formattedPrize}
              </span>
              <span className="text-xl sm:text-3xl font-black text-yellow-500/80 font-['Russo_One']">USD</span>
            </div>
            
            <p className="text-gray-400 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] font-['Chakra_Petch'] mt-1 flex items-center gap-1.5">
              <Trophy size={14} className="text-yellow-400" /> Pozo del KASINO21 CHAMPIONSHIP
            </p>
          </div>
        </motion.div>

        {/* BARRA DE PROGRESO DE VISTAS DE ADS */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-xl my-4 px-2"
        >
          <div className="flex justify-between items-center text-xs text-gray-300 font-['Chakra_Petch'] font-bold mb-1.5">
            <span className="flex items-center gap-1 text-yellow-400">
              <Flame size={14} className="animate-bounce" /> Meta del Pozo
            </span>
            <span className="text-gray-400">
              Faltan <strong className="text-white">{viewsToNextTarget.toLocaleString()}</strong> vistas para llegar a <strong className="text-yellow-400">${nextTargetPrize} USD</strong>
            </span>
          </div>

          <div className="h-3.5 w-full bg-slate-900/90 border border-yellow-500/20 rounded-full p-0.5 overflow-hidden shadow-inner relative">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-700 relative overflow-hidden shadow-[0_0_12px_rgba(251,191,36,0.6)]"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-shimmer" />
            </div>
          </div>
        </motion.div>

        {/* SUBTÍTULO */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto my-3 font-['Chakra_Petch'] leading-relaxed"
        >
          Cada ad que ves suma dinero al pozo.<br />
          <span className="text-yellow-400 font-bold inline-flex items-center gap-1.5 justify-center">
            Al final del mes, 1 solo se lo lleva todo <Trophy size={18} className="text-yellow-400" />
          </span>
        </motion.p>

        {/* BOTONES DE ACCIÓN */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3.5 sm:gap-5 justify-center items-center w-full mt-6"
        >
          <a
            href="/login"
            className="group relative bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-lg sm:text-xl px-9 py-4 sm:px-11 sm:py-5 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-[0_0_30px_rgba(251,191,36,0.4)] font-['Russo_One'] tracking-wider w-full sm:w-auto flex items-center justify-center gap-3 cursor-pointer"
          >
            <Sparkles size={20} className="text-black group-hover:rotate-12 transition-transform" />
            ENTRAR A LA LIGA AHORA
          </a>

          <a
            href="#como-funciona"
            className="border border-white/20 bg-white/[0.04] hover:bg-white/[0.1] text-gray-200 hover:text-white font-bold text-base px-8 py-4 rounded-2xl transition-all duration-300 font-['Chakra_Petch'] w-full sm:w-auto flex items-center justify-center gap-2 backdrop-blur-md cursor-pointer"
          >
            ¿CÓMO FUNCIONA?
            <ArrowDown size={18} className="animate-bounce" />
          </a>
        </motion.div>

      </div>
    </section>
  );
}
