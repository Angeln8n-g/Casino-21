import React from 'react';
import { Player } from '../../domain/player';

interface CollectedCardsDeckProps {
  player: Player;
}

export function CollectedCardsDeck({ player }: CollectedCardsDeckProps) {
  const count = player.collectedCards.length;

  if (count === 0) return null;

  // We show a small stack of face-down cards
  const visibleCards = Math.min(count, 5); // Max 5 cards in the visual stack

  return (
    <div className="relative w-16 h-24 mx-4">
      {Array.from({ length: visibleCards }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-blue-900 border-2 border-white/50 rounded-lg shadow-xl"
          style={{
            transform: `translateY(${-i * 2}px) translateX(${i * 2}px)`,
            zIndex: i,
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)'
          }}
        />
      ))}
      <div 
        className="absolute inset-0 flex items-center justify-center font-bold text-white text-xl z-10 drop-shadow-md"
        style={{ transform: `translateY(${-visibleCards * 2}px) translateX(${visibleCards * 2}px)` }}
      >
        {count}
      </div>
      <div className="absolute -bottom-6 w-full text-center text-xs text-yellow-400 font-bold tracking-widest uppercase">
        Recogidas
      </div>
    </div>
  );
}
