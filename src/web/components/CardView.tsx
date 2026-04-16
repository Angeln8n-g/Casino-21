import React, { forwardRef } from 'react';
import { Card } from '../../domain/card';

interface CardViewProps {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const CardView = forwardRef<HTMLDivElement, CardViewProps>(({ card, selected, onClick, disabled, style, className = '', ...props }, ref) => {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const colorClass = isRed ? 'text-red-600' : 'text-gray-900';
  
  const suitSymbols = {
    spades: '♠',
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣'
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
        ${selected ? 'ring-2 md:ring-4 ring-yellow-300 scale-[1.03] md:scale-[1.07] -translate-y-1 md:-translate-y-4 shadow-2xl' : 'shadow-xl'}
        ${colorClass}
        ${className}
      `}
      style={{
        background: disabled ? '#e5e7eb' : 'linear-gradient(165deg, #ffffff 0%, #f8fafc 35%, #e2e8f0 100%)',
        boxShadow: selected 
          ? '0 22px 40px -10px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.45) inset, inset 0 2px 6px rgba(255,255,255,0.9)' 
          : '0 10px 20px -6px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255,255,255,0.45) inset, inset 0 2px 6px rgba(255,255,255,0.9)',
        transformStyle: 'preserve-3d',
        border: '1px solid rgba(255,255,255,0.55)',
        ...style
      }}
      {...props}
    >
      {/* 3D Inner Edge effect */}
      <div className="absolute inset-[3px] rounded-xl border border-slate-300/80 pointer-events-none" style={{ transform: 'translateZ(-1px)' }}></div>
      
      <div className="text-xs md:text-lg font-semibold leading-none tracking-tight">{displayRank}</div>
      <div className="text-2xl md:text-5xl text-center flex-grow flex items-center justify-center filter drop-shadow-lg">
        {suitSymbols[card.suit]}
      </div>
      <div className="text-xs md:text-lg font-semibold leading-none rotate-180 tracking-tight">{displayRank}</div>
    </div>
  );
});

CardView.displayName = 'CardView';
