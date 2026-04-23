import React, { forwardRef } from 'react';
import { Card } from '../../domain/card';
import { CardTheme } from '../themes/themeRegistry';

interface CardViewProps {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  /** Optional card theme injected from the player's equipped theme */
  theme?: CardTheme;
}

const DEFAULT_CARD_THEME: CardTheme = {
  background: 'linear-gradient(165deg, #ffffff 0%, #f8fafc 35%, #e2e8f0 100%)',
  boxShadow:
    '0 10px 20px -6px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.45) inset, inset 0 2px 6px rgba(255,255,255,0.9)',
  boxShadowSelected:
    '0 22px 40px -10px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.45) inset, inset 0 2px 6px rgba(255,255,255,0.9)',
  border: '1px solid rgba(255,255,255,0.55)',
  innerEdge: 'rgba(148,163,184,0.8)',
  redSuitColor: '#dc2626',
  blackSuitColor: '#111827',
};

export const CardView = forwardRef<HTMLDivElement, CardViewProps>(
  ({ card, selected, onClick, disabled, style, className = '', theme, ...props }, ref) => {
    const t = theme ?? DEFAULT_CARD_THEME;

    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const suitColor = isRed ? t.redSuitColor : t.blackSuitColor;

    const suitSymbols = {
      spades: '♠',
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
    };

    const displayRank = card.rank;

    return (
      <div
        ref={ref}
        onClick={disabled ? undefined : onClick}
        className={`
          relative w-[clamp(2.6rem,14vw,5.2rem)] h-[clamp(3.9rem,21vw,7.8rem)] md:w-24 md:h-36 rounded-2xl flex flex-col justify-between p-1.5 md:p-3
          select-none transition-all duration-300 transform-gpu touch-manipulation
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 md:hover:-translate-y-3 hover:shadow-2xl'}
          ${selected ? 'scale-[1.03] md:scale-[1.07] -translate-y-1 md:-translate-y-4' : 'shadow-xl'}
          ${t.extraClass ?? ''}
          ${className}
        `}
        style={{
          background: disabled ? '#e5e7eb' : t.background,
          // When selected: animated glow overrides static shadow
          boxShadow: selected ? t.boxShadowSelected : t.boxShadow,
          border: selected ? '1.5px solid rgba(250,204,21,0.65)' : t.border,
          color: suitColor,
          transformStyle: 'preserve-3d',
          // CSS animation applied inline so it works regardless of Tailwind JIT purge
          animation: selected ? 'cardGlow 1.6s ease-in-out infinite' : undefined,
          ...style,
        }}
        {...props}
      >
        {/* 3D Inner Edge effect */}
        <div
          className="absolute inset-[3px] rounded-xl pointer-events-none"
          style={{
            border: `1px solid ${t.innerEdge}`,
            transform: 'translateZ(-1px)',
          }}
        />

        {/* ── Shimmer sweep — only when selected ── */}
        {selected && (
          <div
            aria-hidden
            className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                backgroundImage:
                  'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.45) 50%, transparent 80%)',
                backgroundSize: '250% 100%',
                animation: 'cardShimmer 2.2s linear infinite',
              }}
            />
          </div>
        )}

        <div className="text-xs md:text-lg font-semibold leading-none tracking-tight relative z-10">{displayRank}</div>
        <div className="text-2xl md:text-5xl text-center flex-grow flex items-center justify-center filter drop-shadow-lg relative z-10">
          {suitSymbols[card.suit]}
        </div>
        <div className="text-xs md:text-lg font-semibold leading-none rotate-180 tracking-tight relative z-10">{displayRank}</div>
      </div>
    );
  }
);

CardView.displayName = 'CardView';
