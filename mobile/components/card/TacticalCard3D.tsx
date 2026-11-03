import React from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TacticalSuitIcon, CardSuit } from './TacticalSuitIcon';
import { CardTheme, getThemeFont, ThemeFontKey } from '../../themes/themeRegistry';
import { triggerHaptic } from '../../utils/haptics';

export type CardSize = 'responsive' | 'xs' | 'sm' | 'md' | 'lg';

export interface TacticalCard3DProps {
  rank?: string;
  suit?: CardSuit;
  value?: number;
  selected?: boolean;
   isHovered?: boolean;
  disabled?: boolean;
  isKey?: boolean;
  isFaceDown?: boolean;
  annotation?: string;
  size?: CardSize;
  variant?: 'light' | 'dark' | 'auto';
  theme?: CardTheme;
  fontKey?: ThemeFontKey;
  onClick?: () => void;
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<
  CardSize,
  {
    width: number;
    height: number;
    fontSize: number;
    suitSize: number;
    centerSuitSize: number;
    auraSize: number;
    cornerOffset: number;
  }
> = {
  xs: { width: 46, height: 68, fontSize: 10, suitSize: 9, centerSuitSize: 18, auraSize: 26, cornerOffset: 3.5 },
  sm: { width: 58, height: 86, fontSize: 11, suitSize: 10, centerSuitSize: 24, auraSize: 34, cornerOffset: 4.5 },
  responsive: { width: 68, height: 100, fontSize: 13, suitSize: 11, centerSuitSize: 28, auraSize: 42, cornerOffset: 5.5 },
  md: { width: 78, height: 114, fontSize: 14, suitSize: 13, centerSuitSize: 34, auraSize: 48, cornerOffset: 6 },
  lg: { width: 92, height: 136, fontSize: 16, suitSize: 15, centerSuitSize: 42, auraSize: 58, cornerOffset: 7 },
};

export function extractGradientColors(
  bg: string | undefined | null,
  fallback: [string, string, ...string[]]
): [string, string, ...string[]] {
  if (!bg) return fallback;
  const matches = bg.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g);
  if (matches && matches.length >= 2) {
    return [matches[0], matches[1], ...matches.slice(2)];
  }
  if (matches && matches.length === 1) {
    return [matches[0], matches[0]];
  }
  return fallback;
}

