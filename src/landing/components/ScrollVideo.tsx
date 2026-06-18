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
    <section className="relative h-screen w-full overflow-hidden bg-[#020617] flex items-center justify-center">
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

      {/* Hero content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <motion.img
              src={brand21Icon}
              alt="Kasino21 icono"
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl object-contain drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            />
            <div className="border border-yellow-500/20 bg-yellow-500/5 text-yellow-400 text-[9px] sm:text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-[0.25em] shadow-[0_0_15px_rgba(251,191,36,0.1)] font-['Chakra_Petch']">
              Juego de Cartas Competitivo Online
            </div>
          </div>

          <h1 className="text-[clamp(1.8rem,7.5vw,4.8rem)] font-black mb-6 leading-[1.05] tracking-tight">
            <span 
              className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-600 font-['Russo_One']" 
              style={{ 
                textShadow: '0 0 40px rgba(251,191,36,0.35), 0 2px 10px rgba(0,0,0,0.95), 0 0 80px rgba(251,191,36,0.15)' 
              }}
            >
              Conquista el ranking.<br />Domina las mesas.<br />Construye tu legado.
            </span>
          </h1>

          <p 
            className="text-sm sm:text-lg md:text-xl text-yellow-100/80 mb-6 max-w-2xl mx-auto leading-relaxed font-semibold font-['Chakra_Petch'] px-2" 
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 25px rgba(251,191,36,0.1)' }}
          >
            El juego de cartas más estratégico. Compite en torneos, sube tu ELO y demuestra quién domina la mesa en tiempo real.
          </p>

          <p className="text-yellow-400/40 mb-8 sm:mb-12 text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] font-bold font-['Chakra_Petch']">
            Modos 1v1 y 2v2 · Rankings en tiempo real · Torneos · Sistema de logros
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto">
            <a
              href="/login"
              className="relative overflow-hidden group bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-400 text-black font-black text-base sm:text-lg px-12 py-4.5 rounded-2xl hover:scale-105 active:scale-95 transition-all duration-300 font-['Russo_One'] tracking-wider w-full sm:w-auto text-center shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:shadow-[0_0_40px_rgba(251,191,36,0.5)]"
            >
              {/* Internal shiny sweep */}
              <span className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 translate-x-[-120%] group-hover:animate-[shimmer_1.5s_infinite_linear]" style={{ backgroundSize: '200% 100%' }} />
              JUGAR GRATIS
            </a>
            <a
              href="#como-jugar"
              className="border border-white/10 hover:border-yellow-500/30 bg-white/[0.03] text-yellow-400/90 hover:text-yellow-400 hover:bg-white/[0.08] font-bold text-sm sm:text-base px-10 py-4 rounded-2xl transition-all duration-300 font-['Chakra_Petch'] w-full sm:w-auto text-center"
            >
              Cómo jugar
            </a>
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
