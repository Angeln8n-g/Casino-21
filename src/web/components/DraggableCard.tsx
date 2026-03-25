import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CardView } from './CardView';
import { Card } from '../../domain/card';

interface DraggableCardProps {
  card: Card;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function DraggableCard({ card, disabled, selected, onClick }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hand-card-${card.id}`,
    data: {
      type: 'handCard',
      card,
    },
    disabled,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.3 : 1, 
  } : undefined;

  return (
    <CardView
      ref={setNodeRef}
      card={card}
      disabled={disabled}
      selected={selected}
      onClick={onClick}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-50' : ''}
    />
  );
}
