import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Eye, Sparkles } from 'lucide-react';

const COMMUNITY_VIDEOS = [
  { 
    id: '1', 
    title: 'Jugada Maestra: 21 Perfecto', 
    author: 'ProPlayer21', 
    views: '12.5K',
    duration: '0:45',
    tag: 'TUTORIAL',
    color: 'from-cyan-500/20 to-blue-500/20',
    borderColor: 'border-cyan-500/30 hover:border-cyan-400',
    accentColor: 'cyan'
  },
  { 
    id: '2', 
    title: 'Estrategia: Cuándo Pedir Carta', 
    author: 'KasinoCoach', 
    views: '8.3K',
    duration: '2:15',
    tag: 'ESTRATEGIA',
    color: 'from-yellow-500/20 to-amber-600/20',
    borderColor: 'border-yellow-500/30 hover:border-yellow-400',
    accentColor: 'gold'
  },
  { 
    id: '3', 
    title: 'Torneo Semanal - Final Épica', 
    author: 'TournamentTV', 
    views: '24.1K',
    duration: '5:30',
    tag: 'COMPETITIVO',
    color: 'from-rose-500/20 to-red-500/20',
    borderColor: 'border-rose-500/30 hover:border-rose-400',
    accentColor: 'rose'
  },
  { 
    id: '4', 
    title: 'Top 10 Jugadas del Mes', 
    author: 'KasinoClips', 
    views: '45.7K',
    duration: '4:10',
    tag: 'RECOPILACIÓN',
    color: 'from-purple-500/20 to-fuchsia-500/20',
    borderColor: 'border-purple-500/30 hover:border-purple-400',
    accentColor: 'purple'
  },
  { 
    id: '5', 
    title: 'Cómo Ganar en 2v2: Consejos', 
    author: 'TeamK21', 
    views: '6.2K',
    duration: '3:05',
    tag: 'CONSEJOS',
    color: 'from-emerald-500/20 to-teal-600/20',
    borderColor: 'border-emerald-500/30 hover:border-emerald-400',
    accentColor: 'emerald'
  },
  { 
    id: '6', 
    title: 'Nuevo Meta: Estrategias 2026', 
    author: 'MetaAnalyst', 
    views: '19.8K',
    duration: '1:50',
    tag: 'ANALISIS',
    color: 'from-cyan-500/20 to-purple-500/20',
    borderColor: 'border-cyan-500/30 hover:border-purple-400',
    accentColor: 'cyan'
  },
];

