import React from 'react';
import { Player } from '../../domain/player';
import { DraggableCard } from './DraggableCard';
import { Card } from '../../domain/card';
import { CollectedCardsDeck } from './CollectedCardsDeck';
import { CardTheme } from '../themes/themeRegistry';

interface HandViewProps {
  player: Player;
  isCurrentTurn: boolean;
  selectedCardId: string | null;
  onCardClick: (card: Card) => void;
  isDealing?: boolean;
  /** Card theme from the local player's equipped_theme */
  cardTheme?: CardTheme;
}

export function HandView({ player, isCurrentTurn, selectedCardId, onCardClick, isDealing, cardTheme }: HandViewProps) {
  // Cuando el jugador local se reconecta, si el server envía el estado sin "esconder" sus propias cartas
  // (ya que el index.ts clona el estado pero no oculta la mano del jugador a sí mismo),
  // a veces se pierde el tipo y React DnD falla. Verificamos que las cartas sean válidas.
  const hand = player.hand || [];

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div
      className={`
        p-3 md:p-6 rounded-2xl md:rounded-3xl transition-all backdrop-blur-md border
        flex flex-col md:flex-row gap-3 md:gap-8 items-center w-full max-w-full
        ${isCurrentTurn
          ? 'bg-cyan-900/25 border-cyan-300/50 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
          : 'bg-black/25 border-white/10'
        }
      `}
      style={{
        /* Safe area padding for notched devices */
        paddingBottom: isMobile
          ? 'calc(0.75rem + env(safe-area-inset-bottom, 0px))'
          : undefined,
      }}
    >
      <div className="flex-grow w-full min-w-0">
        <div className="flex justify-between items-center mb-2 md:mb-4">
          <h3 className="text-sm md:text-2xl font-bold flex items-center gap-2 md:gap-3 drop-shadow-md truncate">
            {player.name}
            {isCurrentTurn && (
              <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[9px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 rounded-full animate-pulse shadow-lg shrink-0">
                Tu Turno
              </span>
            )}
          </h3>
          <div className="text-[10px] md:text-sm text-gray-100 bg-black/35 px-2 md:px-4 py-1 md:py-2 rounded-full border border-white/15 shrink-0">
            Virados: <span className="font-bold text-yellow-400">{player.virados}</span>
          </div>
        </div>

        {/* Card hand container — horizontal scroll on mobile, centered on desktop */}
        <div
          className="
            flex gap-2 md:gap-4 w-full
            overflow-x-auto overflow-y-visible overscroll-contain custom-scrollbar
            px-1 md:px-0 md:justify-center
            snap-x snap-mandatory md:snap-none
          "
          style={{
            /* Mobile: fixed height with min touch target; Desktop: taller */
            height: isMobile ? 'clamp(5.5rem, 26vw, 9rem)' : '10rem',
            /* Hide scrollbar on mobile for cleaner look */
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {hand.map((card, index) => {
            if (!card) return null;
            return (
              <div
                key={card.id || `fallback-${index}`}
                className={`relative shrink-0 snap-center ${isDealing ? 'animate-deal' : ''}`}
                style={{
                  animationDelay: isDealing ? `${index * 0.1}s` : '0s',
                  /* Ensure minimum 44px touch target on mobile */
                  minWidth: isMobile ? '3rem' : undefined,
                }}
              >
                <DraggableCard
                  card={card}
                  selected={selectedCardId === card.id}
                  onClick={() => isCurrentTurn && onCardClick(card)}
                  disabled={!isCurrentTurn}
                  theme={cardTheme}
                />
              </div>
            );
          })}
          {hand.length === 0 && (
            <div className="h-full flex items-center justify-center text-xs md:text-sm text-gray-400 italic w-full">
              Esperando cartas...
            </div>
          )}
        </div>
      </div>

      <div className="flex md:hidden w-full border-t border-white/10 pt-3 justify-center">
        <CollectedCardsDeck player={player} />
      </div>
      <div className="hidden md:flex flex-col items-center justify-center border-l border-white/10 pl-8">
        <CollectedCardsDeck player={player} />
      </div>
    </div>
  );
}
