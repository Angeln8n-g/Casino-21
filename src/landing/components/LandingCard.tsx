import React, { memo } from 'react';
import { TacticalCard3D } from '../../web/components/card/TacticalCard3D';
import { CardSuit } from '../../web/components/card/TacticalSuitIcon';
import { ThemeFontKey } from '../../web/themes/themeRegistry';

export type Suit = CardSuit;

interface Props {
  value: string;
  suit: Suit;
  annotation?: string;
  isKey?: boolean;
  isFaceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fontKey?: ThemeFontKey;
  customStyle?: {
    cardBg?: string;
    cardBorder?: string;
    redSuitColor?: string;
    blackSuitColor?: string;
    fontKey?: ThemeFontKey;
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
  fontKey,
  customStyle,
  className = '',
}: Props) {
  const mergedStyle = fontKey ? { ...customStyle, fontKey } : customStyle;

  return (
    <TacticalCard3D
      rank={value}
      suit={suit}
      annotation={annotation}
      isKey={isKey}
      isFaceDown={isFaceDown}
      size={size}
      customStyle={mergedStyle}
      className={className}
    />
  );
}

export default memo(LandingCard);
