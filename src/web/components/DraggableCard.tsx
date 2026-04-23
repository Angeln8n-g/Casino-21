import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CardView } from './CardView';
import { Card } from '../../domain/card';
import { CardTheme } from '../themes/themeRegistry';

interface DraggableCardProps {
  card: Card;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
  /** Card theme from the local player's equipped_theme */
  theme?: CardTheme;
}

export function DraggableCard({ card, disabled, selected, onClick, theme }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hand-card-${card.id}`,
    data: {
      type: 'handCard',
      card,
    },
    disabled,
  });

  const style: React.CSSProperties | undefined = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.3 : 1, 
    touchAction: 'none', // Critical for preventing scroll while dragging on touch devices
  } : { touchAction: 'none' };

  return (
    <CardView
      ref={setNodeRef}
      card={card}
      disabled={disabled}
      selected={selected}
      onClick={onClick}
      style={style}
      theme={theme}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-50' : ''}
    />
  );
}
