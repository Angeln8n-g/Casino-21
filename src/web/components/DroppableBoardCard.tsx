import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { CardView } from './CardView';
import { Card } from '../../domain/card';
import { CardTheme, ThemeFontKey } from '../themes/themeRegistry';

interface DroppableBoardCardProps {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  theme?: CardTheme;
  fontKey?: ThemeFontKey;
}

export function DroppableBoardCard({ card, selected, onClick, theme, fontKey }: DroppableBoardCardProps) {
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
      theme={theme}
      fontKey={fontKey}
      className={isOver ? 'ring-4 ring-green-400 scale-110 shadow-[0_0_20px_rgba(74,222,128,0.8)]' : ''}
    />
  );
}
