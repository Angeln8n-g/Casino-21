import { useState, useEffect, useRef, useCallback } from 'react';

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
}

interface AdBannerProps {
  slides?: AdSlide[];
  /** Intervalo en ms entre slides (default: 5000) */
  interval?: number;
  /** Altura del banner (default: 'h-36') */
  heightClass?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Default placeholder slides — reemplazar con datos reales del CMS/DB
// ---------------------------------------------------------------------------

const DEFAULT_SLIDES: AdSlide[] = [
  {
    id: 'ad-1',
    bgGradient: 'linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%)',
    headline: '¡Torneo Semanal — 10,000 🪙 en premios!',
    subtext: 'Regístrate antes del domingo y compite por el top 1',
    ctaLabel: 'Ver Torneos',
    href: '#tournaments',
    badge: 'EN VIVO',
    badgeColor: 'bg-red-500',
  },
  {
    id: 'ad-2',
    bgGradient: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #2a475e 100%)',
    headline: 'Modo 2v2 — Juega con tu equipo',
    subtext: 'Forma equipo con un amigo y domina la mesa juntos',
    ctaLabel: 'Jugar Ahora',
    href: '#play',
    badge: 'NUEVO',
    badgeColor: 'bg-yellow-500',
  },
  {
    id: 'ad-3',
    bgGradient: 'linear-gradient(135deg, #1a0a0a 0%, #2d1515 50%, #4a1515 100%)',
    headline: 'Tienda — Temas y avatares exclusivos',
    subtext: 'Personaliza tu experiencia con skins premium',
    ctaLabel: 'Explorar Tienda',
    href: '#store',
    badge: 'OFERTA',
    badgeColor: 'bg-green-500',
  },
  {
    id: 'ad-4',
    bgGradient: 'linear-gradient(135deg, #0a1a0a 0%, #0f2d1a 50%, #1a4a2a 100%)',
    headline: 'Bot Experto ⚜️ — ¿Puedes vencerlo?',
    subtext: 'Entrena contra la IA más difícil del juego',
    ctaLabel: 'Desafiar Bot',
    href: '#play',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdBanner({
  slides = DEFAULT_SLIDES,
  interval = 5000,
  heightClass = 'h-36',
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
      className={`relative w-full overflow-hidden rounded-2xl border border-white/10 shadow-lg select-none ${heightClass} ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="Publicidad"
    >
      {/* Slide */}
      <div
        className={`absolute inset-0 flex items-center transition-opacity duration-300 ${
          animating ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ background: slide.bgGradient ?? '#0f172a' }}
      >
        {/* Background image overlay */}
        {slide.imageUrl && (
          <img
            src={slide.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            aria-hidden="true"
          />
        )}

        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
        />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-between w-full px-6 gap-4">
          {/* Text block */}
          <div className="flex-1 min-w-0">
            {slide.badge && (
              <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white mb-2 ${slide.badgeColor ?? 'bg-yellow-500'}`}>
                {slide.badge}
              </span>
            )}
            <h3 className="text-white font-black text-base sm:text-lg leading-tight truncate">
              {slide.headline}
            </h3>
            {slide.subtext && (
              <p className="text-gray-400 text-xs sm:text-sm mt-1 truncate">
                {slide.subtext}
              </p>
            )}
          </div>

          {/* CTA button */}
          {slide.ctaLabel && (
            <button
              onClick={handleClick}
              className="flex-shrink-0 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-black text-xs sm:text-sm px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 shadow-md whitespace-nowrap"
            >
              {slide.ctaLabel}
            </button>
          )}
        </div>

        {/* Decorative glow */}
        <div className="absolute right-0 top-0 w-48 h-full bg-gradient-to-l from-yellow-500/5 to-transparent pointer-events-none" />
      </div>

      {/* Prev / Next arrows — only shown on hover when multiple slides */}
      {slides.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:opacity-100 focus:opacity-100"
            aria-label="Anterior"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:opacity-100 focus:opacity-100"
            aria-label="Siguiente"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Ir al anuncio ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-5 h-1.5 bg-yellow-400'
                  : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {slides.length > 1 && !paused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-20">
          <div
            key={`${current}-progress`}
            className="h-full bg-yellow-400/60"
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
