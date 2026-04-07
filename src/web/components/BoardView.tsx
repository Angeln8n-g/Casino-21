import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Board } from '../../domain/board';
import { CardView } from './CardView';
import { DroppableBoardCard } from './DroppableBoardCard';
import { DroppableFormation } from './DroppableFormation';
import { Card } from '../../domain/card';

interface BoardViewProps {
  board: Board;
  selectedCardIds: Set<string>;
  selectedFormationIds: Set<string>;
  onCardClick: (card: Card) => void;
  onFormationClick: (formationId: string) => void;
}

export function BoardView({ board, selectedCardIds, selectedFormationIds, onCardClick, onFormationClick }: BoardViewProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'board-area',
    data: {
      type: 'board',
    },
  });

  return (
    <div 
      ref={setNodeRef}
      className={`relative flex flex-col items-center justify-center gap-4 md:gap-6 p-4 md:p-10 w-full max-w-5xl min-h-[30vh] md:min-h-[400px] rounded-3xl md:rounded-[4rem] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-700 via-green-800 to-green-950 shadow-[0_15px_30px_rgba(0,0,0,0.6),inset_0_5px_15px_rgba(0,0,0,0.8)] md:shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_10px_30px_rgba(0,0,0,0.8)] border-[8px] md:border-[16px] border-[#2A1810] ring-4 md:ring-8 ring-black/50 transition-colors flex-1 ${isOver ? 'brightness-110' : ''}`}
    >
      
      {/* Detalles de la mesa de casino (borde interior y logo) */}
      <div className="absolute inset-2 md:inset-4 border border-yellow-500/20 rounded-2xl md:rounded-[2.5rem] pointer-events-none"></div>
      <div className="absolute inset-4 md:inset-8 border-2 border-yellow-500/10 rounded-[1.5rem] md:rounded-[2rem] pointer-events-none"></div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-3xl md:rounded-[3rem]">
        <span className="text-4xl md:text-8xl font-black text-yellow-500/10 tracking-[0.2em] uppercase transform -rotate-12 select-none">
          Casino 21
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full h-full overflow-y-auto custom-scrollbar p-2">
        {board.cards.length === 0 && board.formations.length === 0 && board.cantedCards.length === 0 && (
          <div className="text-yellow-500/30 text-xl md:text-3xl font-bold mt-8 md:mt-16 uppercase tracking-widest drop-shadow-md">Mesa Vacía</div>
        )}

        {/* Cartas Sueltas */}
        {board.cards.length > 0 && (
          <div className="mb-4 md:mb-6 w-full text-center">
            <h3 className="text-xs md:text-sm font-bold mb-2 md:mb-4 text-yellow-400 drop-shadow-md tracking-wider uppercase">Cartas Sueltas</h3>
            <div className="flex flex-wrap gap-2 md:gap-4 justify-center min-h-[80px] md:min-h-[160px]">
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

        {/* Formaciones */}
        {board.formations.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-2 md:mt-4 border-t border-yellow-500/20 pt-4 md:pt-6 w-full relative">
            <div className="absolute -top-3 bg-green-800 px-2 md:px-4 text-yellow-500/50 text-[10px] md:text-xs font-bold tracking-widest uppercase">Formaciones</div>
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

        {/* Cartas Cantadas */}
        {board.cantedCards.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mt-2 md:mt-4 border-t border-yellow-500/20 pt-4 md:pt-6 w-full relative">
            <div className="absolute -top-3 bg-green-800 px-2 md:px-4 text-yellow-500/50 text-[10px] md:text-xs font-bold tracking-widest uppercase">Cartas Cantadas</div>
            {board.cantedCards.map(canted => (
              <div key={canted.card.id} className="relative group">
                <div className="absolute -top-3 md:-top-4 -right-3 md:-right-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-[8px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 rounded-full z-10 font-black shadow-xl transform group-hover:scale-110 transition-transform border border-yellow-200">
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
