import React, { memo } from 'react';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

interface Props {
  value: string;
  suit: Suit;
  annotation?: string;
  isKey?: boolean;
  isFaceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  customStyle?: {
    cardBg?: string;
    cardBorder?: string;
    redSuitColor?: string;
    blackSuitColor?: string;
  };
  className?: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_NAMES: Record<Suit, string> = {
  spades: 'Picas',
  hearts: 'Corazones',
  diamonds: 'Diamantes',
  clubs: 'Tréboles',
};

function LandingCard({
  value,
  suit,
  annotation,
  isKey = false,
  isFaceDown = false,
  size = 'md',
  customStyle,
  className = '',
}: Props) {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const symbol = SUIT_SYMBOLS[suit];
  const suitName = SUIT_NAMES[suit];

  const sizeClasses = {
    sm: 'w-16 h-24 text-xs rounded-lg',
    md: 'w-20 h-28 sm:w-24 sm:h-36 text-sm rounded-xl',
    lg: 'w-28 h-40 sm:w-32 sm:h-48 text-base rounded-2xl',
  }[size];

  const suitColor = isRed
    ? customStyle?.redSuitColor || '#dc2626'
    : customStyle?.blackSuitColor || '#0f172a';

  if (isFaceDown) {
    return (
      <div
        role="img"
        aria-label="Carta boca abajo"
        className={`relative ${sizeClasses} border border-amber-500/30 shadow-lg flex items-center justify-center select-none overflow-hidden ${className}`}
        style={{
          background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)',
        }}
      >
        <div className="absolute inset-1.5 border border-amber-500/20 rounded-lg flex items-center justify-center">
          <span className="font-['Russo_One'] text-amber-400/40 text-lg tracking-wider">21</span>
        </div>
      </div>
    );
  }

  const cardBackground =
    customStyle?.cardBg || 'linear-gradient(165deg, #ffffff 0%, #f8fafc 40%, #e2e8f0 100%)';
  const cardBorder = customStyle?.cardBorder || (isKey ? 'rgba(251, 191, 36, 0.9)' : 'rgba(255, 255, 255, 0.7)');

  return (
    <div
      role="img"
      aria-label={`${value} de ${suitName}${annotation ? ` (${annotation})` : ''}`}
      className={`relative ${sizeClasses} select-none transition-transform duration-200 flex flex-col justify-between p-2 sm:p-2.5 shadow-md ${
        isKey ? 'ring-2 ring-amber-400 shadow-[0_4px_20px_rgba(251,191,36,0.35)] -translate-y-1' : ''
      } ${className}`}
      style={{
        background: cardBackground,
        border: `1.5px solid ${cardBorder}`,
      }}
    >
      {/* Top Left value & suit */}
      <div className="flex flex-col items-start leading-none font-bold" style={{ color: suitColor }}>
        <span className="font-['Russo_One'] tracking-tighter text-sm sm:text-base">{value}</span>
        <span className="text-xs sm:text-sm -mt-0.5">{symbol}</span>
      </div>

      {/* Center symbol */}
      <div
        className="self-center font-serif text-2xl sm:text-3xl my-auto select-none opacity-90 drop-shadow-sm"
        style={{ color: suitColor }}
      >
        {symbol}
      </div>

      {/* Bottom Right value & suit (inverted) */}
      <div
        className="flex flex-col items-end leading-none font-bold rotate-180"
        style={{ color: suitColor }}
      >
        <span className="font-['Russo_One'] tracking-tighter text-sm sm:text-base">{value}</span>
        <span className="text-xs sm:text-sm -mt-0.5">{symbol}</span>
      </div>

      {/* Optional Tactical Annotation Pill */}
      {annotation && (
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 border border-amber-400/50 text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-['Chakra_Petch'] font-bold tracking-tight shadow-md">
          {annotation}
        </div>
      )}
    </div>
  );
}

export default memo(LandingCard);
