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
      className={`relative flex flex-col items-center justify-center gap-6 p-10 w-full max-w-5xl min-h-[400px] rounded-[4rem] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-700 via-green-800 to-green-950 shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_10px_30px_rgba(0,0,0,0.8)] border-[16px] border-[#2A1810] ring-8 ring-black/50 transition-colors ${isOver ? 'brightness-110' : ''}`}
    >
      
      {/* Detalles de la mesa de casino (borde interior y logo) */}
      <div className="absolute inset-4 border border-yellow-500/20 rounded-[2.5rem] pointer-events-none"></div>
      <div className="absolute inset-8 border-2 border-yellow-500/10 rounded-[2rem] pointer-events-none"></div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-[3rem]">
        <span className="text-6xl md:text-8xl font-black text-yellow-500/10 tracking-[0.2em] uppercase transform -rotate-12 select-none">
          Casino 21
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full h-full">
        {board.cards.length === 0 && board.formations.length === 0 && board.cantedCards.length === 0 && (
          <div className="text-yellow-500/30 text-3xl font-bold mt-16 uppercase tracking-widest drop-shadow-md">Mesa Vacía</div>
        )}

        {/* Cartas Sueltas */}
        {board.cards.length > 0 && (
          <div className="mb-6 w-full text-center">
            <h3 className="text-xl font-bold mb-4 text-yellow-400 drop-shadow-md tracking-wider uppercase text-sm">Cartas Sueltas</h3>
            <div className="flex flex-wrap gap-4 justify-center min-h-[160px]">
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
          <div className="flex flex-wrap justify-center gap-8 mt-4 border-t border-yellow-500/20 pt-6 w-full relative">
            <div className="absolute -top-3 bg-green-800 px-4 text-yellow-500/50 text-xs font-bold tracking-widest uppercase">Formaciones</div>
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
          <div className="flex flex-wrap justify-center gap-6 mt-4 border-t border-yellow-500/20 pt-6 w-full relative">
            <div className="absolute -top-3 bg-green-800 px-4 text-yellow-500/50 text-xs font-bold tracking-widest uppercase">Cartas Cantadas</div>
            {board.cantedCards.map(canted => (
              <div key={canted.card.id} className="relative group">
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs px-3 py-1 rounded-full z-10 font-black shadow-xl transform group-hover:scale-110 transition-transform border border-yellow-200">
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