export default function ContentCarousel() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxIndex, setMaxIndex] = useState(3);
  const trackRef = useRef<HTMLDivElement>(null);

  // Responsive calculations for max index
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setMaxIndex(COMMUNITY_VIDEOS.length - 1); // 1 card per page
      } else if (window.innerWidth < 1024) {
        setMaxIndex(COMMUNITY_VIDEOS.length - 2); // 2 cards per page
      } else {
        setMaxIndex(COMMUNITY_VIDEOS.length - 3); // 3 cards per page
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const slideNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  const slidePrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  return (
    <section className="py-24 px-6 relative overflow-hidden bg-transparent">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-500/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-500/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-[0.25em] text-yellow-400 font-bold mb-2 font-['Chakra_Petch']">
              Contenido y Comunidad
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
              Lo mejor de <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">Kasino21 TV</span>
            </h2>
            <p className="text-gray-400 text-sm mt-3 font-['Chakra_Petch']">
              Explora las repeticiones y estrategias más espectaculares de la comunidad.
            </p>
          </div>

          {/* Carousel Arrows */}
          <div className="flex items-center gap-3 self-start md:self-end">
            <button
              onClick={slidePrev}
              disabled={currentIndex === 0}
              className="p-3 rounded-xl border border-white/[0.06] bg-[#050811]/40 text-gray-400 hover:text-white hover:border-yellow-500/30 disabled:opacity-30 disabled:pointer-events-none transition-all duration-300 cursor-pointer shadow-lg backdrop-blur-md"
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={slideNext}
              disabled={currentIndex >= maxIndex}
              className="p-3 rounded-xl border border-white/[0.06] bg-[#050811]/40 text-gray-400 hover:text-white hover:border-yellow-500/30 disabled:opacity-30 disabled:pointer-events-none transition-all duration-300 cursor-pointer shadow-lg backdrop-blur-md"
              aria-label="Siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Carousel Window */}
        <div className="overflow-hidden px-1 py-4">
          <motion.div
            ref={trackRef}
            animate={{ x: `-${currentIndex * (100 / (maxIndex === COMMUNITY_VIDEOS.length - 1 ? 1 : maxIndex === COMMUNITY_VIDEOS.length - 2 ? 2 : 3))}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="flex gap-6 cursor-grab active:cursor-grabbing"
          >
            {COMMUNITY_VIDEOS.map((item) => {
              const isHovered = hoveredId === item.id;
              
              // Map accent color to Tailwind styles
              let accentColorGlow = 'rgba(6, 182, 212, 0.4)';
              let tagStyle = 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
              if (item.accentColor === 'gold') {
                accentColorGlow = 'rgba(251, 191, 36, 0.4)';
                tagStyle = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
              } else if (item.accentColor === 'rose') {
                accentColorGlow = 'rgba(244, 63, 94, 0.4)';
                tagStyle = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
              } else if (item.accentColor === 'purple') {
                accentColorGlow = 'rgba(167, 139, 250, 0.4)';
                tagStyle = 'text-purple-400 border-purple-500/30 bg-purple-500/10';
              } else if (item.accentColor === 'emerald') {
                accentColorGlow = 'rgba(16, 185, 129, 0.4)';
                tagStyle = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
              }

              return (
                <motion.div
                  key={item.id}
                  className={`w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] flex-shrink-0 relative glass-cyber border ${item.borderColor} rounded-2xl overflow-hidden group cursor-pointer transition-all duration-500`}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  whileHover={{
                    y: -6,
                    boxShadow: `0 12px 30px -10px ${accentColorGlow}`,
                  }}
                >
                  {/* Glowing top line on hover */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-0.5 transition-transform duration-300 scale-x-0 group-hover:scale-x-100"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${accentColorGlow}, transparent)`,
                    }}
                  />

                  {/* Thumbnail Video Panel */}
                  <div className={`aspect-video bg-gradient-to-br ${item.color} flex items-center justify-center relative overflow-hidden`}>
                    {/* Retro Grid inside card */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                    
                    {/* Shimmer/Scanline effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/15 z-0" />
                    
                    {/* Floating Video Tag */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className={`text-[8px] font-black tracking-widest px-2.5 py-0.5 rounded-full border uppercase ${tagStyle}`}>
                        {item.tag}
                      </span>
                    </div>

                    {/* Duration badge */}
                    <div className="absolute bottom-3 right-3 bg-black/60 text-[9px] text-gray-300 px-2 py-0.5 rounded font-['Chakra_Petch'] font-semibold z-10 border border-white/5">
                      {item.duration}
                    </div>

                    {/* Play button and visual feedback */}
                    <div className={`relative z-10 transition-all duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}>
                      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 shadow-md ${
                        isHovered 
                          ? 'border-yellow-400 bg-yellow-400/25 shadow-[0_0_20px_rgba(251,191,36,0.4)]' 
                          : 'border-white/20 bg-white/5'
                      }`}>
                        <Play size={18} fill={isHovered ? '#fbbf24' : 'rgba(255,255,255,0.5)'} className={`ml-0.5 transition-colors duration-300 ${isHovered ? 'text-yellow-400' : 'text-white/50'}`} />
                      </div>
                    </div>

                    {/* Decorative cyber crosshair elements */}
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-white/10 pointer-events-none" />
                    <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-white/10 pointer-events-none" />

                    {/* Simulated playing equalizer bar in hover */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-10 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                      <div 
                        className="h-full bg-yellow-400"
                        style={{
                          animation: 'shimmer 2s infinite linear',
                          background: 'linear-gradient(90deg, #fbbf24 0%, #d97706 50%, #fbbf24 100%)',
                          backgroundSize: '200% 100%'
                        }}
                      />
                    </div>
                  </div>

                  {/* Info block */}
                  <div className="p-4 bg-[#030612]/70 relative">
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate font-['Chakra_Petch'] group-hover:text-yellow-400 transition-colors duration-300">
                      {item.title}
                    </h3>
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.03]">
                      <span className="text-[10px] text-gray-500 font-medium font-['Chakra_Petch'] hover:text-white transition-colors">
                        @{item.author}
                      </span>
                      <span className="text-[10px] text-gray-500 font-['Chakra_Petch'] flex items-center gap-1">
                        <Eye size={10} className="text-gray-600" />
                        {item.views}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Carousel indicators */}
        <div className="flex justify-center items-center gap-2 mt-6">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all duration-300 cursor-pointer ${
                i === currentIndex
                  ? 'w-6 h-1.5 bg-yellow-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                  : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Ir a la diapositiva ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Floating decorative elements */}
      <div className="absolute inset-0 pointer-events-none select-none z-0" aria-hidden="true">
        {['♠', '♦', '♥', '♣'].map((suit, i) => (
          <div
            key={suit}
            className="absolute text-5xl font-black opacity-[0.015]"
            style={{
              left: `${10 + i * 25}%`,
              top: i % 2 === 0 ? '8%' : 'auto',
              bottom: i % 2 === 1 ? '8%' : 'auto',
              transform: `rotate(${-10 + i * 8}deg)`,
              color: suit === '♥' || suit === '♦' ? '#ef4444' : '#fbbf24',
            }}
          >
            {suit}
          </div>
        ))}
      </div>
    </section>
  );
}
