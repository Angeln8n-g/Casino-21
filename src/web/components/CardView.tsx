import React, { forwardRef } from 'react';
import { Card } from '../../domain/card';
import { CardTheme } from '../themes/themeRegistry';
import { TacticalCard3D, CardSize } from './card/TacticalCard3D';
import { CardSuit } from './card/TacticalSuitIcon';

export interface CardViewProps extends React.HTMLAttributes<HTMLDivElement> {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  theme?: CardTheme;
  size?: CardSize;
  isKey?: boolean;
  annotation?: string;
  isFaceDown?: boolean;
}

export const CardView = forwardRef<HTMLDivElement, CardViewProps>(
  (
    {
      card,
      selected = false,
      onClick,
      disabled = false,
      style,
      className = '',
      theme,
      size = 'responsive',
      isKey,
      annotation,
      isFaceDown = false,
      ...props
    },
    ref
  ) => {
    return (
      <TacticalCard3D
        ref={ref}
        rank={card.rank}
        suit={card.suit as CardSuit}
        value={card.value}
        selected={selected}
        disabled={disabled}
        onClick={onClick}
        style={style}
        className={className}
        theme={theme}
        size={size}
        isKey={isKey}
        annotation={annotation}
        isFaceDown={isFaceDown}
        {...props}
      />
    );
  }
);

CardView.displayName = 'CardView';
