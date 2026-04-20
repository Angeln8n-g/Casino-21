import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Board } from '../../domain/board';
import { DroppableBoardCard } from './DroppableBoardCard';
import { DroppableFormation } from './DroppableFormation';
import { Card } from '../../domain/card';
import splashBoard from '../../Public/splash.png';

interface BoardViewProps {
  board: Board;
  selectedCardIds: Set<string>;
  selectedFormationIds: Set<string>;
  onCardClick: (card: Card) => void;
  onFormationClick: (formationId: string) => void;
  boardThemeUrl?: string | null;
}

const DEFAULT_BOARD_THEME =
  'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.2) 0%, rgba(15, 23, 42, 0) 38%), radial-gradient(circle at 50% 100%, rgba(14, 116, 144, 0.25) 0%, rgba(8, 47, 73, 0.05) 45%), linear-gradient(145deg, #0a3258 0%, #07263f 45%, #041a2e 100%)';

export function BoardView({ board, selectedCardIds, selectedFormationIds, onCardClick, onFormationClick, boardThemeUrl }: BoardViewProps) {
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

  const boardBackgroundStyle: React.CSSProperties = boardThemeUrl
    ? {
        backgroundImage: `linear-gradient(160deg, rgba(4, 13, 24, 0.82), rgba(2, 8, 16, 0.8)), url(${boardThemeUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        backgroundImage: DEFAULT_BOARD_THEME,
      };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...boardBackgroundStyle,
        /* Auto-scale board on narrow viewports */
        transform: isMobile ? `scale(${boardScale})` : undefined,
        transformOrigin: 'top center',
      }}
      className={`
        relative flex flex-col items-center justify-center
        gap-3 md:gap-6 p-3 md:p-10 w-full max-w-5xl
        rounded-2xl md:rounded-[4rem]
        shadow-[0_8px_20px_rgba(0,0,0,0.5),inset_0_3px_10px_rgba(0,0,0,0.7)]
        md:shadow-[0_30px_60px_rgba(0,0,0,0.7),inset_0_10px_30px_rgba(0,0,0,0.9)]
        border-[6px] md:border-[16px] border-[#2A1810]
        ring-2 md:ring-8 ring-black/50
        transition-all flex-1 overflow-hidden
        ${isMobile ? 'min-h-[25vh] max-h-[45vh]' : 'min-h-[400px]'}
        ${isOver ? 'brightness-110 ring-cyan-300/40' : ''}
      `}
    >
      {!boardThemeUrl && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.10]"
          style={{
            backgroundImage: `url(${splashBoard})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
          }}
        />
      )}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06),transparent_55%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(251,191,36,0.18),transparent_30%,transparent_70%,rgba(251,191,36,0.12))]" />
      <div className="absolute inset-1 md:inset-2 rounded-xl md:rounded-[3rem] border border-yellow-300/35 pointer-events-none" />
      <div className="absolute inset-2 md:inset-5 rounded-xl md:rounded-[2.5rem] border border-yellow-200/20 pointer-events-none" />
      <div className="absolute inset-3 md:inset-8 rounded-lg md:rounded-[2rem] border border-yellow-100/10 pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-2xl md:rounded-[3rem]">
        <span className="text-3xl md:text-8xl font-black text-yellow-200/10 tracking-[0.2em] uppercase transform -rotate-12 select-none">
          Kasino21
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full h-full overflow-y-auto custom-scrollbar p-1 md:p-2">
        {board.cards.length === 0 && board.formations.length === 0 && board.cantedCards.length === 0 && (
          <div className="text-yellow-200/35 text-lg md:text-3xl font-bold mt-6 md:mt-16 uppercase tracking-widest drop-shadow-md">Mesa Vacia</div>
        )}

        {/* Cartas Sueltas — zona central */}
        {board.cards.length > 0 && (
          <div className="mb-3 md:mb-6 w-full text-center rounded-xl md:rounded-2xl border border-yellow-200/20 bg-black/20 backdrop-blur-sm p-2 md:p-4">
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
          <div className="flex flex-wrap justify-center gap-3 md:gap-8 mt-1 md:mt-4 border border-yellow-200/20 bg-black/20 rounded-xl md:rounded-2xl pt-5 md:pt-8 pb-2 md:pb-4 w-full relative">
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
          <div className="flex flex-wrap justify-center gap-2 md:gap-6 mt-1 md:mt-4 border border-yellow-200/20 bg-black/20 rounded-xl md:rounded-2xl pt-5 md:pt-8 pb-2 md:pb-4 w-full relative">
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
  );
}
