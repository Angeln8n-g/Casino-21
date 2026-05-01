import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Board } from '../../domain/board';
import { DroppableBoardCard } from './DroppableBoardCard';
import { DroppableFormation } from './DroppableFormation';
import { Card } from '../../domain/card';
import splashBoard from '../../Public/splash.png';
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

  // Dynamic board scale: scale down proportionally on narrow screens
  const boardScale = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    const w = window.innerWidth;
    if (w >= 768) return 1;
    // Scale from 0.88 at 320px to 1 at 768px
    return Math.max(0.88, Math.min(1, 0.88 + (w - 320) * (0.12 / (768 - 320))));
  }, []);

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
        backgroundImage: formatBackground(boardTheme.background),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        backgroundImage:
          'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.2) 0%, rgba(15, 23, 42, 0) 38%), radial-gradient(circle at 50% 100%, rgba(14, 116, 144, 0.25) 0%, rgba(8, 47, 73, 0.05) 45%), linear-gradient(145deg, #0a3258 0%, #07263f 45%, #041a2e 100%)',
      };

  return (
    <div
      className={`w-full max-w-5xl rounded-2xl md:rounded-[4rem] p-3 md:p-6 ring-4 ring-black/80 transition-all relative overflow-hidden ${isMobile ? 'min-h-[25vh] max-h-[45vh]' : 'min-h-[400px]'} flex-1 flex flex-col`}
      style={{
        ...boardBackgroundStyle,
        transform: isMobile ? `scale(${boardScale})` : undefined,
        transformOrigin: 'top center',
      }}
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
          gap-3 md:gap-6 p-3 md:p-10 w-full h-full
          rounded-xl md:rounded-[3.2rem]
          shadow-[inset_0_10px_30px_rgba(0,0,0,0.5)]
          border-[2px] md:border-[4px]
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
      
      {/* Show classic inner rings and watermark ONLY if no custom theme is applied, to keep custom themes clean */}
      {!boardThemeUrl && !boardTheme && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(135deg, ${boardInnerRing.replace('0.35', '0.18')}, transparent 30%, transparent 70%, ${boardInnerRing.replace('0.35', '0.12')})`,
            }}
          />
          <div className="absolute inset-1 md:inset-2 rounded-xl md:rounded-[3rem] pointer-events-none" style={{ border: `1px solid ${boardInnerRing}` }} />
          <div className="absolute inset-2 md:inset-5 rounded-xl md:rounded-[2.5rem] pointer-events-none" style={{ border: `1px solid ${boardInnerRing.replace('0.35', '0.2')}` }} />
          <div className="absolute inset-3 md:inset-8 rounded-lg md:rounded-[2rem] pointer-events-none" style={{ border: `1px solid ${boardInnerRing.replace('0.35', '0.1')}` }} />
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-2xl md:rounded-[3rem]">
            <span
              className="text-3xl md:text-8xl font-black tracking-[0.2em] uppercase transform -rotate-12 select-none"
              style={{ color: `rgba(255,255,255,${watermarkOpacity})` }}
            >
              Kasino21
            </span>
          </div>
        </>
      )}

      <div className="relative z-10 flex flex-col items-center w-full h-full overflow-y-auto custom-scrollbar p-1 md:p-2">
        {board.cards.length === 0 && board.formations.length === 0 && board.cantedCards.length === 0 && (
          <div className="text-yellow-200/35 text-lg md:text-3xl font-bold mt-6 md:mt-16 uppercase tracking-widest drop-shadow-md">Mesa Vacia</div>
        )}

        {/* Cartas Sueltas — zona central */}
        {board.cards.length > 0 && (
          <div className="mb-3 md:mb-6 w-full text-center p-2 md:p-4 betting-box bg-black/10">
            <h3 className="text-[10px] md:text-sm font-bold mb-1.5 md:mb-4 text-yellow-300 drop-shadow-md tracking-wider uppercase">Cartas Sueltas</h3>
            <div className="flex flex-wrap gap-1.5 md:gap-4 justify-center min-h-[60px] md:min-h-[160px]">
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
          <div className="flex flex-wrap justify-center gap-3 md:gap-8 mt-1 md:mt-4 pt-5 md:pt-8 pb-2 md:pb-4 w-full relative betting-box bg-black/10">
            <div className="absolute top-1.5 md:top-2 bg-black/40 px-2 md:px-4 text-yellow-200/70 text-[9px] md:text-xs font-bold tracking-widest uppercase">Formaciones</div>
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
          <div className="flex flex-wrap justify-center gap-2 md:gap-6 mt-1 md:mt-4 pt-5 md:pt-8 pb-2 md:pb-4 w-full relative betting-box bg-black/10">
            <div className="absolute top-1.5 md:top-2 bg-black/40 px-2 md:px-4 text-yellow-200/70 text-[9px] md:text-xs font-bold tracking-widest uppercase">Cartas Cantadas</div>
            {board.cantedCards.map(canted => (
              <div key={canted.card.id} className="relative group">
                <div className="absolute -top-2 md:-top-4 -right-2 md:-right-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-[7px] md:text-xs px-1.5 md:px-3 py-0.5 md:py-1 rounded-full z-10 font-black shadow-xl transform group-hover:scale-110 transition-transform border border-yellow-200">
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
