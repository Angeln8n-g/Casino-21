import React from 'react';
import Svg, { Defs, LinearGradient, Stop, G, Path, Line, Circle } from 'react-native-svg';

export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

interface TacticalSuitIconProps {
  suit: CardSuit;
  size?: number;
  faceted?: boolean;
  color?: string;
}

/**
 * Bespoke tactical SVG vectors for KASINO21 card suits in React Native.
 * Faceted geometry and lighting matching web version.
 */
export const TacticalSuitIcon: React.FC<TacticalSuitIconProps> = ({
  suit,
  size = 20,
  faceted = true,
  color,
}) => {
  const width = size;
  const height = size;

  switch (suit) {
    case 'spades':
      return (
        <Svg viewBox="0 0 48 48" width={width} height={height}>
          <Defs>
            <LinearGradient id="k21-spade-light" x1="12" y1="4" x2="24" y2="34" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={color || '#E2E8F0'} />
              <Stop offset="60%" stopColor={color || '#94A3B8'} />
              <Stop offset="100%" stopColor={color || '#64748B'} />
            </LinearGradient>
            <LinearGradient id="k21-spade-dark" x1="24" y1="4" x2="36" y2="34" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={color || '#CBD5E1'} />
              <Stop offset="60%" stopColor={color || '#64748B'} />
              <Stop offset="100%" stopColor={color || '#334155'} />
            </LinearGradient>
            <LinearGradient id="k21-spade-stem" x1="20" y1="30" x2="28" y2="44" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#94A3B8" />
              <Stop offset="100%" stopColor="#334155" />
            </LinearGradient>
          </Defs>
          <G>
            {/* Left facet */}
            <Path
              d="M24 4C24 4 11 16 8 23.5C5 31 10.5 35 17 34C22 33.2 23.5 28 24 28V4Z"
              fill={faceted ? 'url(#k21-spade-light)' : (color || '#E2E8F0')}
            />
            {/* Right facet */}
            <Path
              d="M24 4C24 4 37 16 40 23.5C43 31 37.5 35 31 34C26 33.2 24.5 28 24 28V4Z"
              fill={faceted ? 'url(#k21-spade-dark)' : (color || '#CBD5E1')}
            />
            {/* Base Stem */}
            <Path
              d="M22 28C22 34 16 41 14 43.5C18 43.8 30 43.8 34 43.5C32 41 26 34 26 28H22Z"
              fill={faceted ? 'url(#k21-spade-stem)' : (color || '#94A3B8')}
            />
            {/* Center ridge specular highlight */}
            {faceted && (
              <Line x1="24" y1="5" x2="24" y2="28" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity={0.8} />
            )}
          </G>
        </Svg>
      );

    case 'hearts':
      return (
        <Svg viewBox="0 0 48 48" width={width} height={height}>
          <Defs>
            <LinearGradient id="k21-heart-left" x1="10" y1="6" x2="24" y2="42" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={color || '#FF4D6D'} />
              <Stop offset="50%" stopColor={color || '#E11D48'} />
              <Stop offset="100%" stopColor={color || '#9F1239'} />
            </LinearGradient>
            <LinearGradient id="k21-heart-right" x1="38" y1="6" x2="24" y2="42" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={color || '#FB7185'} />
              <Stop offset="50%" stopColor={color || '#BE123C'} />
              <Stop offset="100%" stopColor={color || '#881337'} />
            </LinearGradient>
          </Defs>
          <G>
            {/* Left lobe */}
            <Path
              d="M24 13.5C21 8 15 5 9.5 8C4 11 3.5 19 6.5 25C10 32 20 39.5 24 43V13.5Z"
              fill={faceted ? 'url(#k21-heart-left)' : (color || '#FF4D6D')}
            />
            {/* Right lobe */}
            <Path
              d="M24 13.5C27 8 33 5 38.5 8C44 11 44.5 19 41.5 25C38 32 28 39.5 24 43V13.5Z"
              fill={faceted ? 'url(#k21-heart-right)' : (color || '#FB7185')}
            />
            {/* Spine specular line */}
            {faceted && (
              <Line x1="24" y1="14" x2="24" y2="42" stroke="#FFE4E6" strokeWidth="0.8" strokeLinecap="round" opacity={0.75} />
            )}
          </G>
        </Svg>
      );

    case 'diamonds':
      return (
        <Svg viewBox="0 0 48 48" width={width} height={height}>
          <Defs>
            <LinearGradient id="k21-diam-top-left" x1="12" y1="12" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={color || '#FDA4AF'} />
              <Stop offset="100%" stopColor={color || '#F43F5E'} />
            </LinearGradient>
            <LinearGradient id="k21-diam-top-right" x1="36" y1="12" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={color || '#FB7185'} />
              <Stop offset="100%" stopColor={color || '#E11D48'} />
            </LinearGradient>
            <LinearGradient id="k21-diam-bot-left" x1="12" y1="36" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={color || '#E11D48'} />
              <Stop offset="100%" stopColor={color || '#9F1239'} />
            </LinearGradient>
            <LinearGradient id="k21-diam-bot-right" x1="36" y1="36" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={color || '#BE123C'} />
              <Stop offset="100%" stopColor={color || '#881337'} />
            </LinearGradient>
          </Defs>
          <G>
            {/* 4-facet diamond crystal */}
            <Path d="M24 4L7 24L24 24V4Z" fill={faceted ? 'url(#k21-diam-top-left)' : (color || '#FDA4AF')} />
            <Path d="M24 4L41 24L24 24V4Z" fill={faceted ? 'url(#k21-diam-top-right)' : (color || '#FB7185')} />
            <Path d="M24 44L7 24L24 24V44Z" fill={faceted ? 'url(#k21-diam-bot-left)' : (color || '#E11D48')} />
            <Path d="M24 44L41 24L24 24V44Z" fill={faceted ? 'url(#k21-diam-bot-right)' : (color || '#BE123C')} />
            {/* Facet lines */}
            {faceted && (
              <>
                <Line x1="24" y1="5" x2="24" y2="43" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity={0.8} />
                <Line x1="8" y1="24" x2="40" y2="24" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" opacity={0.6} />
                <Circle cx="24" cy="24" r="1.5" fill="#FFFFFF" opacity={0.9} />
              </>
            )}
          </G>
        </Svg>
      );

    case 'clubs':
      return (
        <Svg viewBox="0 0 48 48" width={width} height={height}>
          <Defs>
            <LinearGradient id="k21-club-top" x1="24" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={color || '#E2E8F0'} />
              <Stop offset="100%" stopColor={color || '#64748B'} />
            </LinearGradient>
            <LinearGradient id="k21-club-left" x1="6" y1="18" x2="22" y2="30" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={color || '#CBD5E1'} />
              <Stop offset="100%" stopColor={color || '#475569'} />
            </LinearGradient>
            <LinearGradient id="k21-club-right" x1="42" y1="18" x2="26" y2="30" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={color || '#94A3B8'} />
              <Stop offset="100%" stopColor={color || '#334155'} />
            </LinearGradient>
            <LinearGradient id="k21-club-stem" x1="20" y1="26" x2="28" y2="44" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#94A3B8" />
              <Stop offset="100%" stopColor="#334155" />
            </LinearGradient>
          </Defs>
          <G>
            {/* Top Node */}
            <Circle cx="24" cy="14" r="9.5" fill={faceted ? 'url(#k21-club-top)' : (color || '#E2E8F0')} />
            {/* Left Node */}
            <Circle cx="14" cy="27" r="9" fill={faceted ? 'url(#k21-club-left)' : (color || '#CBD5E1')} />
            {/* Right Node */}
            <Circle cx="34" cy="27" r="9" fill={faceted ? 'url(#k21-club-right)' : (color || '#94A3B8')} />
            {/* Center fusion */}
            <Circle cx="24" cy="24" r="5" fill={faceted ? '#64748B' : (color || '#64748B')} />
            {/* Stem */}
            <Path
              d="M22 25C22 34 16 41 14 43.5C18 43.8 30 43.8 34 43.5C32 41 26 34 26 25H22Z"
              fill={faceted ? 'url(#k21-club-stem)' : (color || '#94A3B8')}
            />
            {/* Specular dots */}
            {faceted && (
              <>
                <Circle cx="22" cy="11" r="2" fill="#FFFFFF" opacity={0.6} />
                <Circle cx="12" cy="25" r="1.5" fill="#FFFFFF" opacity={0.5} />
                <Circle cx="32" cy="25" r="1.5" fill="#FFFFFF" opacity={0.5} />
              </>
            )}
          </G>
        </Svg>
      );
  }
};
