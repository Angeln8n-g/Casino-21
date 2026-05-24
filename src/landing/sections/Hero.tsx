import { useEffect, useState } from 'react';
import brand21Icon from '../../Public/brand21Icon-164.webp';

const CARDS = ['A♠', 'K♥', 'Q♦', '7♣', 'J♠'];

export default function Hero() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [poweredOn, setPoweredOn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setPoweredOn(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section
      className={`relative min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 overflow-hidden ${poweredOn ? 'animate-power-on' : ''}`}
    >
      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        aria-hidden="true"
        key={isMobile ? 'mobile' : 'desktop'}
      >
        <source
          src={isMobile ? 'https://kasino21.com/storage/v1/object/public/Data/mp_3-4.mp4' : 'https://kasino21.com/storage/v1/object/public/Data/mp_.mp4'}
          type="video/mp4"
        />
      </video>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at ${50+25*mousePos.x}% ${50+25*mousePos.y}%, rgba(251,191,36,0.08) 0%, transparent 60%)`,
        }}
        aria-hidden="true"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#0a0f1e]/40" aria-hidden="true" />

      {/* Glitch KASINO21 watermark - subtle bottom-right */}
      <div
        className="absolute bottom-6 right-6 text-[clamp(2rem,5vw,4rem)] font-black text-white/[0.008] select-none pointer-events-none leading-none animate-glitch"
        aria-hidden="true"
      >
        KASINO21
      </div>

      {/* Floating card particles with mouse parallax - edges only (hidden on mobile) */}
      <div className="absolute inset-0 pointer-events-none select-none hidden md:block" aria-hidden="true">
        {CARDS.map((card, i) => {
          const depth = 0.03 + i * 0.01;
          const leftPos = i % 2 === 0 ? 2 + i * 3 : 78 + i * 3;
          return (
            <div
              key={card}
              className="parallax-card absolute text-3xl sm:text-4xl font-black opacity-[0.04]"
              style={{
                left: `${leftPos}%`,
                top: `${15 + (i % 3) * 25}%`,
                transform: `translate(${mousePos.x * 20 * depth}px, ${mousePos.y * 20 * depth}px) rotate(${-15 + i * 8}deg)`,
                color: card.includes('♥') || card.includes('♦') ? '#ef4444' : '#fbbf24',
                transition: 'transform 0.15s ease-out',
              }}
            >
              {card}
            </div>
          );
        })}
      </div>

      {/* CRT scanlines overlay */}
      <div className="crt-overlay" aria-hidden="true" />

      <div className="relative z-10 max-w-4xl">
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          <img src={brand21Icon} alt="Kasino21 icono" className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]" />
          <div className="border-cyber bg-yellow-500/5 text-yellow-400 text-[8px] sm:text-[10px] font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-full uppercase tracking-[0.2em]">
            Juego de Cartas Competitivo Online
          </div>
        </div>

        <h1 className="text-[clamp(1.6rem,7vw,4.5rem)] font-black mb-4 sm:mb-6 leading-[1.1]">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-600 neon-gold-strong font-['Russo_One']">
            Conquista el ranking.<br />Domina las mesas.<br />Construye tu legado.
          </span>
        </h1>

        <p className="text-sm sm:text-lg md:text-xl text-gray-400 mb-4 sm:mb-6 max-w-2xl mx-auto leading-relaxed font-['Chakra_Petch'] px-2">
          El juego de cartas más estratégico. Compite en torneos, sube tu ELO y demuestra quién domina la mesa.
        </p>

        <p className="text-gray-600 mb-6 sm:mb-10 text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] font-semibold">
          Modos 1v1 y 2v2 · Rankings en tiempo real · Torneos · Sistema de logros
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full sm:w-auto">
          <a
            href="/login"
            className="relative bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-base sm:text-lg px-10 py-4 sm:px-12 sm:py-5 rounded-2xl hover:scale-105 transition-transform duration-300 animate-cta-pulse font-['Russo_One'] tracking-wider w-full sm:w-auto text-center"
          >
            JUGAR GRATIS
          </a>
          <a
            href="/como-jugar"
            className="border-cyber-strong bg-white/[0.03] text-gray-300 hover:text-white font-semibold text-sm sm:text-base px-8 py-3.5 sm:px-10 sm:py-4 rounded-2xl hover:bg-white/[0.08] transition-all duration-300 font-['Chakra_Petch'] w-full sm:w-auto text-center"
          >
            Cómo jugar
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-15">
        <span className="text-[8px] uppercase tracking-[0.3em] text-gray-600">Scroll</span>
        <div className="w-px h-6 bg-gradient-to-b from-gray-500/40 to-transparent" />
      </div>
    </section>
  );
}
