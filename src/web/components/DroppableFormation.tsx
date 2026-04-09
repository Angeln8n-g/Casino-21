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
        p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer shadow-xl backdrop-blur-sm relative
        ${selected ? 'border-yellow-400 bg-white/20 scale-105' : 'border-yellow-500/30 bg-black/20 hover:border-yellow-400/50 hover:bg-black/30'}
        ${isOver ? 'ring-4 ring-green-400 scale-110 shadow-[0_0_20px_rgba(74,222,128,0.8)]' : ''}
      `}
      onClick={onClick}
    >
      {formation.isGroup && (
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-orange-700 text-white text-[10px] md:text-xs px-2 py-0.5 rounded-full z-10 font-black shadow-xl transform rotate-12 border border-orange-300">
          GRUPO
        </div>
      )}
      <div className="text-sm font-bold text-yellow-400 mb-3 text-center drop-shadow">
        Valor: {formation.value}
      </div>
      <div className="flex gap-2 relative">
        {formation.cards.map((card, i) => (
          <div key={card.id} style={{ marginLeft: i > 0 ? '-2.5rem' : '0' }} className="hover:-translate-y-2 transition-transform shadow-lg">
            <CardView card={card} />
          </div>
        ))}
      </div>
    </div>
  );
}
