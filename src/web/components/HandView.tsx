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
  /** Optional action control rendered on the right side of the hand header bar (e.g. Reactions) */
  headerAction?: React.ReactNode;
}

export function HandView({ player, isCurrentTurn, selectedCardId, onCardClick, isDealing, cardTheme, headerAction }: HandViewProps) {
  // Cuando el jugador local se reconecta, si el server envía el estado sin "esconder" sus propias cartas
  // (ya que el index.ts clona el estado pero no oculta la mano del jugador a sí mismo),
  // a veces se pierde el tipo y React DnD falla. Verificamos que las cartas sean válidas.
  const hand = player.hand || [];

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div
      className={`
        px-2.5 py-2 md:px-4 md:py-3 rounded-2xl md:rounded-3xl transition-all backdrop-blur-xl border
        flex flex-col md:flex-row gap-1.5 md:gap-4 items-center w-full max-w-full relative
        ${isCurrentTurn
          ? 'bg-cyan-950/45 border-cyan-400/50 shadow-[0_8px_28px_rgba(6,182,212,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'bg-black/55 border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.45)]'
        }
      `}
      style={{
        /* Safe area padding for notched devices */
        paddingBottom: isMobile
          ? 'calc(0.5rem + env(safe-area-inset-bottom, 0px))'
          : undefined,
      }}
    >
      <div className="flex-grow w-full min-w-0">
        <div className="flex justify-between items-center mb-1.5 px-1 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-xs font-semibold text-gray-200">
              Tu Mano <span className="text-gray-400 font-normal">({hand.length})</span>
            </span>
            {isCurrentTurn && (
              <span className="bg-cyan-500/20 text-cyan-200 border border-cyan-400/35 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Tu Turno
              </span>
            )}
            {player.virados > 0 && (
              <span className="text-[10px] text-amber-200/90 font-medium bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                Virados: <span className="font-bold text-amber-300">{player.virados}</span>
              </span>
            )}
          </div>
          {headerAction && (
            <div className="shrink-0 relative z-30">
              {headerAction}
            </div>
          )}
        </div>

        {/* Card hand container — centered on both mobile and desktop */}
        <div
          className="
            flex gap-2.5 md:gap-4 w-full
            overflow-x-auto overflow-y-visible overscroll-contain custom-scrollbar
            px-1 md:px-0 justify-center items-center
            snap-x snap-mandatory md:snap-none
          "
          style={{
            /* Mobile: fixed height with min touch target; Desktop: adapt to viewport height */
            height: isMobile ? 'clamp(5rem, 23vw, 8.2rem)' : 'clamp(6.5rem, 13vh, 8.8rem)',
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
                className={`relative shrink-0 snap-center ${isDealing ? 'animate-deal motion-reduce:animate-none motion-reduce:transform-none' : ''}`}
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
            <div className="h-full flex items-center justify-center text-xs md:text-sm text-gray-300 italic w-full">
              Esperando cartas...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
