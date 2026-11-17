import React, { memo } from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TacticalSuitIcon, CardSuit, parseColorToRgb, toRgbCss } from './TacticalSuitIcon';
import { CardTheme, getThemeFont, ThemeFontKey } from '../../themes/themeRegistry';

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
  xs: { width: 46, height: 68, fontSize: 10, suitSize: 9, centerSuitSize: 20, auraSize: 26, cornerOffset: 3.5 },
  sm: { width: 58, height: 86, fontSize: 11, suitSize: 10.5, centerSuitSize: 26, auraSize: 34, cornerOffset: 4.5 },
  responsive: { width: 68, height: 100, fontSize: 13, suitSize: 11.5, centerSuitSize: 32, auraSize: 42, cornerOffset: 5.5 },
  md: { width: 78, height: 114, fontSize: 14, suitSize: 13, centerSuitSize: 38, auraSize: 48, cornerOffset: 6 },
  lg: { width: 92, height: 136, fontSize: 16, suitSize: 15, centerSuitSize: 46, auraSize: 58, cornerOffset: 7 },
};

const gradientColorCache = new Map<string, [string, string, ...string[]]>();

/**
 * Extracts linear gradient color stops from multi-layer CSS background strings.
 * Prioritizes the base `linear-gradient(...)` layer when `radial-gradient(...)` overlays appear first.
 */
export function extractGradientColors(
  bg: string | undefined | null,
  fallback: [string, string, ...string[]]
): [string, string, ...string[]] {
  if (!bg) return fallback;
  const cached = gradientColorCache.get(bg);
  if (cached) return cached;

  const linearMatches = bg.match(/linear-gradient\(([^)]*(?:\([^)]*\)[^)]*)*)\)/gi);
  const source = linearMatches && linearMatches.length > 0 ? linearMatches[linearMatches.length - 1] : bg;

  const matches = source.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g);
  let res: [string, string, ...string[]] = fallback;
  if (matches && matches.length >= 2) {
    res = [matches[0], matches[1], ...matches.slice(2)];
  } else if (matches && matches.length === 1) {
    res = [matches[0], matches[0]];
  }
  gradientColorCache.set(bg, res);
  return res;
}

function isLightCardSurface(cardBg?: string): boolean {
  if (!cardBg) return true;
  if (
    cardBg.includes('#ffffff') ||
    cardBg.includes('255,255,255') ||
    cardBg.includes('#fdf8ee') ||
    cardBg.includes('#f8fafc') ||
    cardBg.includes('#fdfcf9') ||
    cardBg.includes('#f1f5f9') ||
    cardBg.includes('#fafafa') ||
    cardBg.includes('#f2f2f7') ||
    cardBg.includes('#f8f0ff')
  ) {
    return true;
  }

  const hexMatches = cardBg.match(/#[0-9a-fA-F]{3,8}/g);
  if (hexMatches && hexMatches.length > 0) {
    let lumSum = 0;
    let count = 0;
    for (const hex of hexMatches) {
      const rgb = parseColorToRgb(hex);
      if (!rgb) continue;
      lumSum += (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      count += 1;
    }
    if (count > 0) {
      return lumSum / count > 0.48;
    }
  }

  return false;
}

function parseBorderStyle(borderStr?: string): { borderWidth: number; borderColor: string } | null {
  if (!borderStr) return null;
  const colorMatch = borderStr.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/);
  if (!colorMatch) return null;
  const widthMatch = borderStr.match(/([\d.]+)px/);
  const parsedWidth = widthMatch ? Number(widthMatch[1]) : 1.5;
  return {
    borderWidth: Math.max(1, Math.min(2.5, Number.isFinite(parsedWidth) ? parsedWidth : 1.5)),
    borderColor: colorMatch[0],
  };
}

function extractRadialTints(bg?: string): [string | null, string | null] {
  if (!bg || !bg.includes('radial-gradient')) return [null, null];
  const radialMatches = bg.match(/radial-gradient\(([^)]*(?:\([^)]*\)[^)]*)*)\)/gi);
  if (!radialMatches || radialMatches.length === 0) return [null, null];

  const tints: string[] = [];
  for (const r of radialMatches) {
    const colorMatch = r.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
    if (!colorMatch) continue;
    const rgb = parseColorToRgb(colorMatch[0]);
    if (!rgb) continue;
    // Skip pure dark/black shades; keep luminous color tints
    if (rgb.r + rgb.g + rgb.b > 60) {
      tints.push(toRgbCss(rgb, 0.14));
    }
  }
  return [tints[0] ?? null, tints[1] ?? null];
}

