import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Palette, CheckCircle, Layers, Zap, Crown, Compass } from 'lucide-react';

interface PreviewTheme {
  key: string;
  name: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  description: string;
  previewColor: string;
  boardStyle: React.CSSProperties;
  cardStyle: React.CSSProperties;
  cardBackStyle: React.CSSProperties;
  badgeStyle: string;
}

const PREVIEW_THEMES: PreviewTheme[] = [
  {
    key: 'classic',
    name: 'Casino Clásico',
    icon: Layers,
    description: 'El estilo tradicional del fieltro verde de casino, elegante y sobrio.',
    previewColor: '#10b981',
    boardStyle: {
      background: 'radial-gradient(circle at 50% 50%, #064e3b 0%, #022c22 100%)',
      borderColor: '#3a1c0d',
      boxShadow: 'inset 0 0 50px rgba(0,0,0,0.6)',
    },
    cardStyle: {
      background: 'linear-gradient(165deg, #ffffff 0%, #f8fafc 35%, #e2e8f0 100%)',
      color: '#000000',
      border: '1px solid rgba(0,0,0,0.1)',
      boxShadow: '0 10px 20px -6px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.8)',
    },
    cardBackStyle: {
      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
      backgroundImage: 'radial-gradient(circle at 50% 50%, #ef4444 20%, transparent 60%)',
      border: '4px solid #ffffff',
      boxShadow: '0 10px 20px -6px rgba(0,0,0,0.4)',
    },
    badgeStyle: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    key: 'cyberpunk',
    name: 'Cyberpunk Neon',
    icon: Zap,
    description: 'Bordes de neón brillante, rejilla holográfica y colores cian y magenta.',
    previewColor: '#ec4899',
    boardStyle: {
      background: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #030712 100%)',
      borderColor: '#ec4899',
      boxShadow: 'inset 0 0 40px rgba(236,72,153,0.2), 0 0 20px rgba(236,72,153,0.1)',
    },
    cardStyle: {
      background: 'linear-gradient(165deg, #090d16 0%, #111827 100%)',
      color: '#38bdf8',
      border: '2px solid #38bdf8',
      boxShadow: '0 0 20px rgba(56,189,248,0.25), inset 0 0 10px rgba(56,189,248,0.1)',
    },
    cardBackStyle: {
      background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
      border: '2px solid #38bdf8',
      boxShadow: '0 0 20px rgba(236,72,153,0.3)',
    },
    badgeStyle: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  },
  {
    key: 'royal',
    name: 'Royal Wood',
    icon: Crown,
    description: 'Estilo de madera noble de caoba y oro premium, digno de un gran rey.',
    previewColor: '#fbbf24',
    boardStyle: {
      background: 'radial-gradient(circle at 50% 50%, #451a03 0%, #1c0600 100%)',
      borderColor: '#fbbf24',
      boxShadow: 'inset 0 0 45px rgba(0,0,0,0.8)',
    },
    cardStyle: {
      background: 'linear-gradient(165deg, #fffbeb 0%, #fef3c7 100%)',
      color: '#78350f',
      border: '2px solid #fbbf24',
      boxShadow: '0 10px 25px -4px rgba(251,191,36,0.15)',
    },
    cardBackStyle: {
      background: 'linear-gradient(135deg, #fbbf24 0%, #b45309 100%)',
      border: '3px solid #fffbeb',
      boxShadow: '0 10px 25px -4px rgba(251,191,36,0.15)',
    },
    badgeStyle: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  },
  {
    key: 'space',
    name: 'Deep Space',
    icon: Compass,
    description: 'Nebulosas de polvo cósmico y constelaciones lejanas con tono violeta.',
    previewColor: '#a78bfa',
    boardStyle: {
      background: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020617 100%)',
      borderColor: '#a78bfa',
      boxShadow: 'inset 0 0 50px rgba(139,92,246,0.15)',
    },
    cardStyle: {
      background: 'linear-gradient(165deg, #0b0f19 0%, #030712 100%)',
      color: '#c084fc',
      border: '1px solid rgba(192,132,252,0.4)',
      boxShadow: '0 0 15px rgba(192,132,252,0.15)',
    },
    cardBackStyle: {
      background: 'radial-gradient(circle at 50% 50%, #6d28d9 0%, #1e1b4b 100%)',
      border: '2px solid rgba(192,132,252,0.6)',
      boxShadow: '0 0 20px rgba(109,40,217,0.3)',
    },
    badgeStyle: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
];

