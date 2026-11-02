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
  }
> = {
  xs: { width: 44, height: 66, fontSize: 10, suitSize: 9, centerSuitSize: 18, auraSize: 26 },
  sm: { width: 56, height: 84, fontSize: 11, suitSize: 11, centerSuitSize: 24, auraSize: 34 },
  responsive: { width: 66, height: 98, fontSize: 13, suitSize: 12, centerSuitSize: 30, auraSize: 44 },
  md: { width: 76, height: 112, fontSize: 14, suitSize: 13, centerSuitSize: 34, auraSize: 50 },
  lg: { width: 92, height: 136, fontSize: 16, suitSize: 15, centerSuitSize: 42, auraSize: 60 },
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
      (theme?.background?.includes('#ffffff') ||
        theme?.background?.includes('255,255,255') ||
        theme?.background?.includes('#fdf8ee') ||
        theme?.background === '#ffffff'));

  // Paleta adaptativa
  const gradientColors: [string, string, ...string[]] = isLightTheme
    ? ['#ffffff', '#f8fafc', '#e2e8f0']
    : ['#172033', '#0d1322', '#060a12'];

  const defaultSuitColor = isLightTheme
    ? isRed
      ? '#dc2626'
      : '#111827'
    : isRed
    ? '#ff3366'
    : '#e2e8f0';

  const suitColor = isRed
    ? theme?.redSuitColor || defaultSuitColor
    : theme?.blackSuitColor || defaultSuitColor;

  const innerEdgeColor = selected
    ? '#fbbf24'
    : isKey
    ? '#38bdf8'
    : isLightTheme
    ? 'rgba(148, 163, 184, 0.5)'
    : theme?.innerEdge || 'rgba(56, 189, 248, 0.35)';

  const auraColor = isRed
    ? isLightTheme
      ? 'rgba(239, 68, 68, 0.22)'
      : 'rgba(244, 63, 94, 0.38)'
    : isLightTheme
    ? 'rgba(56, 189, 248, 0.22)'
    : 'rgba(56, 189, 248, 0.38)';

  const reticleColor = isLightTheme ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)';
  const radarRingColor = isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)';

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
          colors={['#172554', '#090d16', '#030712']}
          style={{ flex: 1, padding: 3, justifyContent: 'center', alignItems: 'center' }}
        >
          {/* Marco Interno con Anillos de Energía */}
          <View
            style={{
              flex: 1,
              width: '100%',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'rgba(251, 191, 36, 0.3)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Corner Tech Accents */}
            <View style={{ position: 'absolute', top: 3, left: 3, width: 4, height: 4, borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#fbbf24' }} />
            <View style={{ position: 'absolute', top: 3, right: 3, width: 4, height: 4, borderTopWidth: 1, borderRightWidth: 1, borderColor: '#fbbf24' }} />
            <View style={{ position: 'absolute', bottom: 3, left: 3, width: 4, height: 4, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: '#fbbf24' }} />
            <View style={{ position: 'absolute', bottom: 3, right: 3, width: 4, height: 4, borderBottomWidth: 1, borderRightWidth: 1, borderColor: '#fbbf24' }} />

            {/* Anillos concéntricos y emblema 21 */}
            <View
              style={{
                width: dimensions.width * 0.55,
                height: dimensions.width * 0.55,
                borderRadius: (dimensions.width * 0.55) / 2,
                borderWidth: 1,
                borderColor: 'rgba(251, 191, 36, 0.35)',
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
                  borderColor: 'rgba(251, 191, 36, 0.45)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#fbbf24',
                    fontFamily: 'RussoOne_400Regular',
                    fontSize: dimensions.fontSize + 3,
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
          borderWidth: selected ? 2.5 : isKey ? 2 : 1.5,
          borderColor: innerEdgeColor,
          transform: [{ translateY: selected ? -8 : 0 }, { scale: selected ? 1.05 : 1 }],
          shadowColor: selected ? '#fbbf24' : isLightTheme ? '#0f172a' : '#000',
          shadowOffset: { width: 0, height: selected ? 6 : 3 },
          shadowOpacity: selected ? 0.75 : isLightTheme ? 0.25 : 0.55,
          shadowRadius: selected ? 8 : 4,
          elevation: selected ? 8 : 4,
          opacity: disabled ? 0.45 : 1,
          overflow: 'visible',
        },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={{
          flex: 1,
          borderRadius: 12,
          padding: 3,
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {/* Recessed Inner Tactical Border con esquinas biseladas */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 2.5,
            left: 2.5,
            right: 2.5,
            bottom: 2.5,
            borderRadius: 9,
            borderWidth: 1,
            borderColor: innerEdgeColor,
            opacity: 0.7,
          }}
        >
          {/* Tech Corner Crosshairs (Brackets de mira táctica) */}
          <View style={{ position: 'absolute', top: 1.5, left: 1.5, width: 3, height: 3, borderTopWidth: 1, borderLeftWidth: 1, borderColor: reticleColor }} />
          <View style={{ position: 'absolute', top: 1.5, right: 1.5, width: 3, height: 3, borderTopWidth: 1, borderRightWidth: 1, borderColor: reticleColor }} />
          <View style={{ position: 'absolute', bottom: 1.5, left: 1.5, width: 3, height: 3, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: reticleColor }} />
          <View style={{ position: 'absolute', bottom: 1.5, right: 1.5, width: 3, height: 3, borderBottomWidth: 1, borderRightWidth: 1, borderColor: reticleColor }} />
        </View>

        {/* ── Esquina Superior Izquierda (Rank + Palo) ── */}
        <View pointerEvents="none" style={{ alignItems: 'flex-start', paddingLeft: 2, paddingTop: 1 }}>
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
          <View style={{ marginTop: 1 }}>
            <TacticalSuitIcon suit={suit} size={dimensions.suitSize} color={suitColor} faceted={false} />
          </View>
        </View>

        {/* ── Centro: Aura + Anillos de Radar + Escudo 3D Facetado ── */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Aura Lumínica Suave de Fondo */}
          <View
            style={{
              position: 'absolute',
              width: dimensions.auraSize,
              height: dimensions.auraSize,
              borderRadius: dimensions.auraSize / 2,
              backgroundColor: auraColor,
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
                width: dimensions.auraSize * 0.65,
                height: dimensions.auraSize * 0.65,
                borderRadius: (dimensions.auraSize * 0.65) / 2,
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
                top: dimensions.height * 0.22,
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
                bottom: dimensions.height * 0.2,
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
                bottom: dimensions.height * 0.2,
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

        {/* ── Esquina Inferior Derecha (Rotada 180deg) ── */}
        <View
          pointerEvents="none"
          style={{
            alignItems: 'flex-end',
            paddingRight: 2,
            paddingBottom: 1,
            transform: [{ rotate: '180deg' }],
          }}
        >
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
          <View style={{ marginTop: 1 }}>
            <TacticalSuitIcon suit={suit} size={dimensions.suitSize} color={suitColor} faceted={false} />
          </View>
        </View>

        {/* Anotación táctica opcional */}
        {annotation && (
          <View
            style={{
              position: 'absolute',
              bottom: -9,
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
      </LinearGradient>
    </Pressable>
  );
};
