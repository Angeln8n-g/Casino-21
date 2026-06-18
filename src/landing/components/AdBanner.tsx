import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Users, ShoppingBag, Cpu, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdSlide {
  id: string;
  /** URL de la imagen del banner */
  imageUrl?: string;
  /** Color de fondo si no hay imagen (gradiente CSS) */
  bgGradient?: string;
  /** Texto principal del banner */
  headline: string;
  /** Texto secundario / descripción */
  subtext?: string;
  /** Etiqueta del botón CTA */
  ctaLabel?: string;
  /** URL de destino al hacer clic */
  href?: string;
  /** Badge opcional (ej: "NUEVO", "OFERTA") */
  badge?: string;
  /** Color del badge */
  badgeColor?: string;
  
  // Custom new fields for rich design
  accentColor?: 'gold' | 'cyan' | 'emerald' | 'purple';
  icon?: React.ComponentType<{ className?: string }>;
}

interface AdBannerProps {
  slides?: AdSlide[];
  /** Intervalo en ms entre slides (default: 5000) */
  interval?: number;
  /** Altura del banner (default: 'h-40 sm:h-44 md:h-48') */
  heightClass?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getAccentClass = (accent?: string) => {
  switch (accent) {
    case 'cyan': return {
      border: 'border-cyan-500/20',
      shadow: 'shadow-[0_0_30px_rgba(56,189,248,0.04)]',
      bgGlow: 'radial-gradient(circle at 75% 50%, rgba(56, 189, 248, 0.1) 0%, rgba(2, 6, 23, 0) 70%)',
      iconCap: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.15)]',
      badge: 'text-cyan-400 border border-cyan-500/30 bg-cyan-500/10',
      btn: 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(56,189,248,0.2)]',
      dotActive: 'bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]',
      progress: 'bg-cyan-500/80 shadow-[0_0_6px_rgba(56,189,248,0.4)]'
    };
    case 'emerald': return {
      border: 'border-emerald-500/20',
      shadow: 'shadow-[0_0_30px_rgba(16, 185, 129, 0.04)]',
      bgGlow: 'radial-gradient(circle at 75% 50%, rgba(16, 185, 129, 0.1) 0%, rgba(2, 6, 23, 0) 70%)',
      iconCap: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16, 185, 129, 0.15)]',
      badge: 'text-emerald-400 border border-emerald-500/30 bg-emerald-500/10',
      btn: 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16, 185, 129, 0.2)]',
      dotActive: 'bg-emerald-400 shadow-[0_0_8px_rgba(16, 185, 129, 0.5)]',
      progress: 'bg-emerald-500/80 shadow-[0_0_6px_rgba(16, 185, 129, 0.4)]'
    };
    case 'purple': return {
      border: 'border-purple-500/20',
      shadow: 'shadow-[0_0_30px_rgba(167, 139, 250, 0.04)]',
      bgGlow: 'radial-gradient(circle at 75% 50%, rgba(167, 139, 250, 0.1) 0%, rgba(2, 6, 23, 0) 70%)',
      iconCap: 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(167, 139, 250, 0.15)]',
      badge: 'text-purple-400 border border-purple-500/30 bg-purple-500/10',
      btn: 'bg-purple-500 hover:bg-purple-400 text-black shadow-[0_0_15px_rgba(167, 139, 250, 0.2)]',
      dotActive: 'bg-purple-400 shadow-[0_0_8px_rgba(167, 139, 250, 0.5)]',
      progress: 'bg-purple-500/80 shadow-[0_0_6px_rgba(167, 139, 250, 0.4)]'
    };
    case 'gold':
    default: return {
      border: 'border-yellow-500/20',
      shadow: 'shadow-[0_0_30px_rgba(251, 191, 36, 0.04)]',
      bgGlow: 'radial-gradient(circle at 75% 50%, rgba(251, 191, 36, 0.1) 0%, rgba(2, 6, 23, 0) 70%)',
      iconCap: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 shadow-[0_0_15px_rgba(251, 191, 36, 0.15)]',
      badge: 'text-yellow-400 border border-yellow-500/30 bg-yellow-500/10',
      btn: 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_15px_rgba(251, 191, 36, 0.2)]',
      dotActive: 'bg-yellow-400 shadow-[0_0_8px_rgba(251, 191, 36, 0.5)]',
      progress: 'bg-yellow-500/80 shadow-[0_0_6px_rgba(251, 191, 36, 0.4)]'
    };
  }
};

// ---------------------------------------------------------------------------
// Default placeholder slides — con iconografía vectorial y diseño de neón
// ---------------------------------------------------------------------------

