import React from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { TacticalSuitIcon, CardSuit } from './TacticalSuitIcon';
import { CardTheme, getThemeFont, ThemeFontKey } from '../../themes/themeRegistry';
import { triggerHaptic } from '../../utils/haptics';

export type CardSize = 'responsive' | 'xs' | 'sm' | 'md' | 'lg';

export interface TacticalCard3DProps {
  rank?: string;
  suit?: CardSuit;
  value?: number;
  selected?: boolean;
  disabled?: boolean;
  isKey?: boolean;
  isFaceDown?: boolean;
  annotation?: string;
  size?: CardSize;
  theme?: CardTheme;
  fontKey?: ThemeFontKey;
  onClick?: () => void;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_ESPORTS_THEME: CardTheme = {
  background: '#0d1322',
  innerEdge: 'rgba(56, 189, 248, 0.25)',
  redSuitColor: '#FF3366',
  blackSuitColor: '#E2E8F0',
  fontKey: 'russo',
};

const SIZES: Record<CardSize, { width: number; height: number; fontSize: number; suitSize: number; centerSuitSize: number }> = {
  xs: { width: 44, height: 66, fontSize: 10, suitSize: 10, centerSuitSize: 16 },
  sm: { width: 56, height: 84, fontSize: 11, suitSize: 12, centerSuitSize: 22 },
  responsive: { width: 62, height: 94, fontSize: 12, suitSize: 13, centerSuitSize: 26 },
  md: { width: 72, height: 108, fontSize: 13, suitSize: 14, centerSuitSize: 30 },
  lg: { width: 88, height: 132, fontSize: 15, suitSize: 16, centerSuitSize: 36 },
};

export const TacticalCard3D: React.FC<TacticalCard3DProps> = ({
  rank = 'A',
  suit = 'spades',
  selected = false,
  disabled = false,
  isKey = false,
  isFaceDown = false,
  annotation,
  size = 'responsive',
  theme,
  fontKey,
  onClick,
  style,
}) => {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const activeTheme = theme ?? DEFAULT_ESPORTS_THEME;
  const effectiveFontKey = fontKey || activeTheme.fontKey;
  const fontOption = getThemeFont(effectiveFontKey);

  const suitColor = isRed ? activeTheme.redSuitColor : activeTheme.blackSuitColor;
  const dimensions = SIZES[size] || SIZES.responsive;

  const isLaBuena = rank === '10' && suit === 'diamonds';
  const isLaChica = rank === '2' && suit === 'spades';
  const isAce = rank === 'A';

  const handlePress = () => {
    if (!disabled && onClick) {
      triggerHaptic('card_tap');
      onClick();
    }
  };

  // Dorso 3D Esports
  if (isFaceDown) {
    return (
      <Pressable
        disabled={disabled}
        onPress={handlePress}
        style={[
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: 14,
            backgroundColor: '#070b14',
            borderWidth: 2,
            borderColor: 'rgba(251, 191, 36, 0.4)',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.5,
            shadowRadius: 5,
            elevation: 4,
          },
          style,
        ]}
      >
        <View
          style={{
            width: dimensions.width - 8,
            height: dimensions.height - 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(251, 191, 36, 0.25)',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#090d16',
          }}
        >
          <View
            style={{
              width: dimensions.width * 0.55,
              height: dimensions.width * 0.55,
              borderRadius: (dimensions.width * 0.55) / 2,
              borderWidth: 1,
              borderColor: 'rgba(251, 191, 36, 0.3)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#fbbf24',
                fontFamily: 'RussoOne_400Regular',
                fontSize: dimensions.fontSize + 4,
                fontWeight: 'bold',
              }}
            >
              21
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // Cara frontal 3D
  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      style={[
        {
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: 14,
          backgroundColor: disabled ? '#1e293b' : activeTheme.background,
          borderWidth: selected ? 2.5 : isKey ? 2 : 1.5,
          borderColor: selected
            ? '#fbbf24'
            : isKey
            ? '#38bdf8'
            : activeTheme.innerEdge || '#334155',
          transform: [{ translateY: selected ? -8 : 0 }, { scale: selected ? 1.05 : 1 }],
          shadowColor: selected ? '#fbbf24' : '#000',
          shadowOffset: { width: 0, height: selected ? 6 : 3 },
          shadowOpacity: selected ? 0.7 : 0.4,
          shadowRadius: selected ? 8 : 4,
          elevation: selected ? 8 : 3,
          padding: 3,
          justifyContent: 'space-between',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {/* Esquina superior izquierda */}
      <View style={{ alignItems: 'flex-start', paddingLeft: 2, paddingTop: 1 }}>
        <Text
          style={{
            color: suitColor,
            fontSize: dimensions.fontSize,
            fontWeight: '900',
            fontFamily: fontOption.fontFamily,
            lineHeight: dimensions.fontSize + 2,
          }}
        >
          {rank}
        </Text>
        <TacticalSuitIcon suit={suit} size={dimensions.suitSize} color={suitColor} faceted />
      </View>

      {/* Centro 3D Emblem */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
        {isAce && (
          <Text
            style={{
              color: '#fbbf24',
              fontSize: 8,
              fontWeight: '900',
              fontFamily: 'ChakraPetch_700Bold',
              marginBottom: 1,
              letterSpacing: 1,
            }}
          >
            AS
          </Text>
        )}
        <TacticalSuitIcon suit={suit} size={dimensions.centerSuitSize} color={suitColor} faceted />
        {isLaBuena && (
          <View style={{ backgroundColor: '#f59e0b', paddingHorizontal: 3, paddingVertical: 1, borderRadius: 3, marginTop: 2 }}>
            <Text style={{ color: '#020617', fontSize: 7, fontWeight: '900', fontFamily: 'ChakraPetch_700Bold' }}>+2 PTS</Text>
          </View>
        )}
        {isLaChica && (
          <View style={{ backgroundColor: '#38bdf8', paddingHorizontal: 3, paddingVertical: 1, borderRadius: 3, marginTop: 2 }}>
            <Text style={{ color: '#020617', fontSize: 7, fontWeight: '900', fontFamily: 'ChakraPetch_700Bold' }}>+1 PT</Text>
          </View>
        )}
      </View>

      {/* Esquina inferior derecha (180deg) */}
      <View style={{ alignItems: 'flex-end', paddingRight: 2, paddingBottom: 1, transform: [{ rotate: '180deg' }] }}>
        <Text
          style={{
            color: suitColor,
            fontSize: dimensions.fontSize,
            fontWeight: '900',
            fontFamily: fontOption.fontFamily,
            lineHeight: dimensions.fontSize + 2,
          }}
        >
          {rank}
        </Text>
        <TacticalSuitIcon suit={suit} size={dimensions.suitSize} color={suitColor} faceted />
      </View>

      {/* Annotation */}
      {annotation && (
        <View
          style={{
            position: 'absolute',
            bottom: -10,
            alignSelf: 'center',
            backgroundColor: '#020617',
            borderWidth: 1,
            borderColor: '#fbbf24',
            paddingHorizontal: 4,
            paddingVertical: 1,
            borderRadius: 4,
            zIndex: 99,
          }}
        >
          <Text style={{ color: '#fde68a', fontSize: 8, fontWeight: 'bold' }}>{annotation}</Text>
        </View>
      )}
    </Pressable>
  );
};
