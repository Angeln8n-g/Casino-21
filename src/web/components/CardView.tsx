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
        relative w-[15vw] h-[22.5vw] min-w-[3rem] min-h-[4.5rem] max-w-[6rem] max-h-[9rem] md:w-24 md:h-36 rounded-xl flex flex-col justify-between p-1.5 md:p-3 
        select-none transition-all duration-300 transform-gpu touch-manipulation
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-2 md:hover:-translate-y-4 hover:rotate-y-12 hover:shadow-2xl'}
        ${selected ? 'ring-2 md:ring-4 ring-yellow-400 scale-110 -translate-y-3 md:-translate-y-6 shadow-2xl' : 'shadow-xl'}
        ${colorClass}
        ${className}
      `}
      style={{
        background: disabled ? '#e5e7eb' : 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)',
        boxShadow: selected 
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(255,255,255,0.8)' 
          : '0 10px 15px -3px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255,255,255,0.8)',
        transformStyle: 'preserve-3d',
        border: '1px solid rgba(255,255,255,0.5)',
        ...style
      }}
      {...props}
    >
      {/* 3D Inner Edge effect */}
      <div className="absolute inset-0 rounded-xl border border-gray-200 pointer-events-none" style={{ transform: 'translateZ(-1px)' }}></div>
      
      <div className="text-xs md:text-lg font-bold leading-none">{displayRank}</div>
      <div className="text-2xl md:text-5xl text-center flex-grow flex items-center justify-center filter drop-shadow-md">
        {suitSymbols[card.suit]}
      </div>
      <div className="text-xs md:text-lg font-bold leading-none rotate-180">{displayRank}</div>
    </div>
  );
});

CardView.displayName = 'CardView';