export const TacticalCard3D: React.FC<TacticalCard3DProps> = ({
  rank = 'A',
  suit = 'spades',
  selected = false,
  isHovered = false,
  disabled = false,
  isKey = false,
  isFaceDown = false,
  annotation,
  size = 'responsive',
  variant = 'auto',
  theme,
  fontKey,
  onClick,
  style,
}) => {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const effectiveFontKey = fontKey || theme?.fontKey || 'russo';
  const fontOption = getThemeFont(effectiveFontKey);
  const dimensions = SIZES[size] || SIZES.responsive;

  // Determinar si es carta clara (estilo clásico de mano) o táctica oscura
  const isLightTheme =
    variant === 'light' ||
    (variant === 'auto' &&
      Boolean(
        theme?.background?.includes('#ffffff') ||
          theme?.background?.includes('255,255,255') ||
          theme?.background?.includes('#fdf8ee') ||
          theme?.background?.includes('#f8fafc') ||
          theme?.background === '#ffffff'
      ));

  const lightFallback: [string, string, ...string[]] = isRed
    ? ['#ffffff', '#fff1f2', '#e2e8f0']
    : ['#ffffff', '#f0f9ff', '#e2e8f0'];

  const darkFallback: [string, string, ...string[]] = ['#131b2e', '#0d1322', '#070b14'];

  const gradientColors: [string, string, ...string[]] =
    variant === 'light'
      ? lightFallback
      : variant === 'dark'
      ? darkFallback
      : extractGradientColors(theme?.background, isLightTheme ? lightFallback : darkFallback);

  const defaultSuitColor = isLightTheme
    ? isRed
      ? '#e11d48'
      : '#1e293b'
    : isRed
    ? '#ff3366'
    : '#e2e8f0';

  const suitColor =
    variant === 'light'
      ? defaultSuitColor
      : variant === 'dark'
      ? isRed
        ? '#ff3366'
        : '#e2e8f0'
      : isRed
      ? theme?.redSuitColor || defaultSuitColor
      : theme?.blackSuitColor || defaultSuitColor;

  const outerBorderColor = isHovered
    ? '#4ade80'
    : selected
    ? '#fbbf24'
    : isKey
    ? '#38bdf8'
    : isLightTheme
    ? '#94a3b8'
    : 'rgba(56, 189, 248, 0.4)';

  const innerEdgeColor = isHovered
    ? 'rgba(74, 222, 128, 0.7)'
    : selected
    ? 'rgba(251, 191, 36, 0.65)'
    : isKey
    ? 'rgba(56, 189, 248, 0.5)'
    : isLightTheme
    ? 'rgba(148, 163, 184, 0.45)'
    : theme?.innerEdge || 'rgba(56, 189, 248, 0.28)';

  const auraBaseRgb = isRed ? '244, 63, 94' : '56, 189, 248';
  const reticleColor = isLightTheme ? 'rgba(15, 23, 42, 0.18)' : 'rgba(255, 255, 255, 0.25)';
  const radarRingColor = isLightTheme ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.12)';

  const isLaBuena = rank === '10' && suit === 'diamonds';
  const isLaChica = rank === '2' && suit === 'spades';
  const isAce = rank === 'A';

  const handlePress = () => {
    if (!disabled && onClick) {
      triggerHaptic('card_tap');
      onClick();
    }
  };

  // ─── Dorso 3D Esports (Face Down) ───
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
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.6,
            shadowRadius: 6,
            elevation: 5,
            borderWidth: 1.5,
            borderColor: 'rgba(251, 191, 36, 0.5)',
          },
          style,
        ]}
      >
        <LinearGradient
          colors={['#0f172a', '#090d16', '#04060a']}
          style={{ flex: 1, padding: 3, justifyContent: 'center', alignItems: 'center' }}
        >
          <View
            style={{
              flex: 1,
              width: '100%',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'rgba(251, 191, 36, 0.25)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ position: 'absolute', top: 3, left: 3, width: 4, height: 4, borderTopWidth: 1, borderLeftWidth: 1, borderColor: 'rgba(251, 191, 36, 0.6)' }} />
            <View style={{ position: 'absolute', top: 3, right: 3, width: 4, height: 4, borderTopWidth: 1, borderRightWidth: 1, borderColor: 'rgba(251, 191, 36, 0.6)' }} />
            <View style={{ position: 'absolute', bottom: 3, left: 3, width: 4, height: 4, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: 'rgba(251, 191, 36, 0.6)' }} />
            <View style={{ position: 'absolute', bottom: 3, right: 3, width: 4, height: 4, borderBottomWidth: 1, borderRightWidth: 1, borderColor: 'rgba(251, 191, 36, 0.6)' }} />

            <View
              style={{
                width: dimensions.width * 0.55,
                height: dimensions.width * 0.55,
                borderRadius: (dimensions.width * 0.55) / 2,
                borderWidth: 1,
                borderColor: 'rgba(251, 191, 36, 0.25)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: dimensions.width * 0.42,
                  height: dimensions.width * 0.42,
                  borderRadius: (dimensions.width * 0.42) / 2,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: 'rgba(251, 191, 36, 0.35)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#fbbf24',
                    fontFamily: 'RussoOne_400Regular',
                    fontSize: dimensions.fontSize + 2,
                    fontWeight: 'bold',
                  }}
                >
                  21
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  // ─── Cara Frontal 3D (Face Up) ───
  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      style={[
        {
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: 14,
          borderWidth: isHovered ? 2.5 : selected ? 2.5 : isKey ? 2 : 1.5,
          borderColor: outerBorderColor,
          transform: [
            { translateY: selected ? -7 : isHovered ? -4 : 0 },
            { scale: isHovered ? 1.08 : selected ? 1.05 : 1 },
          ],
          shadowColor: isHovered
            ? '#4ade80'
            : selected
            ? '#fbbf24'
            : isLightTheme
            ? '#0f172a'
            : '#000',
          shadowOffset: { width: 0, height: selected || isHovered ? 6 : 3 },
          shadowOpacity: selected || isHovered ? 0.8 : isLightTheme ? 0.3 : 0.6,
          shadowRadius: selected || isHovered ? 8 : 4,
          elevation: selected || isHovered ? 9 : 4,
          opacity: disabled ? 0.45 : 1,
          overflow: 'visible',
        },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0.05 }}
        end={{ x: 0.9, y: 0.95 }}
        style={{
          flex: 1,
          borderRadius: 12,
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Recessed Inner Tactical Border con esquinas biseladas */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            right: 3,
            bottom: 3,
            borderRadius: 9,
            borderWidth: 1,
            borderColor: innerEdgeColor,
          }}
        >
          {/* Tech Corner Crosshairs (Brackets de mira táctica) */}
          <View style={{ position: 'absolute', top: 1.5, left: 1.5, width: 3.5, height: 3.5, borderTopWidth: 1, borderLeftWidth: 1, borderColor: reticleColor }} />
          <View style={{ position: 'absolute', top: 1.5, right: 1.5, width: 3.5, height: 3.5, borderTopWidth: 1, borderRightWidth: 1, borderColor: reticleColor }} />
          <View style={{ position: 'absolute', bottom: 1.5, left: 1.5, width: 3.5, height: 3.5, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: reticleColor }} />
          <View style={{ position: 'absolute', bottom: 1.5, right: 1.5, width: 3.5, height: 3.5, borderBottomWidth: 1, borderRightWidth: 1, borderColor: reticleColor }} />
        </View>

        {/* ── TOP-LEFT CORNER (Rank + Suit) ── */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: dimensions.cornerOffset,
            left: dimensions.cornerOffset + 1,
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <Text
            style={{
              color: suitColor,
              fontSize: dimensions.fontSize,
              fontWeight: '900',
              fontFamily: fontOption.fontFamily,
              lineHeight: dimensions.fontSize + 1,
            }}
          >
            {rank}
          </Text>
          <View style={{ marginTop: 0.5 }}>
            <TacticalSuitIcon suit={suit} size={dimensions.suitSize} color={suitColor} faceted={false} />
          </View>
        </View>

        {/* ── CENTER EMBOSSED 3D PIECE (Aura Difuminada + Radar + Palo Facetado) ── */}
        <View
          pointerEvents="none"
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 5,
          }}
        >
          {/* Capas concéntricas para simular blur radial suave */}
          <View
            style={{
              position: 'absolute',
              width: dimensions.auraSize * 1.35,
              height: dimensions.auraSize * 1.35,
              borderRadius: (dimensions.auraSize * 1.35) / 2,
              backgroundColor: `rgba(${auraBaseRgb}, ${isLightTheme ? 0.08 : 0.1})`,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: dimensions.auraSize * 1.0,
              height: dimensions.auraSize * 1.0,
              borderRadius: (dimensions.auraSize * 1.0) / 2,
              backgroundColor: `rgba(${auraBaseRgb}, ${isLightTheme ? 0.14 : 0.18})`,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: dimensions.auraSize * 0.68,
              height: dimensions.auraSize * 0.68,
              borderRadius: (dimensions.auraSize * 0.68) / 2,
              backgroundColor: `rgba(${auraBaseRgb}, ${isLightTheme ? 0.2 : 0.26})`,
            }}
          />

          {/* Anillos de Radar / Energía Táctica */}
          <View
            style={{
              position: 'absolute',
              width: dimensions.auraSize,
              height: dimensions.auraSize,
              borderRadius: dimensions.auraSize / 2,
              borderWidth: 1,
              borderColor: radarRingColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: dimensions.auraSize * 0.64,
                height: dimensions.auraSize * 0.64,
                borderRadius: (dimensions.auraSize * 0.64) / 2,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: radarRingColor,
              }}
            />
          </View>

          {/* Insignia AS */}
          {isAce && (
            <Text
              style={{
                position: 'absolute',
                top: -dimensions.centerSuitSize * 0.65,
                color: '#fbbf24',
                fontSize: 8,
                fontWeight: '900',
                fontFamily: 'ChakraPetch_700Bold',
                letterSpacing: 1,
              }}
            >
              AS
            </Text>
          )}

          {/* Palo 3D Facetado Central */}
          <TacticalSuitIcon suit={suit} size={dimensions.centerSuitSize} color={suitColor} faceted />

          {/* Marcadores Estratégicos K21 (La Buena / La Chica) */}
          {isLaBuena && (
            <View
              style={{
                position: 'absolute',
                bottom: -dimensions.centerSuitSize * 0.55,
                backgroundColor: '#f59e0b',
                paddingHorizontal: 4,
                paddingVertical: 1,
                borderRadius: 4,
              }}
            >
              <Text style={{ color: '#020617', fontSize: 7, fontWeight: '900', fontFamily: 'ChakraPetch_700Bold' }}>
                +2 PTS
              </Text>
            </View>
          )}

          {isLaChica && (
            <View
              style={{
                position: 'absolute',
                bottom: -dimensions.centerSuitSize * 0.55,
                backgroundColor: '#38bdf8',
                paddingHorizontal: 4,
                paddingVertical: 1,
                borderRadius: 4,
              }}
            >
              <Text style={{ color: '#020617', fontSize: 7, fontWeight: '900', fontFamily: 'ChakraPetch_700Bold' }}>
                +1 PT
              </Text>
            </View>
          )}
        </View>

        {/* ── BOTTOM-RIGHT CORNER (Rotada 180deg en su propio eje inferior derecho) ── */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: dimensions.cornerOffset,
            right: dimensions.cornerOffset + 1,
            alignItems: 'center',
            zIndex: 10,
            transform: [{ rotate: '180deg' }],
          }}
        >
          <Text
            style={{
              color: suitColor,
              fontSize: dimensions.fontSize,
              fontWeight: '900',
              fontFamily: fontOption.fontFamily,
              lineHeight: dimensions.fontSize + 1,
            }}
          >
            {rank}
          </Text>
          <View style={{ marginTop: 0.5 }}>
            <TacticalSuitIcon suit={suit} size={dimensions.suitSize} color={suitColor} faceted={false} />
          </View>
        </View>

        {/* Anotación táctica opcional */}
        {annotation && (
          <View
            style={{
              position: 'absolute',
              bottom: 2,
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
            <Text style={{ color: '#fde68a', fontSize: 7, fontWeight: 'bold' }}>{annotation}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
};
