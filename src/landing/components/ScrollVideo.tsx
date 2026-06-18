import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import brand21Icon from '../../Public/brand21Icon-164.webp';
import splashBg from '../../Public/splash.webp';

const CARDS = ['♠', '♥', '♦', '♣', '♠️', '♣️', '♥️', '♦️'];

export default function ScrollVideo() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
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
    <section className="relative min-h-screen w-full overflow-hidden bg-[#020617] flex items-center justify-center py-20 lg:py-0">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-35 z-0"
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
            background: `radial-gradient(ellipse at ${50 + 20 * mousePos.x}% ${50 + 20 * mousePos.y}%, rgba(251,191,36,0.1) 0%, transparent 65%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Dark overlay gradients for text readability */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/80 via-[#020617]/40 to-[#020617] pointer-events-none" />

      {/* Grid line overlay */}
      <div className="absolute inset-0 z-[2] bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Floating card particles with mouse parallax */}
      <div className="absolute inset-0 z-[3] pointer-events-none select-none hidden md:block" aria-hidden="true">
        {CARDS.map((card, i) => {
          const depth = 0.04 + i * 0.015;
          const leftPos = i % 2 === 0 ? 5 + i * 4 : 72 + (i - 1) * 4;
          return (
            <div
              key={card}
              className="absolute text-4xl sm:text-5xl font-black opacity-[0.035] transition-all duration-300"
              style={{
                left: `${leftPos}%`,
                top: `${18 + (i % 3) * 22}%`,
                transform: `translate(${mousePos.x * 25 * depth}px, ${mousePos.y * 25 * depth}px) rotate(${-15 + i * 12}deg)`,
                color: card.includes('♥') || card.includes('♦') ? '#ef4444' : '#fbbf24',
              }}
            >
              {card}
            </div>
          );
        })}
      </div>

      {/* CRT scanlines overlay */}
      <div className="crt-overlay opacity-[0.15] z-[4] pointer-events-none" aria-hidden="true" />

      {/* Ambient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-yellow-500/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none z-[1]" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none z-[1]" />

      {/* Hero content layout: Grid split on desktop */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Aligned Typography */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 justify-center lg:justify-start">
            <motion.img
              src={brand21Icon}
              alt="Kasino21 icono"
              className="w-10 h-10 rounded-xl object-contain drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            />
            <div className="border border-yellow-500/20 bg-yellow-500/5 text-yellow-400 text-[9px] sm:text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-[0.25em] shadow-[0_0_15px_rgba(251,191,36,0.1)] font-['Chakra_Petch']">
              Juego de Cartas Competitivo Online
            </div>
          </div>

          <h1 className="text-[clamp(1.8rem,6vw,4.2rem)] font-black mb-6 leading-[1.05] tracking-tight">
            <span 
              className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-600 font-['Russo_One']" 
              style={{ 
                textShadow: '0 0 40px rgba(251,191,36,0.35), 0 2px 10px rgba(0,0,0,0.95)' 
              }}
            >
              Conquista el ranking.<br />Domina las mesas.<br />Construye tu legado.
            </span>
          </h1>

          <p 
            className="text-sm sm:text-lg text-yellow-100/80 mb-6 max-w-xl leading-relaxed font-semibold font-['Chakra_Petch']" 
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 25px rgba(251,191,36,0.1)' }}
          >
            El juego de cartas más estratégico. Compite en torneos, sube tu ELO y demuestra quién domina la mesa en tiempo real.
          </p>

          <p className="text-yellow-400/40 mb-8 text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] font-bold font-['Chakra_Petch']">
            Modos 1v1 y 2v2 · Rankings en tiempo real · Torneos · Sistema de logros
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center w-full sm:w-auto">
            <a
              href="/login"
              className="relative overflow-hidden group bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-400 text-black font-black text-base px-12 py-4.5 rounded-2xl hover:scale-105 active:scale-95 transition-all duration-300 font-['Russo_One'] tracking-wider w-full sm:w-auto text-center shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:shadow-[0_0_40px_rgba(251,191,36,0.5)]"
            >
              {/* Internal shiny sweep */}
              <span className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 translate-x-[-120%] group-hover:animate-[shimmer_1.5s_infinite_linear]" style={{ backgroundSize: '200% 100%' }} />
              JUGAR GRATIS
            </a>
            <a
              href="#como-jugar"
              className="border border-white/10 hover:border-yellow-500/30 bg-white/[0.03] text-yellow-400/90 hover:text-yellow-400 hover:bg-white/[0.08] font-bold text-sm px-10 py-4 rounded-2xl transition-all duration-300 font-['Chakra_Petch'] w-full sm:w-auto text-center"
            >
              Cómo jugar
            </a>
          </div>
        </motion.div>

        {/* Right Column: Holographic Floating Deck & Chips */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 30 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="lg:col-span-5 flex justify-center items-center relative z-10"
        >
          <div className="relative flex justify-center items-center h-[350px] sm:h-[400px] w-full max-w-[400px]">
            {/* Holographic grid and circular lights beneath the deck */}
            <div className="absolute w-[300px] h-[300px] rounded-full border border-yellow-500/10 bg-yellow-500/[0.01] flex items-center justify-center animate-pulse-slow">
              <div className="w-[220px] h-[220px] rounded-full border border-cyan-500/10 animate-ping" style={{ animationDuration: '4s' }} />
            </div>
            
            {/* Card Back (floating) */}
            <motion.div
              animate={{ y: [-10, 10, -10], rotate: [-4, 4, -4] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              className="absolute w-36 h-52 bg-gradient-to-br from-yellow-500 via-amber-600 to-yellow-600 border border-yellow-400/50 rounded-2xl p-4 flex flex-col justify-between shadow-2xl z-20 left-6 top-8"
            >
              <div className="border border-white/10 rounded-xl flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                <span className="font-['Russo_One'] text-2xl text-yellow-300/25">K21</span>
              </div>
            </motion.div>

            {/* Card Front (Ace of Spades, floating closer) */}
            <motion.div
              animate={{ y: [10, -10, 10], rotate: [5, -5, 5] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="absolute w-36 h-52 bg-[#050811]/90 border border-cyan-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-2xl z-30 right-6 bottom-8 glass-cyber-cyan"
            >
              <div className="flex justify-between items-start">
                <span className="text-xl font-black text-cyan-400">A</span>
                <span className="text-xl text-cyan-400">♠</span>
              </div>
              <div className="text-6xl self-center font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
                ♠
              </div>
              <div className="flex justify-between items-end rotate-180">
                <span className="text-xl font-black text-cyan-400">A</span>
                <span className="text-xl text-cyan-400">♠</span>
              </div>
            </motion.div>

            {/* Card Front (Jack of Hearts, intermediate) */}
            <motion.div
              animate={{ y: [-5, 5, -5], rotate: [0, 2, 0] }}
              transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }}
              className="absolute w-36 h-52 bg-[#050811]/90 border border-yellow-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-2xl z-25"
            >
              <div className="flex justify-between items-start">
                <span className="text-xl font-black text-yellow-500">J</span>
                <span className="text-xl text-red-500">♥</span>
              </div>
              <div className="text-6xl self-center font-black text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                ♥
              </div>
              <div className="flex justify-between items-end rotate-180">
                <span className="text-xl font-black text-yellow-500">J</span>
                <span className="text-xl text-red-500">♥</span>
              </div>
            </motion.div>
            
            {/* Glowing chips */}
            <motion.div
              animate={{ y: [-15, 15, -15], rotate: 45 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute w-10 h-10 rounded-full border-2 border-dashed border-yellow-500 bg-yellow-500/10 shadow-[0_0_15px_rgba(251,191,36,0.3)] z-35 left-2 bottom-12 flex items-center justify-center font-black text-xs text-yellow-400"
            >
              100
            </motion.div>
            <motion.div
              animate={{ y: [15, -15, 15], rotate: -45 }}
              transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
              className="absolute w-12 h-12 rounded-full border-2 border-dashed border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(56,189,248,0.3)] z-35 right-4 top-10 flex items-center justify-center font-black text-xs text-cyan-400"
            >
              500
            </motion.div>
          </div>
        </motion.div>

      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 z-10">
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
