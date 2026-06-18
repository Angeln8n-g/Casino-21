import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import brand21Icon from '../../Public/brand21Icon-164.webp';
import splashBg from '../../Public/splash.webp';
import heroMockup from '../../Public/landing_page_preview_1781755372029.png';

const CARDS = ['♠', '♥', '♦', '♣', '♠️', '♣️', '♥️', '♦️'];

export default function ScrollVideo() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  return (
    <section id="hero" className="relative min-h-screen w-full overflow-hidden bg-transparent flex flex-col items-center justify-center pt-28 pb-16 px-4">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-20 z-0"
        aria-hidden="true"
        poster={splashBg}
        key={isMobile ? 'mobile' : 'desktop'}
      >
        <source
          src={isMobile ? 'https://kasino21.com/storage/v1/object/public/Data/mp_3-4.mp4' : 'https://kasino21.com/storage/v1/object/public/Data/mp_.mp4'}
          type="video/mp4"
        />
      </video>

      {/* Dynamic interactive radial spotlight overlay */}
      {!isMobile && (
        <div
          className="absolute inset-0 z-[1] pointer-events-none opacity-40 transition-opacity duration-300"
          style={{
            background: `radial-gradient(ellipse at ${50 + 20 * mousePos.x}% ${50 + 20 * mousePos.y}%, rgba(251,191,36,0.08) 0%, transparent 65%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Dark overlay gradients for text readability */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/85 via-[#020617]/50 to-[#020617] pointer-events-none" />

      {/* Grid line overlay */}
      <div className="absolute inset-0 z-[2] bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none" />

      {/* CRT scanlines overlay */}
      <div className="crt-overlay opacity-[0.1] z-[4] pointer-events-none" aria-hidden="true" />

      {/* Ambient Pulsing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-yellow-500/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none z-[1]" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-cyan-500/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none z-[1]" />

      {/* Centered Hero Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
        
        {/* Eyebrow Label */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex items-center gap-2 mb-6"
        >
          <img
            src={brand21Icon}
            alt="Kasino21 Icon"
            className="w-8 h-8 rounded-lg object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]"
          />
          <span className="border border-yellow-500/20 bg-yellow-500/5 text-yellow-400 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-[0.25em] shadow-[0_0_15px_rgba(251,191,36,0.15)] font-['Chakra_Petch']">
            Juego de Cartas Competitivo en Tiempo Real
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="text-[clamp(1.5rem,4.5vw,3.6rem)] font-black leading-[1.1] mb-4 tracking-tight uppercase"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 font-['Russo_One'] drop-shadow-[0_0_20px_rgba(251,191,36,0.25)]">
            KASINO21
          </span>
          <span className="text-white font-['Russo_One'] mx-2.5">:</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-white to-cyan-300 font-['Russo_One'] drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            MASTER THE NEON DECK
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="text-xs sm:text-base text-cyan-200/60 mb-8 max-w-2xl font-['Chakra_Petch'] tracking-wide"
        >
          A Cyberpunk Strategy Card Game. Dominate the Grid. High Stakes, Neon Nights.
        </motion.p>

        {/* CTA Button with Mockup Capsule Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          className="flex justify-center mb-10"
        >
          <a
            href="/login"
            className="relative inline-flex items-center justify-center px-10 py-4.5 rounded-2xl border-2 border-yellow-500/50 bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-500 text-black font-black text-sm tracking-[0.2em] font-['Russo_One'] hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_30px_rgba(251,191,36,0.35)] hover:shadow-[0_0_45px_rgba(251,191,36,0.55)] group overflow-hidden"
          >
            {/* Double border outline effect */}
            <span className="absolute inset-[3px] border border-yellow-300/35 rounded-xl pointer-events-none" />
            {/* Shiny sweep */}
            <span className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-120%] group-hover:animate-[shimmer_1.5s_infinite_linear]" style={{ backgroundSize: '200% 100%' }} />
            PLAY FREE NOW
          </a>
        </motion.div>

        {/* Central 3D Card Table (Responsive Cropped Mockup) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.4 }}
          className="w-full max-w-4xl aspect-[5/3] relative overflow-hidden rounded-3xl border border-cyan-500/10 shadow-[0_0_60px_rgba(6,182,212,0.1)] bg-[#020617]/80 group/table"
        >
          {/* Mockup image cropped to hide navbar and headings */}
          <img 
            src={heroMockup} 
            className="absolute top-0 left-0 w-full h-[166.67%] object-cover select-none pointer-events-none opacity-90 group-hover/table:opacity-100 transition-opacity duration-700" 
            style={{ objectPosition: 'center bottom' }}
            alt="Kasino21 3D Table"
          />

          {/* Interactive blink overlay grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.012)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          {/* HOTSPOT OVERLAYS */}
          
          {/* Hotspot 1: Live Tournaments (Left) */}
          <a
            href="#competitivo"
            className="absolute left-[9%] top-[2%] w-[19%] h-[28%] rounded-xl border border-transparent hover:border-cyan-500/35 hover:bg-cyan-500/[0.03] transition-all duration-300 group cursor-pointer"
            title="Ver Torneos Activos"
          >
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-cyan-500/[0.02] shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300 pointer-events-none" />
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-[7px] text-cyan-400 font-bold bg-cyan-950/80 px-1 py-0.5 rounded uppercase tracking-wider font-['Chakra_Petch']">EXPLORAR</span>
            </div>
          </a>

          {/* Hotspot 2: Global Leaderboard (Right) */}
          <a
            href="#competitivo"
            className="absolute left-[71%] top-[2%] w-[21%] h-[31%] rounded-xl border border-transparent hover:border-yellow-500/35 hover:bg-yellow-500/[0.03] transition-all duration-300 group cursor-pointer"
            title="Ver Clasificaciones"
          >
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-yellow-500/[0.02] shadow-[0_0_20px_rgba(251,191,36,0.2)] transition-all duration-300 pointer-events-none" />
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-[7px] text-yellow-400 font-bold bg-yellow-950/80 px-1 py-0.5 rounded uppercase tracking-wider font-['Chakra_Petch']">RANKINGS</span>
            </div>
          </a>

          {/* Hotspot 3: Center Table Play Zone */}
          <a
            href="/login"
            className="absolute left-[30%] top-[20%] w-[40%] h-[75%] rounded-[60px] border border-transparent hover:border-yellow-500/10 hover:bg-yellow-500/[0.01] transition-all duration-500 group cursor-pointer flex items-center justify-center"
            title="Jugar Ahora"
          >
            <div className="w-16 h-16 rounded-full border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100 shadow-[0_0_25px_rgba(251,191,36,0.25)]">
              <span className="text-[9px] text-yellow-400 font-bold tracking-widest font-['Russo_One'] uppercase animate-pulse">JUGAR</span>
            </div>
          </a>
        </motion.div>

      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-45 z-10">
        <span className="text-[9px] uppercase tracking-[0.35em] text-yellow-400/50 font-['Chakra_Petch']" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>Scroll para explorar</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-px h-8 bg-gradient-to-b from-yellow-400/60 to-transparent"
        />
      </div>
    </section>
  );
}