const DEFAULT_SLIDES: AdSlide[] = [
  {
    id: 'ad-1',
    accentColor: 'gold',
    icon: Trophy,
    headline: 'Torneo Semanal — 10,000 en premios',
    subtext: 'Regístrate antes del domingo y compite por el top 1 global',
    ctaLabel: 'Ver Torneos',
    href: '#tournaments',
    badge: 'EN VIVO',
  },
  {
    id: 'ad-2',
    accentColor: 'cyan',
    icon: Users,
    headline: 'Modo 2v2 — Juega en equipo en tiempo real',
    subtext: 'Forma equipo con un amigo y domina la mesa en partidas cooperativas',
    ctaLabel: 'Jugar Ahora',
    href: '#play',
    badge: 'NUEVO',
  },
  {
    id: 'ad-3',
    accentColor: 'emerald',
    icon: ShoppingBag,
    headline: 'Tienda — Temas y avatares exclusivos',
    subtext: 'Personaliza tu experiencia con tableros holográficos y skins premium',
    ctaLabel: 'Explorar Tienda',
    href: '#store',
    badge: 'OFERTA',
  },
  {
    id: 'ad-4',
    accentColor: 'purple',
    icon: Cpu,
    headline: 'Desafío Bot Experto — ¿Tienes lo necesario?',
    subtext: 'Entrena contra nuestra IA avanzada de nivel maestro sin apostar dinero real',
    ctaLabel: 'Desafiar Bot',
    href: '#play',
    badge: 'SOLO PLAY',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdBanner({
  slides = DEFAULT_SLIDES,
  interval = 6000,
  heightClass = 'h-36 sm:h-40 md:h-44',
  className = '',
}: AdBannerProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (index: number) => {
      if (animating || index === current) return;
      setAnimating(true);
      setTimeout(() => {
        setCurrent(index);
        setAnimating(false);
      }, 300);
    },
    [animating, current]
  );

  const next = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, slides.length, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length);
  }, [current, slides.length, goTo]);

  // Auto-advance
  useEffect(() => {
    if (paused || slides.length <= 1) return;
    timerRef.current = setInterval(next, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, next, interval, slides.length]);

  if (!slides.length) return null;

  const slide = slides[current];
  const SlideIcon = slide.icon || Sparkles;
  const activeAccent = slide.accentColor || 'gold';
  const design = getAccentClass(activeAccent);

  const handleClick = () => {
    if (slide.href) {
      if (slide.href.startsWith('http')) {
        window.open(slide.href, '_blank', 'noopener,noreferrer');
      } else {
        const el = document.querySelector(slide.href);
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div
      className={`glass-cyber group relative w-full overflow-hidden rounded-2xl md:rounded-3xl border transition-all duration-500 select-none ${design.border} ${design.shadow} ${heightClass} ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="Publicidad"
    >
      {/* Corner brackets (Futuristic HUD detail) */}
      <div className={`absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 pointer-events-none transition-colors duration-500 ${design.border}`} />
      <div className={`absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 pointer-events-none transition-colors duration-500 ${design.border}`} />
      <div className={`absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 pointer-events-none transition-colors duration-500 ${design.border}`} />
      <div className={`absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 pointer-events-none transition-colors duration-500 ${design.border}`} />

      {/* Lobby Tech Status Indicator */}
      <div className="absolute top-2.5 right-6 hidden md:flex items-center gap-1.5 text-[8px] font-black font-['Chakra_Petch'] text-gray-600 select-none tracking-[0.2em] pointer-events-none">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        LOBBY_BANNER // STABLE_SYS_OK
      </div>

      {/* Slide */}
      <div
        className={`absolute inset-0 flex items-center transition-opacity duration-300 ${
          animating ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Felt fabric dot pattern for authentic table background */}
        <div className="absolute inset-0 bg-radial-felt opacity-[0.22] pointer-events-none" />

        {/* Ambient radial color glow */}
        <div
          className="absolute inset-0 transition-all duration-500 pointer-events-none"
          style={{ background: design.bgGlow }}
        />

        {/* Scanline grid overlay */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-[linear-gradient(rgba(18,24,38,0.95),rgba(10,15,26,0.95))] bg-[size:100%_4px]" />

        {/* Background image overlay (fallback / custom support) */}
        {slide.imageUrl && (
          <img
            src={slide.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-screen pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Content layout */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between w-full px-6 md:px-10 py-4 gap-4 h-full">
          
          {/* Left Side: Icon + Texts */}
          <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto min-w-0">
            {/* Glowing Icon Capsule */}
            {SlideIcon && (
              <div className={`hidden sm:flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 transition-all duration-500 ${design.iconCap}`}>
                <SlideIcon size={22} className="transition-transform duration-500 group-hover:scale-110" />
              </div>
            )}
            
            {/* Text block */}
            <div className="flex-1 min-w-0 text-left">
              {slide.badge && (
                <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-1.5 transition-colors duration-500 ${design.badge}`}>
                  {slide.badge}
                </span>
              )}
              <h3 className="text-white font-black text-sm sm:text-base md:text-lg tracking-wider leading-tight truncate font-['Russo_One']">
                {slide.headline}
              </h3>
              {slide.subtext && (
                <p className="text-gray-400 text-xs sm:text-sm mt-0.5 truncate font-['Chakra_Petch']">
                  {slide.subtext}
                </p>
              )}
            </div>
          </div>

          {/* Right Side: CTA Button */}
          {slide.ctaLabel && (
            <button
              onClick={handleClick}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest font-['Russo_One'] transition-all duration-300 hover:scale-105 active:scale-95 ${design.btn}`}
            >
              {slide.ctaLabel}
            </button>
          )}
        </div>
      </div>

      {/* Prev / Next arrows — only shown on hover when multiple slides */}
      {slides.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-lg border border-white/5 bg-black/45 backdrop-blur-md text-gray-400 hover:text-white hover:border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
            aria-label="Anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-lg border border-white/5 bg-black/45 backdrop-blur-md text-gray-400 hover:text-white hover:border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
            aria-label="Siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Ir al anuncio ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? `w-5 h-1 ${design.dotActive}`
                  : 'w-1 h-1 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {slides.length > 1 && !paused && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/[0.04] z-20">
          <div
            key={`${current}-progress`}
            className={`h-full transition-all duration-500 ${design.progress}`}
            style={{
              animation: `adProgress ${interval}ms linear forwards`,
            }}
          />
        </div>
      )}

      {/* Keyframe injection */}
      <style>{`
        @keyframes adProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
