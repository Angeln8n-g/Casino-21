import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { CardView } from './CardView';
import { Card } from '../../domain/card';

interface Formation {
  id: string;
  cards: readonly Card[];
  value: number;
  isGroup?: boolean;
}

interface DroppableFormationProps {
  formation: Formation;
  selected?: boolean;
  onClick?: () => void;
}

export function DroppableFormation({ formation, selected, onClick }: DroppableFormationProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `formation-${formation.id}`,
    data: {
      type: 'formation',
      formation,
    },
  });

  return (
    <div 
      ref={setNodeRef}
      className={`
        px-3 py-2 md:px-4 md:py-3 rounded-2xl border-2 transition-all duration-300 cursor-pointer shadow-xl backdrop-blur-sm relative
        ${selected ? 'border-yellow-400 bg-white/15 scale-[1.03]' : 'border-yellow-500/35 bg-black/25 hover:border-yellow-400/60 hover:bg-black/35'}
        ${isOver ? 'ring-4 ring-green-400 scale-105 shadow-[0_10px_25px_rgba(74,222,128,0.45)]' : ''}
      `}
      onClick={onClick}
    >
      {formation.isGroup && (
        <div className="absolute -top-2.5 -right-2.5 bg-orange-600 text-white text-[9px] md:text-[11px] px-2 py-0.5 rounded-full z-20 font-black shadow-lg border border-orange-300">
          GRUPO
        </div>
      )}
      <div className="text-xs md:text-sm font-bold text-amber-300 mb-1.5 md:mb-2 text-center drop-shadow">
        Valor: {formation.value}
      </div>
      <div className="flex items-center justify-center relative px-1">
        {formation.cards.map((card, i) => (
          <div
            key={card.id}
            style={{ zIndex: i + 1 }}
            className={`${i > 0 ? '-ml-3.5 sm:-ml-4 md:-ml-5' : ''} hover:-translate-y-1.5 transition-transform shadow-lg`}
          >
            <CardView card={card} />
          </div>
        ))}
      </div>
    </div>
  );
}