export default function ThemesPreview() {
  const [activeTheme, setActiveTheme] = useState<PreviewTheme>(PREVIEW_THEMES[0]);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [dealCount, setDealCount] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 15, y: y * 15 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/[0.02] rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-cyan-500/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="text-[10px] uppercase tracking-[0.25em] text-yellow-400 font-bold mb-2 font-['Chakra_Petch']">
            Aspecto Personalizable
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            Personaliza tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">estilo de juego</span>
          </h2>
          <p className="text-gray-400 text-sm mt-3 font-['Chakra_Petch'] max-w-lg mx-auto">
            Desbloquea aspectos exclusivos de tableros y cartas en la tienda y juega con la ambientación que mejor encaje contigo.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* LEFT: Selector de Temas */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Palette size={16} className="text-yellow-400" />
              <span className="text-xs uppercase tracking-widest text-gray-500 font-bold font-['Chakra_Petch']">Temas disponibles</span>
            </div>

            <div className="space-y-3">
              {PREVIEW_THEMES.map((theme) => {
                const isActive = activeTheme.key === theme.key;
                const Icon = theme.icon;
                return (
                  <button
                    key={theme.key}
                    onClick={() => {
                      setActiveTheme(theme);
                      setDealCount(c => c + 1); // Auto-trigger deal on theme swap
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-start gap-4 cursor-pointer ${
                      isActive
                        ? 'bg-white/[0.04] border-yellow-500/30 shadow-[0_4px_20px_rgba(251,191,36,0.05)]'
                        : 'bg-white/[0.01] border-white/[0.06] hover:bg-white/[0.02] hover:border-white/[0.1]'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: theme.previewColor + '18',
                        border: `1px solid ${theme.previewColor}30`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: theme.previewColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm font-['Chakra_Petch']">{theme.name}</span>
                        {isActive && <CheckCircle size={14} className="text-yellow-400" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-['Chakra_Petch'] leading-relaxed">
                        {theme.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Tablero y Cartas interactivos */}
          <div className="lg:col-span-7 flex justify-center">
            <div
              className="relative w-full max-w-lg aspect-[4/3] rounded-3xl p-6 sm:p-8 flex flex-col justify-between overflow-hidden border-8 transition-all duration-500 select-none"
              style={{
                ...activeTheme.boardStyle,
                borderStyle: 'solid',
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Table details watermark */}
              <div className="absolute inset-0 bg-radial-felt opacity-30 pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.5))] pointer-events-none" />
              
              <div className="absolute top-4 left-4">
                <span className={`border text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-['Chakra_Petch'] ${activeTheme.badgeStyle}`}>
                  Preview de Mesa
                </span>
              </div>

              {/* Simulate Deal Button */}
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDealCount(c => c + 1);
                  }}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] text-gray-300 hover:text-white font-bold px-3 py-1.5 rounded-lg font-['Chakra_Petch'] uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1 shadow-md hover:scale-105 active:scale-95"
                >
                  <Sparkles size={10} className="text-yellow-400" />
                  Repartir Carta
                </button>
              </div>

              {/* Decorative center ring */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-white/[0.03] flex items-center justify-center pointer-events-none">
                <div className="w-36 h-36 rounded-full border border-white/[0.015]" />
              </div>

              {/* Holographic Watermark */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/[0.02] font-black font-['Russo_One'] text-6xl tracking-widest select-none pointer-events-none">
                KASINO
              </div>

              {/* Simulated Card slots */}
              <div className="flex gap-6 justify-center items-center h-full relative z-10">
                <AnimatePresence mode="wait">
                  {/* Card 1: Front */}
                  <motion.div
                    key={`card-front-${activeTheme.key}-${dealCount}`}
                    initial={{ rotateY: 90, opacity: 0, scale: 0.5, y: -100 }}
                    animate={{ rotateY: 0, opacity: 1, scale: 1, y: 0 }}
                    exit={{ rotateY: -90, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                      transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
                      ...activeTheme.cardStyle,
                    }}
                    className="w-24 h-36 sm:w-28 sm:h-40 rounded-2xl flex flex-col justify-between p-4 relative shadow-2xl transition-shadow duration-300"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-lg font-black leading-none">A</span>
                      <span className="text-lg leading-none">♠</span>
                    </div>
                    <div className="text-4xl sm:text-5xl self-center font-black">
                      ♠
                    </div>
                    <div className="flex justify-between items-end rotate-180">
                      <span className="text-lg font-black leading-none">A</span>
                      <span className="text-lg leading-none">♠</span>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {/* Card 2: Back */}
                  <motion.div
                    key={`card-back-${activeTheme.key}-${dealCount}`}
                    initial={{ rotateY: -90, opacity: 0, scale: 0.5, y: -100 }}
                    animate={{ rotateY: 0, opacity: 1, scale: 1, y: 0 }}
                    exit={{ rotateY: 90, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.08 }}
                    style={{
                      transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
                      ...activeTheme.cardBackStyle,
                    }}
                    className="w-24 h-36 sm:w-28 sm:h-40 rounded-2xl relative shadow-2xl flex flex-col justify-between p-3"
                  >
                    <div className="border border-white/10 rounded-xl flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-black/20">
                      <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center">
                        <Sparkles size={16} className="text-white/40 animate-pulse" />
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold font-['Chakra_Petch']">
                  Pasa el ratón para inclinar en 3D
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
