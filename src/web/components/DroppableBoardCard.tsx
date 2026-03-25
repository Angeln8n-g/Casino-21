import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { CardView } from './CardView';
import { Card } from '../../domain/card';

interface DroppableBoardCardProps {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
}

export function DroppableBoardCard({ card, selected, onClick }: DroppableBoardCardProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `board-card-${card.id}`,
    data: {
      type: 'boardCard',
      card,
    },
  });

  return (
    <CardView
      ref={setNodeRef}
      card={card}
      selected={selected}
      onClick={onClick}
      className={isOver ? 'ring-4 ring-green-400 scale-110 shadow-[0_0_20px_rgba(74,222,128,0.8)]' : ''}
    />
  );
}