function extractGlowHaloRgb(boxShadow?: string, extraClass?: string): { r: number; g: number; b: number } | null {
  if (boxShadow) {
    // Split shadow layers while keeping commas inside rgb()/rgba() intact, and ignore inset highlights
    const parts = boxShadow.split(/,(?![^(]*\))/);
    for (const part of parts) {
      if (part.includes('inset')) continue;
      const colorMatch = part.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
      if (!colorMatch) continue;
      const rgb = parseColorToRgb(colorMatch[0]);
      if (!rgb) continue;
      // Skip dark drop shadows and pure white highlights; pick the first luminous accent glow
      const sum = rgb.r + rgb.g + rgb.b;
      if (sum > 90 && !(rgb.r > 235 && rgb.g > 235 && rgb.b > 235)) {
        return rgb;
      }
    }
  }
  if (extraClass?.includes('border-cyber') || extraClass?.includes('neon-box-gold')) {
    return { r: 251, g: 191, b: 36 };
  }
  return null;
}

export const TacticalCard3D = memo(function TacticalCard3D({
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
}: TacticalCard3DProps) {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const effectiveFontKey = fontKey || theme?.fontKey || 'cinzel';
  const fontOption = getThemeFont(effectiveFontKey);
  const dimensions = SIZES[size] || SIZES.responsive;

  const isLightTheme =
    variant === 'light' ||
    (variant === 'auto' && isLightCardSurface(theme?.background));

  const lightFallback: [string, string, ...string[]] = isRed
    ? ['#ffffff', '#fff1f2', '#f1f5f9']
    : ['#ffffff', '#f8fafc', '#f1f5f9'];

  const darkFallback: [string, string, ...string[]] = ['#18181f', '#0d1018', '#05060a'];

  const gradientColors: [string, string, ...string[]] =
    variant === 'light'
      ? lightFallback
      : variant === 'dark'
      ? darkFallback
      : extractGradientColors(theme?.background, isLightTheme ? lightFallback : darkFallback);

  const defaultSuitColor = isLightTheme
    ? isRed
      ? '#dc2626'
      : '#0f172a'
    : isRed
    ? '#fb7185'
    : '#f5d061';

  const suitColor =
    variant === 'light'
      ? defaultSuitColor
      : variant === 'dark'
      ? isRed
        ? '#fb7185'
        : '#f5d061'
      : isRed
      ? theme?.redSuitColor || defaultSuitColor
      : theme?.blackSuitColor || defaultSuitColor;

  const parsedThemeBorder = variant === 'auto' ? parseBorderStyle(theme?.border) : null;
  const hasGoldCyberExtra = Boolean(theme?.extraClass?.includes('border-cyber'));

  const outerBorderWidth = isHovered
    ? 2.5
    : selected
    ? 2.5
    : isKey
    ? 2
    : parsedThemeBorder?.borderWidth ?? 1.5;

  const outerBorderColor = isHovered
    ? '#4ade80'
    : selected
    ? '#fbbf24'
    : isKey
    ? '#fbbf24'
    : parsedThemeBorder?.borderColor ||
      (hasGoldCyberExtra
        ? 'rgba(251, 191, 36, 0.72)'
        : isLightTheme
        ? 'rgba(15, 23, 42, 0.16)'
        : 'rgba(212, 175, 55, 0.35)');

  const innerEdgeColor = isHovered
    ? 'rgba(74, 222, 128, 0.7)'
    : selected
    ? 'rgba(251, 191, 36, 0.72)'
    : isKey
    ? 'rgba(251, 191, 36, 0.6)'
    : theme?.innerEdge || (isLightTheme ? 'rgba(148, 163, 184, 0.5)' : 'rgba(212, 175, 55, 0.45)');

  const suitRgb = parseColorToRgb(suitColor) ?? { r: 212, g: 175, b: 55 };
  const auraOuter = toRgbCss(suitRgb, isLightTheme ? 0.03 : 0.05);
  const auraMid = toRgbCss(suitRgb, isLightTheme ? 0.05 : 0.1);
  const auraInner = toRgbCss(suitRgb, isLightTheme ? 0.08 : 0.15);

  const [radialTintTopLeft, radialTintBottomRight] =
    variant === 'auto' ? extractRadialTints(theme?.background) : [null, null];

  const activeGlowRgb = isHovered
    ? { r: 74, g: 222, b: 128 }
    : selected || isKey
    ? { r: 251, g: 191, b: 36 }
    : variant === 'auto'
    ? extractGlowHaloRgb(theme?.boxShadow, theme?.extraClass)
    : null;

  const isLaBuena = rank === '10' && suit === 'diamonds';
  const isLaChica = rank === '2' && suit === 'spades';
  const isAce = rank === 'A';
  const isCourtCard = rank === 'K' || rank === 'Q' || rank === 'J';

  const handlePress = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const CardContainer = onClick ? Pressable : View;

  // ─── Dorso 3D Casino (Face Down) ───
  if (isFaceDown) {
    return (
      <CardContainer
        {...(onClick ? { disabled, onPress: handlePress } : {})}
        style={[
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: 14,
            overflow: 'visible',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.65,
            shadowRadius: 7,
            elevation: 6,
          },
          style,
        ]}
      >
        {/* Physical 3D cardstock bottom thickness edge */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 2.5,
            left: 0.5,
            right: 0.5,
            bottom: -2.5,
            borderRadius: 14,
            backgroundColor: '#1c1208',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(251, 191, 36, 0.35)',
          }}
        />

        <View
          style={{
            flex: 1,
            borderRadius: 14,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: 'rgba(251, 191, 36, 0.55)',
          }}
        >
          <LinearGradient
            colors={['#141726', '#090c14', '#040509']}
            style={{
              flex: 1,
              padding: 3.5,
              justifyContent: 'center',
              alignItems: 'center',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            {/* Studio specular gloss */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.02)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.78, y: 0.78 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <View
              style={{
                flex: 1,
                width: '100%',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: 'rgba(251, 191, 36, 0.38)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 2.5,
                  left: 2.5,
                  right: 2.5,
                  bottom: 2.5,
                  borderRadius: 7,
                  borderWidth: 0.75,
                  borderColor: 'rgba(251, 191, 36, 0.2)',
                }}
              />
              <View style={{ position: 'absolute', top: 3, left: 3, width: 4, height: 4, borderTopWidth: 1, borderLeftWidth: 1, borderColor: 'rgba(251, 191, 36, 0.7)' }} />
              <View style={{ position: 'absolute', top: 3, right: 3, width: 4, height: 4, borderTopWidth: 1, borderRightWidth: 1, borderColor: 'rgba(251, 191, 36, 0.7)' }} />
              <View style={{ position: 'absolute', bottom: 3, left: 3, width: 4, height: 4, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: 'rgba(251, 191, 36, 0.7)' }} />
              <View style={{ position: 'absolute', bottom: 3, right: 3, width: 4, height: 4, borderBottomWidth: 1, borderRightWidth: 1, borderColor: 'rgba(251, 191, 36, 0.7)' }} />

              <View
                style={{
                  width: dimensions.width * 0.56,
                  height: dimensions.width * 0.56,
                  borderRadius: (dimensions.width * 0.56) / 2,
                  borderWidth: 1,
                  borderColor: 'rgba(251, 191, 36, 0.35)',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
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
                      color: '#fcd34d',
                      fontFamily: 'Cinzel_700Bold',
                      fontSize: dimensions.fontSize + 2,
                      textShadowColor: 'rgba(0, 0, 0, 0.8)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 3,
                    }}
                  >
                    21
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </CardContainer>
    );
  }

  // ─── Cara Frontal 3D (Realistic Face Up Slab) ───
  return (
    <CardContainer
      {...(onClick ? { disabled, onPress: handlePress } : {})}
      style={[
        {
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: 14,
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
          shadowOffset: { width: 0, height: selected || isHovered ? 7 : 4 },
          shadowOpacity: selected || isHovered ? 0.82 : isLightTheme ? 0.32 : 0.68,
          shadowRadius: selected || isHovered ? 9 : 5,
          elevation: selected || isHovered ? 10 : 5,
          opacity: disabled ? 0.45 : 1,
          overflow: 'visible',
        },
        style,
      ]}
    >
      {/* Outer Luminous Theme Glow Halo (Android & iOS) */}
      {activeGlowRgb && (
        <>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -3.5,
              left: -3.5,
              right: -3.5,
              bottom: -3.5,
              borderRadius: 17.5,
              borderWidth: 2.5,
              borderColor: toRgbCss(activeGlowRgb, selected || isHovered ? 0.34 : 0.18),
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -1.5,
              left: -1.5,
              right: -1.5,
              bottom: -1.5,
              borderRadius: 15.5,
              borderWidth: 1.5,
              borderColor: toRgbCss(activeGlowRgb, selected || isHovered ? 0.55 : 0.32),
            }}
          />
        </>
      )}

      {/* Physical 3D Cardstock / Metallic Edge Extrusion */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 2.5,
          left: 0.5,
          right: 0.5,
          bottom: -2.5,
          borderRadius: 14,
          backgroundColor: isLightTheme ? '#94a3b8' : '#09090b',
          borderBottomWidth: !isLightTheme ? 1 : 0,
          borderBottomColor: innerEdgeColor,
        }}
      />

      {/* Outer Beveled Card Shell */}
      <View
        style={{
          flex: 1,
          borderRadius: 14,
          borderWidth: outerBorderWidth,
          borderColor: outerBorderColor,
          overflow: 'hidden',
        }}
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
            borderTopWidth: 1,
            borderTopColor: isLightTheme ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.22)',
            borderBottomWidth: 1,
            borderBottomColor: isLightTheme ? 'rgba(15, 23, 42, 0.12)' : 'rgba(0, 0, 0, 0.55)',
          }}
        >
          {/* Theme Radial Accent Washes (e.g. Obsidian Gold warm amber & rose edge sheen) */}
          {radialTintTopLeft && (
            <LinearGradient
              pointerEvents="none"
              colors={[radialTintTopLeft, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.65, y: 0.65 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          )}
          {radialTintBottomRight && (
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', radialTintBottomRight]}
              start={{ x: 0.35, y: 0.35 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          )}

          {/* Studio Specular Reflection + Satin Diagonal Varnish Band */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              isLightTheme ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.14)',
              isLightTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.06)',
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.85, y: 0.82 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Subtle Bottom Studio Depth Vignette */}
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', isLightTheme ? 'rgba(15, 23, 42, 0.06)' : 'rgba(0, 0, 0, 0.28)']}
            start={{ x: 0.5, y: 0.45 }}
            end={{ x: 0.5, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Recessed Double Luxury Casino Frame */}
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
            {size !== 'xs' && (
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  left: 2,
                  right: 2,
                  bottom: 2,
                  borderRadius: 7,
                  borderWidth: 0.75,
                  borderColor: innerEdgeColor,
                  opacity: isLightTheme ? 0.25 : 0.34,
                }}
              />
            )}

            {/* Theme-matched corner flourishes */}
            <View
              style={{
                position: 'absolute',
                top: 1.5,
                left: 1.5,
                width: 4,
                height: 4,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderColor: innerEdgeColor,
                opacity: isLightTheme ? 0.55 : 0.8,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: 1.5,
                right: 1.5,
                width: 4,
                height: 4,
                borderTopWidth: 1,
                borderRightWidth: 1,
                borderColor: innerEdgeColor,
                opacity: isLightTheme ? 0.55 : 0.8,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 1.5,
                left: 1.5,
                width: 4,
                height: 4,
                borderBottomWidth: 1,
                borderLeftWidth: 1,
                borderColor: innerEdgeColor,
                opacity: isLightTheme ? 0.55 : 0.8,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 1.5,
                right: 1.5,
                width: 4,
                height: 4,
                borderBottomWidth: 1,
                borderRightWidth: 1,
                borderColor: innerEdgeColor,
                opacity: isLightTheme ? 0.55 : 0.8,
              }}
            />
          </View>

          {/* ── TOP-LEFT CORNER (Embossed Rank + Beveled Suit) ── */}
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
                fontFamily: fontOption.fontFamily,
                lineHeight: dimensions.fontSize + 2,
                textShadowColor: isLightTheme ? 'rgba(0, 0, 0, 0.16)' : 'rgba(0, 0, 0, 0.85)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: isLightTheme ? 1 : 2.5,
              }}
            >
              {rank}
            </Text>
            <View style={{ marginTop: 0.5 }}>
              <TacticalSuitIcon suit={suit} size={dimensions.suitSize} color={suitColor} faceted={false} />
            </View>
          </View>

          {/* ── CENTER SCULPTED 3D MEDALLION & EMBLEM ── */}
          <View
            pointerEvents="none"
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 5,
            }}
          >
            {/* Suit-matched radial soft aura */}
            <View
              style={{
                position: 'absolute',
                width: dimensions.auraSize * 1.35,
                height: dimensions.auraSize * 1.35,
                borderRadius: (dimensions.auraSize * 1.35) / 2,
                backgroundColor: auraOuter,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: dimensions.auraSize * 1.0,
                height: dimensions.auraSize * 1.0,
                borderRadius: (dimensions.auraSize * 1.0) / 2,
                backgroundColor: auraMid,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: dimensions.auraSize * 0.68,
                height: dimensions.auraSize * 0.68,
                borderRadius: (dimensions.auraSize * 0.68) / 2,
                backgroundColor: auraInner,
              }}
            />

            {/* Subtle Engraved Medallion Crest */}
            <View
              style={{
                position: 'absolute',
                width: dimensions.auraSize,
                height: dimensions.auraSize,
                borderRadius: dimensions.auraSize / 2,
                borderWidth: 0.85,
                borderColor: innerEdgeColor,
                opacity: isLightTheme ? 0.14 : 0.18,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: dimensions.auraSize * 0.62,
                  height: dimensions.auraSize * 0.62,
                  borderRadius: isCourtCard || isAce ? 4 : (dimensions.auraSize * 0.62) / 2,
                  borderWidth: 0.75,
                  borderStyle: isCourtCard || isAce ? 'solid' : 'dashed',
                  borderColor: innerEdgeColor,
                  opacity: isCourtCard || isAce ? 0.55 : 0.45,
                  transform: isCourtCard || isAce ? [{ rotate: '45deg' }] : undefined,
                }}
              />
            </View>

            {/* Ace Crest Label */}
            {isAce && (
              <Text
                style={{
                  position: 'absolute',
                  top: -dimensions.centerSuitSize * 0.56,
                  color: suitColor,
                  fontSize: 8,
                  fontFamily: 'Cinzel_700Bold',
                  letterSpacing: 1,
                  opacity: 0.92,
                  textShadowColor: isLightTheme ? 'rgba(0, 0, 0, 0.16)' : 'rgba(0, 0, 0, 0.85)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                AS
              </Text>
            )}

            {/* Main 3D Sculpted Suit Emblem */}
            <TacticalSuitIcon suit={suit} size={dimensions.centerSuitSize} color={suitColor} faceted />

            {/* High-Impact Tactical Markers */}
            {isLaBuena && (
              <View
                style={{
                  position: 'absolute',
                  bottom: -dimensions.centerSuitSize * 0.5,
                  backgroundColor: '#f59e0b',
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: '#020617', fontSize: 7, fontFamily: 'ChakraPetch_700Bold' }}>
                  +2 PTS
                </Text>
              </View>
            )}

            {isLaChica && (
              <View
                style={{
                  position: 'absolute',
                  bottom: -dimensions.centerSuitSize * 0.5,
                  backgroundColor: '#38bdf8',
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: '#020617', fontSize: 7, fontFamily: 'ChakraPetch_700Bold' }}>
                  +1 PT
                </Text>
              </View>
            )}
          </View>

          {/* ── BOTTOM-RIGHT CORNER (Rotated 180deg) ── */}
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
                fontFamily: fontOption.fontFamily,
                lineHeight: dimensions.fontSize + 2,
                textShadowColor: isLightTheme ? 'rgba(0, 0, 0, 0.16)' : 'rgba(0, 0, 0, 0.85)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: isLightTheme ? 1 : 2.5,
              }}
            >
              {rank}
            </Text>
            <View style={{ marginTop: 0.5 }}>
              <TacticalSuitIcon suit={suit} size={dimensions.suitSize} color={suitColor} faceted={false} />
            </View>
          </View>

          {/* Optional Tactical Annotation */}
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
      </View>
    </CardContainer>
  );
});
