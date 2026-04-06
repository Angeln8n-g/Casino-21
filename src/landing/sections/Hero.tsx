import React from 'react';

const CARDS = ['A♠', 'K♥', 'Q♦', '7♣', 'J♠'];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      {/* Splash background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/src/Public/splash.png)' }}
        aria-hidden="true"
      />
      {/* Dark overlay so text stays readable */}
      <div className="absolute inset-0 bg-[#0a0f1e]/80" aria-hidden="true" />

      {/* Floating cards decoration */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        {CARDS.map((card, i) => (
          <div
            key={card}
            className="absolute text-4xl font-black opacity-10"
            style={{
              left: `${10 + i * 20}%`,
              top: `${15 + (i % 2) * 30}%`,
              transform: `rotate(${-20 + i * 10}deg)`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.3}s`,
              color: card.includes('♥') || card.includes('♦') ? '#ef4444' : '#ffffff',
            }}
          >
            {card}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes float {
          from { transform: translateY(0px) rotate(var(--r, -10deg)); }
          to   { transform: translateY(-20px) rotate(var(--r, -10deg)); }
        }
      `}</style>

      <div className="relative z-10 max-w-4xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/src/Public/icon.png" alt="Casino 21 icon" className="w-12 h-12 rounded-xl object-contain drop-shadow-lg" />
          <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
            Juego de Cartas Competitivo Online
          </div>
        </div>

        <h1 className="text-6xl md:text-8xl font-black mb-6 leading-none">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-600">
            CASINO 21
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-2xl mx-auto leading-relaxed">
          El juego de cartas más estratégico. Compite en torneos, sube tu ELO y demuestra quién domina la mesa.
        </p>

        <p className="text-gray-500 mb-10 text-sm">
          Modos 1v1 y 2v2 · Rankings en tiempo real · Torneos · Sistema de logros
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/index.html"
            className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-lg px-10 py-4 rounded-2xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(234,179,8,0.3)]"
          >
            JUGAR GRATIS
          </a>
          <a
            href="#como-jugar"
            className="bg-white/5 border border-white/10 text-white font-bold text-lg px-10 py-4 rounded-2xl hover:bg-white/10 transition-colors"
          >
            Cómo jugar
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <div className="w-px h-8 bg-white/40 animate-pulse" />
      </div>
    </section>
  );
}
