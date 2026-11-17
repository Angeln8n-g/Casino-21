import React, { memo } from 'react';
import Svg, { G, Path, Line, Circle, Ellipse } from 'react-native-svg';

export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

interface TacticalSuitIconProps {
  suit: CardSuit;
  size?: number;
  faceted?: boolean;
  color?: string;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface SuitPalette3D {
  highlight: string;
  litMid: string;
  base: string;
  shadow: string;
  deepShadow: string;
  rimStroke: string;
  ridgeStroke: string;
  isDark: boolean;
}

const DEFAULT_SUIT_COLORS: Record<CardSuit, string> = {
  spades: '#CBD5E1',
  clubs: '#CBD5E1',
  hearts: '#E11D48',
  diamonds: '#E11D48',
};

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function toHexColor(c: RgbColor): string {
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}

export function toRgbCss(c: RgbColor, alpha?: number): string {
  const r = clampByte(c.r);
  const g = clampByte(c.g);
  const b = clampByte(c.b);
  return alpha === undefined ? toHexColor(c) : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixRgb(a: RgbColor, b: RgbColor, t: number): RgbColor {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function scaleRgb(c: RgbColor, factor: number): RgbColor {
  return {
    r: c.r * factor,
    g: c.g * factor,
    b: c.b * factor,
  };
}

export function parseColorToRgb(input: string): RgbColor | null {
  const trimmed = input.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }
  const rgbMatch = trimmed.match(/^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)/i);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }
  return null;
}

/**
 * Computes a 5-stop sculptural 3D palette in pure #RRGGBB HEX strings
 * so every native & web SVG renderer draws vivid metallic/gemstone volume.
 */
function deriveSuitPalette(color: string | undefined, suit: CardSuit): SuitPalette3D {
  const effectiveColor = color || DEFAULT_SUIT_COLORS[suit];
  const parsed = parseColorToRgb(effectiveColor) ?? parseColorToRgb(DEFAULT_SUIT_COLORS[suit])!;
  const luminance = (0.299 * parsed.r + 0.587 * parsed.g + 0.114 * parsed.b) / 255;

  if (luminance < 0.17) {
    const slateHighlight: RgbColor = { r: 156, g: 170, b: 192 };
    const slateMid: RgbColor = { r: 78, g: 91, b: 112 };
    return {
      highlight: toHexColor(mixRgb(parsed, slateHighlight, 0.58)),
      litMid: toHexColor(mixRgb(parsed, slateMid, 0.45)),
      base: toHexColor(parsed),
      shadow: toHexColor(scaleRgb(parsed, 0.55)),
      deepShadow: toHexColor(scaleRgb(parsed, 0.28)),
      rimStroke: toHexColor(mixRgb(parsed, slateHighlight, 0.45)),
      ridgeStroke: '#e2e8f0',
      isDark: true,
    };
  }

  const isWarm = parsed.r >= parsed.b;
  const whiteTarget: RgbColor = isWarm ? { r: 255, g: 250, b: 228 } : { r: 245, g: 250, b: 255 };

  const highlightRgb = mixRgb(parsed, whiteTarget, 0.62);
  const litMidRgb = mixRgb(parsed, whiteTarget, 0.28);
  const shadowRgb = scaleRgb(parsed, 0.68);
  const deepShadowRgb = scaleRgb(parsed, 0.42);
  const rimRgb = mixRgb(parsed, whiteTarget, 0.48);
  const ridgeRgb = mixRgb(parsed, whiteTarget, 0.78);

  return {
    highlight: toHexColor(highlightRgb),
    litMid: toHexColor(litMidRgb),
    base: toHexColor(parsed),
    shadow: toHexColor(shadowRgb),
    deepShadow: toHexColor(deepShadowRgb),
    rimStroke: toHexColor(rimRgb),
    ridgeStroke: toHexColor(ridgeRgb),
    isDark: false,
  };
}

/**
 * Bulletproof multi-plane 3D sculpted SVG vectors for KASINO21 card suits in React Native.
 * Uses pure HEX direct facet geometry (zero fragile SVG gradient URL lookups or filter primitives)
 * so Android, iOS, and Expo Web render identical glossy 3D relief at 60fps.
 */
