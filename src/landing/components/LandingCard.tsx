import React, { memo } from 'react';
import { TacticalCard3D } from '../../web/components/card/TacticalCard3D';
import { CardSuit } from '../../web/components/card/TacticalSuitIcon';

export type Suit = CardSuit;

interface Props {
  value: string;
  suit: Suit;
  annotation?: string;
  isKey?: boolean;
  isFaceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  customStyle?: {
    cardBg?: string;
    cardBorder?: string;
    redSuitColor?: string;
    blackSuitColor?: string;
  };
  className?: string;
}

function LandingCard({
  value,
  suit,
  annotation,
  isKey = false,
  isFaceDown = false,
  size = 'md',
  customStyle,
  className = '',
}: Props) {
  return (
    <TacticalCard3D
      rank={value}
      suit={suit}
      annotation={annotation}
      isKey={isKey}
      isFaceDown={isFaceDown}
      size={size}
      customStyle={customStyle}
      className={className}
    />
  );
}

export default memo(LandingCard);
