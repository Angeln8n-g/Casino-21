import React, { memo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Card } from 'domain/card';
import { CardTheme, ThemeFontKey } from '../themes/themeRegistry';
import { TacticalCard3D, CardSize } from './card/TacticalCard3D';
import { CardSuit } from './card/TacticalSuitIcon';

export interface CardViewProps {
  card: Card;
  selected?: boolean;
  isHovered?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  theme?: CardTheme;
  fontKey?: ThemeFontKey;
  size?: CardSize;
  variant?: 'light' | 'dark' | 'auto';
  isKey?: boolean;
  annotation?: string;
  isFaceDown?: boolean;
}

export const CardView = memo(function CardView({
  card,
  selected = false,
  isHovered = false,
  onPress,
  disabled = false,
  style,
  theme,
  fontKey,
  size = 'responsive',
  variant = 'auto',
  isKey,
  annotation,
  isFaceDown = false,
}: CardViewProps) {
  const isHidden = isFaceDown || (card as any).suit === 'hidden' || (card as any).rank === '?';

  return (
    <TacticalCard3D
      rank={card.rank}
      suit={card.suit as CardSuit}
      value={card.value}
      selected={selected}
      isHovered={isHovered}
      disabled={disabled}
      onClick={onPress}
      style={style}
      theme={theme}
      fontKey={fontKey}
      size={size}
      variant={variant}
      isKey={isKey}
      annotation={annotation}
      isFaceDown={isHidden}
    />
  );
});