export const TacticalSuitIcon = memo(function TacticalSuitIcon({
  suit,
  size = 20,
  faceted = true,
  color,
}: TacticalSuitIconProps) {
  const p = deriveSuitPalette(color, suit);

  const width = size;
  const height = size;

  const spadePath =
    'M24 3.5C24 3.5 11.4 15.2 7.5 22.8C4.3 29.1 9.2 35.6 16.5 34.7C20.6 34.2 22.6 31.2 23.2 29.6C22.6 35.2 17.5 40.8 13.6 43.3C17.4 43.9 30.6 43.9 34.4 43.3C30.5 40.8 25.4 35.2 24.8 29.6C25.4 31.2 27.4 34.2 31.5 34.7C38.8 35.6 43.7 29.1 40.5 22.8C36.6 15.2 24 3.5 24 3.5Z';
  const heartPath =
    'M24 12.6C20.6 6.6 13.6 4.6 8.4 8C3.2 11.4 3 19.6 7.1 26.2C11.2 32.8 19.8 39.5 24 43.4C28.2 39.5 36.8 32.8 40.9 26.2C45 19.6 44.8 11.4 39.6 8C34.4 4.6 27.4 6.6 24 12.6Z';
  const diamondPath = 'M24 3.5L41 24L24 44.5L7 24Z';
  const clubPath =
    'M24 4.2C18.3 4.2 14.4 8.2 14.4 13.4C14.4 16.2 15.7 18.7 17.6 20.2C14.9 19.2 11.2 19.3 8.4 21.5C4.9 24.3 4.6 30.1 8.2 33.4C11.8 36.6 18 35.8 21.6 31.4L22.3 30.5C21.6 35.7 17.1 40.9 13.5 43.3C17.4 43.9 30.6 43.9 34.5 43.3C30.9 40.9 26.4 35.7 25.7 30.5L26.4 31.4C30 35.8 36.2 36.6 39.8 33.4C43.4 30.1 43.1 24.3 39.6 21.5C36.8 19.3 33.1 19.2 30.4 20.2C32.3 18.7 33.6 16.2 33.6 13.4C33.6 8.2 29.7 4.2 24 4.2Z';

  // FAST PATH: Small embossed corner pips
  if (!faceted) {
    const pathMap: Record<CardSuit, string> = {
      spades: spadePath,
      hearts: heartPath,
      diamonds: diamondPath,
      clubs: clubPath,
    };
    const path = pathMap[suit];
    return (
      <Svg viewBox="0 0 48 48" width={width} height={height} fill="none">
        <Path d={path} translateY={1.1} fill={p.deepShadow} opacity={0.55} />
        <Path
          d={path}
          fill={p.base}
          stroke={p.rimStroke}
          strokeOpacity={0.6}
          strokeWidth={0.6}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  const shadowOpacity = p.isDark ? 0.28 : 0.4;

  // DETAILED PATH: Multi-plane sculpted 3D relief
  switch (suit) {
    case 'spades':
      return (
        <Svg viewBox="0 0 48 48" width={width} height={height} fill="none">
          <G>
            {/* Cast shadow & 3D extruded pedestal */}
            <Path d={spadePath} translateY={2.4} fill="#000000" opacity={shadowOpacity} />
            <Path d={spadePath} translateY={1.35} fill={p.deepShadow} />

            {/* Guaranteed opaque base */}
            <Path d={spadePath} fill={p.base} />

            {/* Left lit bevel + top-left highlight facet */}
            <Path
              d="M24 3.5C24 3.5 11.4 15.2 7.5 22.8C4.3 29.1 9.2 35.6 16.5 34.7C20.8 34.1 22.9 30.8 24 28.8V3.5Z"
              fill={p.litMid}
            />
            <Path
              d="M24 5C24 5 13 15.5 9.6 22.2C7.4 26.6 9.8 30.5 14 31.2C18.2 31.8 21.8 28.5 24 26V5Z"
              fill={p.highlight}
              opacity={0.42}
            />

            {/* Right shaded bevel */}
            <Path
              d="M24 3.5C24 3.5 36.6 15.2 40.5 22.8C43.7 29.1 38.8 35.6 31.5 34.7C27.2 34.1 25.1 30.8 24 28.8V3.5Z"
              fill={p.shadow}
              opacity={0.82}
            />

            {/* Sculpted pedestal stem (lit left / shadowed right) */}
            <Path
              d="M24 28.6H22.2C21.6 34.6 17.2 40.6 13.6 43.3C16.8 43.8 20.6 43.9 24 43.9V28.6Z"
              fill={p.litMid}
            />
            <Path
              d="M24 28.6H25.8C26.4 34.6 30.8 40.6 34.4 43.3C31.2 43.8 27.4 43.9 24 43.9V28.6Z"
              fill={p.deepShadow}
            />

            {/* Engraved inner diamond crest */}
            <Path
              d="M24 12.2L28.2 21.4L24 26.5L19.8 21.4Z"
              fill={p.highlight}
              fillOpacity={0.22}
              stroke={p.ridgeStroke}
              strokeOpacity={0.72}
              strokeWidth={0.65}
            />

            {/* Central bevel ridge & collar */}
            <Line
              x1="24"
              y1="4.8"
              x2="24"
              y2="28.8"
              stroke={p.ridgeStroke}
              strokeOpacity={0.82}
              strokeWidth={0.95}
              strokeLinecap="round"
            />
            <Path
              d="M20.6 31.4Q24 32.5 27.4 31.4"
              fill="none"
              stroke={p.ridgeStroke}
              strokeOpacity={0.7}
              strokeWidth={0.75}
              strokeLinecap="round"
            />

            {/* Upper-left specular catchlight */}
            <Path
              d="M22.8 6.2C19.4 10.2 13.2 16.5 9.8 22.6C8.3 25.4 8.6 28.2 10.2 29.8"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.55}
              strokeWidth={1}
              strokeLinecap="round"
            />

            {/* Crisp outer bevel rim */}
            <Path
              d={spadePath}
              fill="none"
              stroke={p.rimStroke}
              strokeOpacity={0.78}
              strokeWidth={0.85}
              strokeLinejoin="round"
            />
          </G>
        </Svg>
      );

    case 'hearts':
      return (
        <Svg viewBox="0 0 48 48" width={width} height={height} fill="none">
          <G>
            <Path d={heartPath} translateY={2.4} fill="#000000" opacity={shadowOpacity} />
            <Path d={heartPath} translateY={1.35} fill={p.deepShadow} />

            {/* Guaranteed opaque base */}
            <Path d={heartPath} fill={p.base} />

            {/* Left lit volumetric lobe */}
            <Path
              d="M24 12.6C20.6 6.6 13.6 4.6 8.4 8C3.2 11.4 3 19.6 7.1 26.2C11.2 32.8 19.8 39.5 24 43.4V12.6Z"
              fill={p.litMid}
            />
            {/* Domed upper-left lobe highlight */}
            <Ellipse cx="15.2" cy="15.4" rx="7.2" ry="6.2" fill={p.highlight} opacity={0.45} />

            {/* Right shaded lobe + lower-right depth undercut */}
            <Path
              d="M24 12.6C27.4 6.6 34.4 4.6 39.6 8C44.8 11.4 45 19.6 40.9 26.2C36.8 32.8 28.2 39.5 24 43.4V12.6Z"
              fill={p.shadow}
              opacity={0.62}
            />
            <Path
              d="M38.5 11.2C42.5 14.5 41.8 21.4 38.2 26.8C34.5 32.4 27.6 38.2 24 42.2C29.5 38.4 37.8 31.2 40.8 25.5C44.2 19.2 43.4 12.8 38.5 11.2Z"
              fill={p.deepShadow}
              opacity={0.45}
            />

            {/* Sculpted central jewel facet */}
            <Path
              d="M24 14.6L30 21.8L24 37.2L18 21.8Z"
              fill={p.highlight}
              fillOpacity={0.22}
              stroke={p.ridgeStroke}
              strokeOpacity={0.55}
              strokeWidth={0.6}
            />

            {/* Center ridge & glossy specular arc */}
            <Line
              x1="24"
              y1="13.4"
              x2="24"
              y2="41.6"
              stroke={p.ridgeStroke}
              strokeOpacity={0.68}
              strokeWidth={0.85}
              strokeLinecap="round"
            />
            <Path
              d="M9.6 11.8C12 8.8 16.2 8.2 19.4 10.6"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.72}
              strokeWidth={1.35}
              strokeLinecap="round"
            />
            <Circle cx="8.6" cy="14.9" r="0.95" fill="#FFFFFF" opacity={0.58} />

            <Path
              d={heartPath}
              fill="none"
              stroke={p.rimStroke}
              strokeOpacity={0.78}
              strokeWidth={0.85}
              strokeLinejoin="round"
            />
          </G>
        </Svg>
      );

    case 'diamonds':
      return (
        <Svg viewBox="0 0 48 48" width={width} height={height} fill="none">
          <G>
            <Path d={diamondPath} translateY={2.4} fill="#000000" opacity={shadowOpacity} />
            <Path d={diamondPath} translateY={1.35} fill={p.deepShadow} />

            {/* Guaranteed opaque base */}
            <Path d={diamondPath} fill={p.base} />

            {/* 4 crisp cut crystal quadrants */}
            <Path d="M24 3.5L7 24L24 24V3.5Z" fill={p.highlight} opacity={0.88} />
            <Path d="M24 3.5L41 24L24 24V3.5Z" fill={p.litMid} />
            <Path d="M24 44.5L7 24L24 24V44.5Z" fill={p.shadow} />
            <Path d="M24 44.5L41 24L24 24V44.5Z" fill={p.deepShadow} />

            {/* Raised central cut-table facet */}
            <Path d="M24 11.8L34.2 24L24 36.2L13.8 24Z" fill={p.base} />
            <Path d="M24 11.8L34.2 24L13.8 24Z" fill={p.litMid} opacity={0.9} />
            <Path d="M24 11.8L24 24L13.8 24Z" fill={p.highlight} opacity={0.75} />
            <Path
              d="M24 11.8L34.2 24L24 36.2L13.8 24Z"
              fill="none"
              stroke={p.ridgeStroke}
              strokeOpacity={0.82}
              strokeWidth={0.7}
            />

            {/* Precision facet ridges & crown glint */}
            <Line
              x1="24"
              y1="4.5"
              x2="24"
              y2="43.5"
              stroke={p.ridgeStroke}
              strokeOpacity={0.82}
              strokeWidth={0.85}
              strokeLinecap="round"
            />
            <Line
              x1="8.2"
              y1="24"
              x2="39.8"
              y2="24"
              stroke={p.ridgeStroke}
              strokeOpacity={0.62}
              strokeWidth={0.75}
              strokeLinecap="round"
            />
            <Circle cx="24" cy="11.8" r="1.2" fill="#FFFFFF" opacity={0.92} />
            <Circle cx="24" cy="24" r="1.15" fill="#FFFFFF" opacity={0.72} />

            <Path
              d={diamondPath}
              fill="none"
              stroke={p.rimStroke}
              strokeOpacity={0.78}
              strokeWidth={0.85}
              strokeLinejoin="round"
            />
          </G>
        </Svg>
      );

    case 'clubs':
      return (
        <Svg viewBox="0 0 48 48" width={width} height={height} fill="none">
          <G>
            <Path d={clubPath} translateY={2.4} fill="#000000" opacity={shadowOpacity} />
            <Path d={clubPath} translateY={1.35} fill={p.deepShadow} />

            {/* Guaranteed seamless opaque base */}
            <Path d={clubPath} fill={p.base} />

            {/* Sculpted stem (lit left / shadowed right) */}
            <Path
              d="M24 27.5H22.2C21.6 34.4 17.2 40.7 13.5 43.3C16.8 43.8 20.6 43.9 24 43.9V27.5Z"
              fill={p.litMid}
            />
            <Path
              d="M24 27.5H25.8C26.4 34.4 30.8 40.7 34.5 43.3C31.2 43.8 27.4 43.9 24 43.9V27.5Z"
              fill={p.deepShadow}
            />

            {/* 3 volumetric domed lobes (offset sphere shading) */}
            <Circle cx="24" cy="13.6" r="8.5" fill={p.base} />
            <Circle cx="22.8" cy="12.2" r="6.3" fill={p.litMid} />
            <Circle cx="21.5" cy="10.8" r="3.6" fill={p.highlight} opacity={0.76} />

            <Circle cx="13.6" cy="27.2" r="8" fill={p.base} />
            <Circle cx="12.4" cy="25.8" r="5.8" fill={p.litMid} />
            <Circle cx="11.3" cy="24.5" r="3.2" fill={p.highlight} opacity={0.7} />

            <Circle cx="34.4" cy="27.2" r="8" fill={p.shadow} />
            <Circle cx="33.3" cy="25.8" r="5.6" fill={p.base} opacity={0.9} />
            <Circle cx="32.2" cy="24.5" r="2.8" fill={p.litMid} opacity={0.62} />

            {/* Central sculpted nexus diamond */}
            <Path
              d="M24 19.6L27.8 24.5L24 29L20.2 24.5Z"
              fill={p.litMid}
              stroke={p.ridgeStroke}
              strokeOpacity={0.72}
              strokeWidth={0.55}
            />
            <Path
              d="M20.6 31.6Q24 32.7 27.4 31.6"
              fill="none"
              stroke={p.ridgeStroke}
              strokeOpacity={0.72}
              strokeWidth={0.75}
              strokeLinecap="round"
            />

            {/* Specular lobe catchlights */}
            <Path
              d="M19.2 9.8C20.5 7.8 22.8 7.2 25 7.8"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.68}
              strokeWidth={1.15}
              strokeLinecap="round"
            />
            <Path
              d="M9.4 23.6C10.5 21.8 12.5 21.3 14.3 21.8"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.58}
              strokeWidth={1.05}
              strokeLinecap="round"
            />
            <Path
              d="M30.5 23.2C31.8 21.6 33.7 21.3 35.2 22"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.4}
              strokeWidth={0.9}
              strokeLinecap="round"
            />

            <Path
              d={clubPath}
              fill="none"
              stroke={p.rimStroke}
              strokeOpacity={0.78}
              strokeWidth={0.85}
              strokeLinejoin="round"
            />
          </G>
        </Svg>
      );
  }
});
