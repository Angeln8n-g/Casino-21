import React, { useState } from 'react';

// Placeholder content items - ready for admin CMS integration
const PLACEHOLDER_ITEMS = [
  { id: '1', title: 'Jugada Maestra: 21 Perfecto', author: 'ProPlayer21', views: '12.5K' },
  { id: '2', title: 'Estrategia: Cuándo Pedir Carta', author: 'KasinoCoach', views: '8.3K' },
  { id: '3', title: 'Torneo Semanal - Final Épica', author: 'TournamentTV', views: '24.1K' },
  { id: '4', title: 'Top 10 Jugadas del Mes', author: 'KasinoClips', views: '45.7K' },
  { id: '5', title: 'Cómo Ganar en 2v2: Consejos', author: 'TeamK21', views: '6.2K' },
  { id: '6', title: 'Nuevo Meta: Estrategias 2026', author: 'MetaAnalyst', views: '19.8K' },
];

export default function ContentCarousel() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section className="py-20 px-6 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-500/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold mb-2 font-['Chakra_Petch']">
            Contenido y Comunidad
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            Lo mejor de <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">Kasino21</span>
          </h2>
          <p className="text-gray-500 text-sm mt-3 font-['Chakra_Petch']">
            Pasa el cursor sobre los videos para previsualizar
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLACEHOLDER_ITEMS.map((item, index) => {
            const isHovered = hoveredId === item.id;

            return (
              <div
                key={item.id}
                className="relative border border-white/[0.08] rounded-2xl overflow-hidden group cursor-pointer transition-all duration-500 hover:border-yellow-500/30 hover:scale-[1.02]"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Video placeholder */}
                <div className="aspect-[9/16] bg-gradient-to-br from-[#1a1025] via-[#0f172a] to-[#020617] flex items-center justify-center relative overflow-hidden">
                  {/* Animated overlay on hover simulating video play */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 transition-opacity duration-300 ${isHovered ? 'opacity-60' : 'opacity-90'}`} />

                  {/* Play icon */}
                  <div className={`relative z-10 transition-all duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`}>
                    <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      isHovered ? 'border-yellow-400 bg-yellow-400/20' : 'border-white/20 bg-white/5'
                    }`}>
                      <svg className={`w-6 h-6 ml-0.5 transition-colors duration-300 ${isHovered ? 'text-yellow-400' : 'text-white/60'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Glow effect on hover */}
                  {isHovered && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent" />
                    </div>
                  )}

                  {/* Simulated video time indicator */}
                  <div className="absolute bottom-2 left-2 bg-black/60 text-[10px] text-gray-400 px-2 py-0.5 rounded font-['Chakra_Petch']">
                    {Math.floor(Math.random() * 3) + 1}:{String(Math.floor(Math.random() * 59)).padStart(2, '0')}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 bg-black/40">
                  <h3 className="text-sm font-bold text-white truncate font-['Chakra_Petch']">{item.title}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-gray-500 font-['Chakra_Petch']">{item.author}</span>
                    <span className="text-[10px] text-gray-600 font-['Chakra_Petch']">{item.views} vistas</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      {/* Floating decorative cards - static, no mouse interaction */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true" style={{ zIndex: 0 }}>
        {['A♠', 'K♦', 'Q♥', 'J♣'].map((card, i) => (
          <div
            key={card}
            className="absolute text-3xl font-black opacity-[0.015]"
            style={{
              left: `${5 + i * 25}%`,
              top: i % 2 === 0 ? '5%' : 'auto',
              bottom: i % 2 === 1 ? '5%' : 'auto',
              transform: `rotate(${-15 + i * 10}deg)`,
              color: card.includes('♥') || card.includes('♦') ? '#ef4444' : '#fbbf24',
            }}
          >
            {card}
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
