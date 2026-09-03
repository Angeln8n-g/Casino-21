import React from 'react';
import { Player } from '../../domain/player';
import { DraggableCard } from './DraggableCard';
import { Card } from '../../domain/card';
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
        p-2 md:p-3 lg:p-4 rounded-2xl md:rounded-3xl transition-all backdrop-blur-md border
        flex flex-col md:flex-row gap-2 md:gap-4 items-center w-full max-w-full
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
        <div className="flex justify-between items-center mb-1 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-300">
              Tu Mano <span className="text-gray-400 font-normal">({hand.length})</span>
            </span>
            {isCurrentTurn && (
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] px-2 py-0.2 rounded-full font-bold uppercase tracking-wider">
                Tu Turno
              </span>
            )}
          </div>
          {player.virados > 0 && (
            <div className="text-[10px] text-amber-200/90 font-medium">
              Virados: <span className="font-bold text-amber-400">{player.virados}</span>
            </div>
          )}
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
            /* Mobile: fixed height with min touch target; Desktop: adapt to viewport height */
            height: isMobile ? 'clamp(5.5rem, 26vw, 9rem)' : 'clamp(6.5rem, 13vh, 8.8rem)',
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
    </div>
  );
}
