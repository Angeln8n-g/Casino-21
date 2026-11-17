import React, { useId } from 'react';

export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

interface TacticalSuitIconProps {
  suit: CardSuit;
  className?: string;
  size?: number | string;
  /** Whether to render with full 3D faceted gradient shading & relief */
  faceted?: boolean;
  color?: string;
}

interface RgbColor {
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
  glowColor: string;
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

function toRgbCss(c: RgbColor, alpha?: number): string {
  const r = clampByte(c.r);
  const g = clampByte(c.g);
  const b = clampByte(c.b);
  return alpha === undefined ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

function parseColorToRgb(input: string): RgbColor | null {
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
 * Computes a 5-stop sculptural 3D palette (specular highlight -> midtone -> deep shadow)
 * from any theme suit color so every suit reads with metallic/gemstone volume.
 */
function deriveSuitPalette(color: string | undefined, suit: CardSuit): SuitPalette3D {
  const effectiveHex = color || DEFAULT_SUIT_COLORS[suit];
  const parsed = parseColorToRgb(effectiveHex) ?? parseColorToRgb(DEFAULT_SUIT_COLORS[suit])!;
  const luminance = (0.299 * parsed.r + 0.587 * parsed.g + 0.114 * parsed.b) / 255;

  // Very dark colors (classic onyx/obsidian black) rely on cool specular reflections for 3D relief
  if (luminance < 0.17) {
    const slateHighlight: RgbColor = { r: 156, g: 170, b: 192 };
    const slateMid: RgbColor = { r: 78, g: 91, b: 112 };
    return {
      highlight: toRgbCss(mixRgb(parsed, slateHighlight, 0.56)),
      litMid: toRgbCss(mixRgb(parsed, slateMid, 0.44)),
      base: toRgbCss(parsed),
      shadow: toRgbCss(scaleRgb(parsed, 0.52)),
      deepShadow: toRgbCss(scaleRgb(parsed, 0.25)),
      rimStroke: 'rgba(255, 255, 255, 0.36)',
      ridgeStroke: 'rgba(226, 232, 240, 0.52)',
      glowColor: 'rgba(0, 0, 0, 0.32)',
      isDark: true,
    };
  }

  // Warm hues (gold, crimson, amber, rose) shift highlights toward warm ivory instead of chalky blue-white
  const isWarm = parsed.r >= parsed.b;
  const whiteTarget: RgbColor = isWarm ? { r: 255, g: 250, b: 228 } : { r: 245, g: 250, b: 255 };

  const highlightRgb = mixRgb(parsed, whiteTarget, 0.62);
  const litMidRgb = mixRgb(parsed, whiteTarget, 0.26);
  const shadowRgb = scaleRgb(parsed, 0.62);
  const deepShadowRgb = scaleRgb(parsed, 0.35);
  const rimRgb = mixRgb(parsed, whiteTarget, 0.48);
  const ridgeRgb = mixRgb(parsed, whiteTarget, 0.78);

  return {
    highlight: toRgbCss(highlightRgb),
    litMid: toRgbCss(litMidRgb),
    base: toRgbCss(parsed),
    shadow: toRgbCss(shadowRgb),
    deepShadow: toRgbCss(deepShadowRgb),
    rimStroke: toRgbCss(rimRgb, 0.78),
    ridgeStroke: toRgbCss(ridgeRgb, 0.9),
    glowColor: toRgbCss(parsed, 0.42),
    isDark: false,
  };
}

/**
 * High-craft sculpted 3D SVG vectors for KASINO21 card suits.
 * Derives realistic directional lighting, beveled edges, and engraved inner facets
 * dynamically from any theme suit color.
 */
export const TacticalSuitIcon: React.FC<TacticalSuitIconProps> = ({
  suit,
  className = '',
  size = '1em',
  faceted = true,
  color,
}) => {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const p = deriveSuitPalette(color, suit);

  const width = size;
  const height = size;

  switch (suit) {
    case 'spades': {
      const outerPath =
        'M24 3.5C24 3.5 11.4 15.2 7.5 22.8C4.3 29.1 9.2 35.6 16.5 34.7C20.6 34.2 22.6 31.2 23.2 29.6C22.6 35.2 17.5 40.8 13.6 43.3C17.4 43.9 30.6 43.9 34.4 43.3C30.5 40.8 25.4 35.2 24.8 29.6C25.4 31.2 27.4 34.2 31.5 34.7C38.8 35.6 43.7 29.1 40.5 22.8C36.6 15.2 24 3.5 24 3.5Z';
      return (
        <svg
          viewBox="0 0 48 48"
          width={width}
          height={height}
          className={`inline-block select-none overflow-visible ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`${uid}-spade-full`} x1="10" y1="4" x2="38" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.litMid} />
              <stop offset="55%" stopColor={p.base} />
              <stop offset="100%" stopColor={p.shadow} />
            </linearGradient>
            <linearGradient id={`${uid}-spade-left`} x1="8" y1="6" x2="24" y2="33" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.highlight} />
              <stop offset="45%" stopColor={p.litMid} />
              <stop offset="100%" stopColor={p.base} />
            </linearGradient>
            <linearGradient id={`${uid}-spade-right`} x1="24" y1="6" x2="40" y2="33" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.base} />
              <stop offset="60%" stopColor={p.shadow} />
              <stop offset="100%" stopColor={p.deepShadow} />
            </linearGradient>
            <linearGradient id={`${uid}-spade-stem-l`} x1="14" y1="30" x2="24" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.litMid} />
              <stop offset="100%" stopColor={p.base} />
            </linearGradient>
            <linearGradient id={`${uid}-spade-stem-r`} x1="24" y1="30" x2="34" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.shadow} />
              <stop offset="100%" stopColor={p.deepShadow} />
            </linearGradient>
            <linearGradient id={`${uid}-spade-crest`} x1="20" y1="12" x2="28" y2="27" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.highlight} stopOpacity="0.65" />
              <stop offset="50%" stopColor={p.litMid} stopOpacity="0.2" />
              <stop offset="100%" stopColor={p.deepShadow} stopOpacity="0.35" />
            </linearGradient>
            <filter id={`${uid}-spade-depth`} x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="1.8" stdDeviation="1.5" floodColor="#000000" floodOpacity={p.isDark ? 0.35 : 0.55} />
              {!p.isDark && <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor={p.base} floodOpacity="0.32" />}
            </filter>
          </defs>

          {!faceted ? (
            <g>
              <path d={outerPath} transform="translate(0, 1)" fill={p.deepShadow} opacity="0.5" />
              <path d={outerPath} fill={`url(#${uid}-spade-full)`} stroke={p.rimStroke} strokeWidth="0.6" />
            </g>
          ) : (
            <g filter={`url(#${uid}-spade-depth)`}>
              {/* 3D extruded thickness pedestal */}
              <path d={outerPath} transform="translate(0, 1.5)" fill={p.deepShadow} />
              {/* Seamless unified base */}
              <path d={outerPath} fill={`url(#${uid}-spade-full)`} />
              {/* Left lit bevel */}
              <path
                d="M24 3.5C24 3.5 11.4 15.2 7.5 22.8C4.3 29.1 9.2 35.6 16.5 34.7C20.8 34.1 22.9 30.8 24 28.8V3.5Z"
                fill={`url(#${uid}-spade-left)`}
              />
              {/* Right shaded bevel */}
              <path
                d="M24 3.5C24 3.5 36.6 15.2 40.5 22.8C43.7 29.1 38.8 35.6 31.5 34.7C27.2 34.1 25.1 30.8 24 28.8V3.5Z"
                fill={`url(#${uid}-spade-right)`}
              />
              {/* Sculpted stem left & right */}
              <path
                d="M24 28.6H22.2C21.6 34.6 17.2 40.6 13.6 43.3C16.8 43.8 20.6 43.9 24 43.9V28.6Z"
                fill={`url(#${uid}-spade-stem-l)`}
              />
              <path
                d="M24 28.6H25.8C26.4 34.6 30.8 40.6 34.4 43.3C31.2 43.8 27.4 43.9 24 43.9V28.6Z"
                fill={`url(#${uid}-spade-stem-r)`}
              />
              {/* Engraved inner jewel filigree crest */}
              <path
                d="M24 11.5L28.5 21.4L24 26.8L19.5 21.4Z"
                fill={`url(#${uid}-spade-crest)`}
                stroke={p.ridgeStroke}
                strokeWidth="0.65"
                opacity="0.7"
              />
              {/* Central sculptural ridge & collar */}
              <line x1="24" y1="4.5" x2="24" y2="28.8" stroke={p.ridgeStroke} strokeWidth="0.95" strokeLinecap="round" />
              <path d="M20.6 31.4Q24 32.5 27.4 31.4" stroke={p.ridgeStroke} strokeWidth="0.75" strokeLinecap="round" opacity="0.7" />
              {/* Top-left edge specular catchlight */}
              <path
                d="M23.1 5.6C19.6 9.8 13.2 16.4 9.8 22.6C8.1 25.7 8.4 28.8 10.2 30.6"
                stroke="#FFFFFF"
                strokeWidth="0.95"
                strokeLinecap="round"
                opacity="0.45"
              />
              {/* Outer beveled contour */}
              <path d={outerPath} stroke={p.rimStroke} strokeWidth="0.85" strokeLinejoin="round" />
            </g>
          )}
        </svg>
      );
    }

    case 'hearts': {
      const outerPath =
        'M24 12.6C20.6 6.6 13.6 4.6 8.4 8C3.2 11.4 3 19.6 7.1 26.2C11.2 32.8 19.8 39.5 24 43.4C28.2 39.5 36.8 32.8 40.9 26.2C45 19.6 44.8 11.4 39.6 8C34.4 4.6 27.4 6.6 24 12.6Z';
      return (
        <svg
          viewBox="0 0 48 48"
          width={width}
          height={height}
          className={`inline-block select-none overflow-visible ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id={`${uid}-heart-body`} cx="35%" cy="28%" r="72%">
              <stop offset="0%" stopColor={p.highlight} />
              <stop offset="32%" stopColor={p.litMid} />
              <stop offset="70%" stopColor={p.base} />
              <stop offset="100%" stopColor={p.shadow} />
            </radialGradient>
            <linearGradient id={`${uid}-heart-right-shade`} x1="24" y1="10" x2="42" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.base} stopOpacity="0.1" />
              <stop offset="55%" stopColor={p.shadow} stopOpacity="0.5" />
              <stop offset="100%" stopColor={p.deepShadow} stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id={`${uid}-heart-flat`} x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.litMid} />
              <stop offset="55%" stopColor={p.base} />
              <stop offset="100%" stopColor={p.shadow} />
            </linearGradient>
            <linearGradient id={`${uid}-heart-facet`} x1="20" y1="14" x2="28" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.highlight} stopOpacity="0.55" />
              <stop offset="100%" stopColor={p.deepShadow} stopOpacity="0.3" />
            </linearGradient>
            <filter id={`${uid}-heart-depth`} x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="1.8" stdDeviation="1.5" floodColor="#000000" floodOpacity={p.isDark ? 0.35 : 0.55} />
              {!p.isDark && <feDropShadow dx="0" dy="0" stdDeviation="2.4" floodColor={p.base} floodOpacity="0.38" />}
            </filter>
          </defs>

          {!faceted ? (
            <g>
              <path d={outerPath} transform="translate(0, 1)" fill={p.deepShadow} opacity="0.5" />
              <path d={outerPath} fill={`url(#${uid}-heart-flat)`} stroke={p.rimStroke} strokeWidth="0.6" />
            </g>
          ) : (
            <g filter={`url(#${uid}-heart-depth)`}>
              {/* 3D extruded depth rim */}
              <path d={outerPath} transform="translate(0, 1.5)" fill={p.deepShadow} />
              {/* Domed gemstone/metallic body */}
              <path d={outerPath} fill={`url(#${uid}-heart-body)`} />
              {/* Right lobe directional shadow */}
              <path
                d="M24 12.6C27.4 6.6 34.4 4.6 39.6 8C44.8 11.4 45 19.6 40.9 26.2C36.8 32.8 28.2 39.5 24 43.4V12.6Z"
                fill={`url(#${uid}-heart-right-shade)`}
              />
              {/* Sculpted central crown facet */}
              <path
                d="M24 14.5L30.2 21.8L24 37.8L17.8 21.8Z"
                fill={`url(#${uid}-heart-facet)`}
                stroke={p.ridgeStroke}
                strokeWidth="0.55"
                opacity="0.55"
              />
              {/* Center spine crease */}
              <line x1="24" y1="13.2" x2="24" y2="41.8" stroke={p.ridgeStroke} strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
              {/* Glossy upper-left specular reflection */}
              <path
                d="M9.8 11.8C12.2 8.7 16.4 8.2 19.6 10.6"
                stroke="#FFFFFF"
                strokeWidth="1.35"
                strokeLinecap="round"
                opacity="0.65"
              />
              <circle cx="8.6" cy="14.9" r="0.9" fill="#FFFFFF" opacity="0.5" />
              {/* Crisp beveled outer rim */}
              <path d={outerPath} stroke={p.rimStroke} strokeWidth="0.85" strokeLinejoin="round" />
            </g>
          )}
        </svg>
      );
    }

    case 'diamonds': {
      const outerPath = 'M24 3.5L41 24L24 44.5L7 24Z';
      return (
        <svg
          viewBox="0 0 48 48"
          width={width}
          height={height}
          className={`inline-block select-none overflow-visible ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`${uid}-diam-tl`} x1="10" y1="8" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.highlight} />
              <stop offset="100%" stopColor={p.litMid} />
            </linearGradient>
            <linearGradient id={`${uid}-diam-tr`} x1="24" y1="8" x2="39" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.litMid} />
              <stop offset="100%" stopColor={p.base} />
            </linearGradient>
            <linearGradient id={`${uid}-diam-bl`} x1="10" y1="24" x2="24" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.base} />
              <stop offset="100%" stopColor={p.shadow} />
            </linearGradient>
            <linearGradient id={`${uid}-diam-br`} x1="24" y1="24" x2="39" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.shadow} />
              <stop offset="100%" stopColor={p.deepShadow} />
            </linearGradient>
            <linearGradient id={`${uid}-diam-table`} x1="17" y1="12" x2="31" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.highlight} stopOpacity="0.85" />
              <stop offset="50%" stopColor={p.base} stopOpacity="0.35" />
              <stop offset="100%" stopColor={p.deepShadow} stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id={`${uid}-diam-flat`} x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.litMid} />
              <stop offset="55%" stopColor={p.base} />
              <stop offset="100%" stopColor={p.shadow} />
            </linearGradient>
            <filter id={`${uid}-diam-depth`} x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="1.8" stdDeviation="1.5" floodColor="#000000" floodOpacity={p.isDark ? 0.35 : 0.55} />
              {!p.isDark && <feDropShadow dx="0" dy="0" stdDeviation="2.4" floodColor={p.base} floodOpacity="0.38" />}
            </filter>
          </defs>

          {!faceted ? (
            <g>
              <path d={outerPath} transform="translate(0, 1)" fill={p.deepShadow} opacity="0.5" />
              <path d={outerPath} fill={`url(#${uid}-diam-flat)`} stroke={p.rimStroke} strokeWidth="0.6" />
            </g>
          ) : (
            <g filter={`url(#${uid}-diam-depth)`}>
              {/* 3D extruded bevel thickness */}
              <path d={outerPath} transform="translate(0, 1.5)" fill={p.deepShadow} />
              {/* 4 cut crystal quadrants */}
              <path d="M24 3.5L7 24L24 24V3.5Z" fill={`url(#${uid}-diam-tl)`} />
              <path d="M24 3.5L41 24L24 24V3.5Z" fill={`url(#${uid}-diam-tr)`} />
              <path d="M24 44.5L7 24L24 24V44.5Z" fill={`url(#${uid}-diam-bl)`} />
              <path d="M24 44.5L41 24L24 24V44.5Z" fill={`url(#${uid}-diam-br)`} />
              {/* Raised inner cut-table facet */}
              <path
                d="M24 11.8L34.2 24L24 36.2L13.8 24Z"
                fill={`url(#${uid}-diam-table)`}
                stroke={p.ridgeStroke}
                strokeWidth="0.7"
                opacity="0.85"
              />
              {/* Precision facet ridges */}
              <line x1="24" y1="4.5" x2="24" y2="43.5" stroke={p.ridgeStroke} strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />
              <line x1="8" y1="24" x2="40" y2="24" stroke={p.ridgeStroke} strokeWidth="0.75" strokeLinecap="round" opacity="0.65" />
              {/* Crown specular glint */}
              <circle cx="24" cy="11.8" r="1.15" fill="#FFFFFF" opacity="0.9" />
              <circle cx="24" cy="24" r="1.2" fill="#FFFFFF" opacity="0.7" />
              {/* Crisp outer bevel rim */}
              <path d={outerPath} stroke={p.rimStroke} strokeWidth="0.85" strokeLinejoin="round" />
            </g>
          )}
        </svg>
      );
    }

    case 'clubs': {
      const outerPath =
        'M24 4.2C18.3 4.2 14.4 8.2 14.4 13.4C14.4 16.2 15.7 18.7 17.6 20.2C14.9 19.2 11.2 19.3 8.4 21.5C4.9 24.3 4.6 30.1 8.2 33.4C11.8 36.6 18 35.8 21.6 31.4L22.3 30.5C21.6 35.7 17.1 40.9 13.5 43.3C17.4 43.9 30.6 43.9 34.5 43.3C30.9 40.9 26.4 35.7 25.7 30.5L26.4 31.4C30 35.8 36.2 36.6 39.8 33.4C43.4 30.1 43.1 24.3 39.6 21.5C36.8 19.3 33.1 19.2 30.4 20.2C32.3 18.7 33.6 16.2 33.6 13.4C33.6 8.2 29.7 4.2 24 4.2Z';
      return (
        <svg
          viewBox="0 0 48 48"
          width={width}
          height={height}
          className={`inline-block select-none overflow-visible ${className}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`${uid}-club-full`} x1="10" y1="5" x2="38" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.litMid} />
              <stop offset="55%" stopColor={p.base} />
              <stop offset="100%" stopColor={p.shadow} />
            </linearGradient>
            <radialGradient id={`${uid}-club-top`} cx="35%" cy="30%" r="72%">
              <stop offset="0%" stopColor={p.highlight} />
              <stop offset="45%" stopColor={p.litMid} />
              <stop offset="85%" stopColor={p.base} />
              <stop offset="100%" stopColor={p.shadow} />
            </radialGradient>
            <radialGradient id={`${uid}-club-left`} cx="34%" cy="30%" r="72%">
              <stop offset="0%" stopColor={p.highlight} />
              <stop offset="40%" stopColor={p.litMid} />
              <stop offset="80%" stopColor={p.base} />
              <stop offset="100%" stopColor={p.shadow} />
            </radialGradient>
            <radialGradient id={`${uid}-club-right`} cx="32%" cy="28%" r="75%">
              <stop offset="0%" stopColor={p.litMid} />
              <stop offset="45%" stopColor={p.base} />
              <stop offset="85%" stopColor={p.shadow} />
              <stop offset="100%" stopColor={p.deepShadow} />
            </radialGradient>
            <linearGradient id={`${uid}-club-stem-l`} x1="14" y1="30" x2="24" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.litMid} />
              <stop offset="100%" stopColor={p.base} />
            </linearGradient>
            <linearGradient id={`${uid}-club-stem-r`} x1="24" y1="30" x2="34" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.shadow} />
              <stop offset="100%" stopColor={p.deepShadow} />
            </linearGradient>
            <filter id={`${uid}-club-depth`} x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="1.8" stdDeviation="1.5" floodColor="#000000" floodOpacity={p.isDark ? 0.35 : 0.55} />
              {!p.isDark && <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor={p.base} floodOpacity="0.32" />}
            </filter>
          </defs>

          {!faceted ? (
            <g>
              <path d={outerPath} transform="translate(0, 1)" fill={p.deepShadow} opacity="0.5" />
              <path d={outerPath} fill={`url(#${uid}-club-full)`} stroke={p.rimStroke} strokeWidth="0.6" />
            </g>
          ) : (
            <g filter={`url(#${uid}-club-depth)`}>
              {/* 3D extruded base thickness */}
              <path d={outerPath} transform="translate(0, 1.5)" fill={p.deepShadow} />
              {/* Seamless unified trefoil base */}
              <path d={outerPath} fill={`url(#${uid}-club-full)`} />
              {/* Sculpted stem left & right */}
              <path
                d="M24 27.5H22.2C21.6 34.4 17.2 40.7 13.5 43.3C16.8 43.8 20.6 43.9 24 43.9V27.5Z"
                fill={`url(#${uid}-club-stem-l)`}
              />
              <path
                d="M24 27.5H25.8C26.4 34.4 30.8 40.7 34.5 43.3C31.2 43.8 27.4 43.9 24 43.9V27.5Z"
                fill={`url(#${uid}-club-stem-r)`}
              />
              {/* 3 volumetric domed lobes */}
              <circle cx="24" cy="13.6" r="8.6" fill={`url(#${uid}-club-top)`} />
              <circle cx="13.6" cy="27.2" r="8.1" fill={`url(#${uid}-club-left)`} />
              <circle cx="34.4" cy="27.2" r="8.1" fill={`url(#${uid}-club-right)`} />
              {/* Central sculpted nexus diamond */}
              <path
                d="M24 19.5L28 24.5L24 29.2L20 24.5Z"
                fill={`url(#${uid}-club-top)`}
                stroke={p.ridgeStroke}
                strokeWidth="0.55"
                opacity="0.7"
              />
              {/* Collar highlight */}
              <path d="M20.6 31.6Q24 32.7 27.4 31.6" stroke={p.ridgeStroke} strokeWidth="0.75" strokeLinecap="round" opacity="0.7" />
              {/* Specular catchlights on lobes */}
              <path
                d="M19.5 9.8C20.8 7.8 23.2 7.2 25.4 7.8"
                stroke="#FFFFFF"
                strokeWidth="1.15"
                strokeLinecap="round"
                opacity="0.6"
              />
              <path
                d="M9.4 23.6C10.5 21.8 12.6 21.3 14.5 21.8"
                stroke="#FFFFFF"
                strokeWidth="1.05"
                strokeLinecap="round"
                opacity="0.52"
              />
              <path
                d="M30.5 23.2C31.8 21.6 33.8 21.3 35.4 22"
                stroke="#FFFFFF"
                strokeWidth="0.9"
                strokeLinecap="round"
                opacity="0.36"
              />
              {/* Crisp outer bevel contour */}
              <path d={outerPath} stroke={p.rimStroke} strokeWidth="0.85" strokeLinejoin="round" />
            </g>
          )}
        </svg>
      );
    }
  }
};
