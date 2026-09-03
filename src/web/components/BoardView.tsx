import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Board } from '../../domain/board';
import { DroppableBoardCard } from './DroppableBoardCard';
import { DroppableFormation } from './DroppableFormation';
import { Card } from '../../domain/card';
import splashBoard from '../../Public/splash.webp';
import { BoardTheme } from '../themes/themeRegistry';

interface BoardViewProps {
  board: Board;
  selectedCardIds: Set<string>;
  selectedFormationIds: Set<string>;
  onCardClick: (card: Card) => void;
  onFormationClick: (formationId: string) => void;
  /** Legacy URL-based board theme (tournaments, quests). Takes priority over boardTheme. */
  boardThemeUrl?: string | null;
  /** Store-based visual board theme from the host's equipped_theme */
  boardTheme?: BoardTheme | null;
}

const DEFAULT_BOARD_THEME =
  'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.2) 0%, rgba(15, 23, 42, 0) 38%), radial-gradient(circle at 50% 100%, rgba(14, 116, 144, 0.25) 0%, rgba(8, 47, 73, 0.05) 45%), linear-gradient(145deg, #0a3258 0%, #07263f 45%, #041a2e 100%)';

export function BoardView({ board, selectedCardIds, selectedFormationIds, onCardClick, onFormationClick, boardThemeUrl, boardTheme }: BoardViewProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'board-area',
    data: {
      type: 'board',
    },
  });

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // URL theme takes priority (tournaments/quests), then store theme, then default
  const boardBorderColor = boardTheme?.borderColor ?? '#2A1810';
  const boardGlowColor = boardTheme?.glowColor ?? 'rgba(34,211,238,0.4)';
  const boardInnerRing = boardTheme?.innerRingColor ?? 'rgba(253,224,71,0.35)';
  const watermarkOpacity = boardTheme?.watermarkOpacity ?? 0.1;

  // Ensure store themes (which are just image URLs) are wrapped in url() if they aren't already
  const formatBackground = (bg: string | undefined | null) => {
    if (!bg) return undefined;
    if (bg.startsWith('http') || bg.startsWith('/')) {
      return `url("${bg}")`;
    }
    return bg;
  };

  const boardBackgroundStyle: React.CSSProperties = boardThemeUrl
    ? {
        backgroundImage: `linear-gradient(160deg, rgba(4, 13, 24, 0.82), rgba(2, 8, 16, 0.8)), url("${boardThemeUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : boardTheme
    ? {
        backgroundImage: boardTheme.backgroundImage
          ? `url("${boardTheme.backgroundImage}")`
          : formatBackground(boardTheme.background),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        backgroundImage:
          'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.2) 0%, rgba(15, 23, 42, 0) 38%), radial-gradient(circle at 50% 100%, rgba(14, 116, 144, 0.25) 0%, rgba(8, 47, 73, 0.05) 45%), linear-gradient(145deg, #0a3258 0%, #07263f 45%, #041a2e 100%)',
      };

  return (
    <div
      className="w-full max-w-5xl rounded-2xl md:rounded-[2.5rem] lg:rounded-[3rem] p-2 md:p-3 lg:p-4 ring-4 ring-black/80 transition-all relative overflow-hidden flex-1 min-h-0 flex flex-col"
      style={boardBackgroundStyle}
    >
      {/* Optional store-theme overlay gradient (Applied to full board now) */}
      {boardTheme?.overlayGradient && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: boardTheme.overlayGradient }}
        />
      )}

      {/* Default wood background if no theme is applied */}
      {!boardThemeUrl && !boardTheme && (
         <div className="absolute inset-0 pointer-events-none wood-bumper -z-10" />
      )}

      <div
        ref={setNodeRef}
        style={{
          borderColor: boardBorderColor,
          // Apply the default inner blue gradient ONLY if no custom theme is used
          backgroundImage: (!boardTheme && !boardThemeUrl) 
            ? 'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.2) 0%, rgba(15, 23, 42, 0) 38%), radial-gradient(circle at 50% 100%, rgba(14, 116, 144, 0.25) 0%, rgba(8, 47, 73, 0.05) 45%), linear-gradient(145deg, #0a3258 0%, #07263f 45%, #041a2e 100%)'
            : 'none',
        }}
        className={`
          relative flex flex-col items-center justify-center
          gap-2 md:gap-3 p-2 md:p-4 lg:p-6 w-full h-full
          rounded-xl md:rounded-[2.2rem]
          shadow-[inset_0_10px_30px_rgba(0,0,0,0.5)]
          border-[2px] md:border-[3px]
          ring-1 md:ring-2 ring-black/50
          transition-all flex-1 overflow-hidden
          ${!boardTheme && !boardThemeUrl ? 'bg-black/40 backdrop-blur-md' : 'bg-transparent'} 
          ${isOver ? 'brightness-110 bg-black/30' : ''}
        `}
      >
      {!boardThemeUrl && !boardTheme && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: watermarkOpacity,
            backgroundImage: `url(${splashBoard})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
          }}
        />
      )}
      
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06),transparent_55%)]" />
      
      {/* Single clean subtle table rail */}
      {!boardThemeUrl && !boardTheme && (
        <div
          className="absolute inset-2 md:inset-3 rounded-xl md:rounded-[2.5rem] pointer-events-none border border-yellow-500/15"
        />
      )}

      <div className="relative z-10 flex flex-col items-center w-full h-full overflow-y-auto custom-scrollbar p-1 md:p-2">
        {board.cards.length === 0 && board.formations.length === 0 && board.cantedCards.length === 0 && (
          <div className="text-gray-400/50 text-base md:text-xl font-bold mt-8 md:mt-16 tracking-widest uppercase">
            Mesa Vacía
          </div>
        )}

        {/* Cartas Sueltas — zona central */}
        {board.cards.length > 0 && (
          <div className="mb-2 md:mb-3 w-full text-center p-2 rounded-xl bg-black/15 border border-white/5">
            <h3 className="text-[10px] md:text-xs font-semibold mb-1 md:mb-1.5 text-amber-200/80 tracking-wider uppercase">Cartas en Mesa</h3>
            <div className="flex flex-wrap gap-1.5 md:gap-3 justify-center min-h-[50px] md:min-h-[75px]">
              {board.cards.map(card => (
                <DroppableBoardCard
                  key={card.id}
                  card={card}
                  selected={selectedCardIds.has(card.id)}
                  onClick={() => onCardClick(card)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Formaciones — zona separada visualmente */}
        {board.formations.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2.5 md:gap-6 mt-1 md:mt-3 pt-4 md:pt-6 pb-2 w-full relative rounded-xl bg-black/15 border border-white/5">
            <div className="absolute -top-2 bg-gray-900/90 border border-white/10 px-2.5 py-0.5 rounded-full text-amber-200/80 text-[9px] md:text-[10px] font-bold tracking-wider uppercase shadow">Formaciones</div>
            {board.formations.map(form => (
              <DroppableFormation
                key={form.id}
                formation={{ ...form, cards: [...form.cards] }}
                selected={selectedFormationIds.has(form.id)}
                onClick={() => onFormationClick(form.id)}
              />
            ))}
          </div>
        )}

        {/* Cartas Cantadas — zona separada */}
        {board.cantedCards.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 md:gap-5 mt-1 md:mt-3 pt-4 md:pt-6 pb-2 w-full relative rounded-xl bg-black/15 border border-white/5">
            <div className="absolute -top-2 bg-gray-900/90 border border-white/10 px-2.5 py-0.5 rounded-full text-amber-200/80 text-[9px] md:text-[10px] font-bold tracking-wider uppercase shadow">Cartas Cantadas</div>
            {board.cantedCards.map(canted => (
              <div key={canted.card.id} className="relative group">
                <div className="absolute -top-2 md:-top-3 -right-2 md:-right-3 bg-amber-400 text-amber-950 text-[8px] md:text-[10px] px-1.5 py-0.5 rounded-full z-10 font-black shadow-md border border-amber-200">
                  CANTADA
                </div>
                <DroppableBoardCard
                  card={canted.card}
                  selected={selectedCardIds.has(canted.card.id)}
                  onClick={() => onCardClick(canted.card)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
