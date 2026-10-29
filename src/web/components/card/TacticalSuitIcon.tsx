import React from 'react';

export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

interface TacticalSuitIconProps {
  suit: CardSuit;
  className?: string;
  size?: number | string;
  /** Whether to render with full 3D faceted gradient shading */
  faceted?: boolean;
  color?: string;
}

/**
 * High-precision bespoke tactical SVG vectors for KASINO21 card suits.
 * Replaces generic OS emojis with esports-grade faceted geometry and lighting.
 */
export const TacticalSuitIcon: React.FC<TacticalSuitIconProps> = ({
  suit,
  className = '',
  size = '1em',
  faceted = true,
  color,
}) => {
  const width = size;
  const height = size;

  switch (suit) {
    case 'spades':
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
            <linearGradient id="k21-spade-light" x1="12" y1="4" x2="24" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color || '#E2E8F0'} />
              <stop offset="60%" stopColor={color || '#94A3B8'} />
              <stop offset="100%" stopColor={color || '#64748B'} />
            </linearGradient>
            <linearGradient id="k21-spade-dark" x1="24" y1="4" x2="36" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color || '#CBD5E1'} />
              <stop offset="60%" stopColor={color || '#64748B'} />
              <stop offset="100%" stopColor={color || '#334155'} />
            </linearGradient>
            <linearGradient id="k21-spade-stem" x1="20" y1="30" x2="28" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <filter id="k21-spade-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#38BDF8" floodOpacity="0.4" />
            </filter>
          </defs>
          <g filter={faceted ? 'url(#k21-spade-glow)' : undefined}>
            {/* Left facet */}
            <path
              d="M24 4C24 4 11 16 8 23.5C5 31 10.5 35 17 34C22 33.2 23.5 28 24 28V4Z"
              fill={faceted ? 'url(#k21-spade-light)' : (color || 'currentColor')}
            />
            {/* Right facet */}
            <path
              d="M24 4C24 4 37 16 40 23.5C43 31 37.5 35 31 34C26 33.2 24.5 28 24 28V4Z"
              fill={faceted ? 'url(#k21-spade-dark)' : (color || 'currentColor')}
            />
            {/* Base Stem */}
            <path
              d="M22 28C22 34 16 41 14 43.5C18 43.8 30 43.8 34 43.5C32 41 26 34 26 28H22Z"
              fill={faceted ? 'url(#k21-spade-stem)' : (color || 'currentColor')}
            />
            {/* Center ridge specular highlight */}
            {faceted && (
              <line x1="24" y1="5" x2="24" y2="28" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
            )}
          </g>
        </svg>
      );

    case 'hearts':
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
            <linearGradient id="k21-heart-left" x1="10" y1="6" x2="24" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color || '#FF4D6D'} />
              <stop offset="50%" stopColor={color || '#E11D48'} />
              <stop offset="100%" stopColor={color || '#9F1239'} />
            </linearGradient>
            <linearGradient id="k21-heart-right" x1="38" y1="6" x2="24" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color || '#FB7185'} />
              <stop offset="50%" stopColor={color || '#BE123C'} />
              <stop offset="100%" stopColor={color || '#881337'} />
            </linearGradient>
            <filter id="k21-heart-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#F43F5E" floodOpacity="0.5" />
            </filter>
          </defs>
          <g filter={faceted ? 'url(#k21-heart-glow)' : undefined}>
            {/* Left lobe */}
            <path
              d="M24 13.5C21 8 15 5 9.5 8C4 11 3.5 19 6.5 25C10 32 20 39.5 24 43V13.5Z"
              fill={faceted ? 'url(#k21-heart-left)' : (color || 'currentColor')}
            />
            {/* Right lobe */}
            <path
              d="M24 13.5C27 8 33 5 38.5 8C44 11 44.5 19 41.5 25C38 32 28 39.5 24 43V13.5Z"
              fill={faceted ? 'url(#k21-heart-right)' : (color || 'currentColor')}
            />
            {/* Top specular notch & spine */}
            {faceted && (
              <>
                <line x1="24" y1="14" x2="24" y2="42" stroke="#FFE4E6" strokeWidth="0.8" strokeLinecap="round" opacity="0.75" />
                <path d="M11 9C14 7.5 18 9 20 12" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
              </>
            )}
          </g>
        </svg>
      );

    case 'diamonds':
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
            <linearGradient id="k21-diam-top-left" x1="12" y1="12" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color || '#FDA4AF'} />
              <stop offset="100%" stopColor={color || '#F43F5E'} />
            </linearGradient>
            <linearGradient id="k21-diam-top-right" x1="36" y1="12" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color || '#FB7185'} />
              <stop offset="100%" stopColor={color || '#E11D48'} />
            </linearGradient>
            <linearGradient id="k21-diam-bot-left" x1="12" y1="36" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color || '#E11D48'} />
              <stop offset="100%" stopColor={color || '#9F1239'} />
            </linearGradient>
            <linearGradient id="k21-diam-bot-right" x1="36" y1="36" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color || '#BE123C'} />
              <stop offset="100%" stopColor={color || '#881337'} />
            </linearGradient>
            <filter id="k21-diam-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#F43F5E" floodOpacity="0.5" />
            </filter>
          </defs>
          <g filter={faceted ? 'url(#k21-diam-glow)' : undefined}>
            {/* 4-facet diamond crystal */}
            <path d="M24 4L7 24L24 24V4Z" fill={faceted ? 'url(#k21-diam-top-left)' : (color || 'currentColor')} />
            <path d="M24 4L41 24L24 24V4Z" fill={faceted ? 'url(#k21-diam-top-right)' : (color || 'currentColor')} />
            <path d="M24 44L7 24L24 24V44Z" fill={faceted ? 'url(#k21-diam-bot-left)' : (color || 'currentColor')} />
            <path d="M24 44L41 24L24 24V44Z" fill={faceted ? 'url(#k21-diam-bot-right)' : (color || 'currentColor')} />
            {/* Brilliant facet lines */}
            {faceted && (
              <>
                <line x1="24" y1="5" x2="24" y2="43" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
                <line x1="8" y1="24" x2="40" y2="24" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
                <circle cx="24" cy="24" r="1.5" fill="#FFFFFF" opacity="0.9" />
              </>
            )}
          </g>
        </svg>
      );

    case 'clubs':
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
            <linearGradient id="k21-club-top" x1="24" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color || '#E2E8F0'} />
              <stop offset="100%" stopColor={color || '#64748B'} />
            </linearGradient>
            <linearGradient id="k21-club-left" x1="6" y1="18" x2="22" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color || '#CBD5E1'} />
              <stop offset="100%" stopColor={color || '#475569'} />
            </linearGradient>
            <linearGradient id="k21-club-right" x1="42" y1="18" x2="26" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color || '#94A3B8'} />
              <stop offset="100%" stopColor={color || '#334155'} />
            </linearGradient>
            <linearGradient id="k21-club-stem" x1="20" y1="26" x2="28" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <filter id="k21-club-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#38BDF8" floodOpacity="0.4" />
            </filter>
          </defs>
          <g filter={faceted ? 'url(#k21-club-glow)' : undefined}>
            {/* Top Node */}
            <circle cx="24" cy="14" r="9.5" fill={faceted ? 'url(#k21-club-top)' : (color || 'currentColor')} />
            {/* Left Node */}
            <circle cx="14" cy="27" r="9" fill={faceted ? 'url(#k21-club-left)' : (color || 'currentColor')} />
            {/* Right Node */}
            <circle cx="34" cy="27" r="9" fill={faceted ? 'url(#k21-club-right)' : (color || 'currentColor')} />
            {/* Center fusion */}
            <circle cx="24" cy="24" r="5" fill={faceted ? '#64748B' : (color || 'currentColor')} />
            {/* Stem */}
            <path
              d="M22 25C22 34 16 41 14 43.5C18 43.8 30 43.8 34 43.5C32 41 26 34 26 25H22Z"
              fill={faceted ? 'url(#k21-club-stem)' : (color || 'currentColor')}
            />
            {/* Specular dots on the 3 nodes */}
            {faceted && (
              <>
                <circle cx="22" cy="11" r="2.5" fill="#FFFFFF" opacity="0.6" />
                <circle cx="12" cy="25" r="2" fill="#FFFFFF" opacity="0.5" />
                <circle cx="32" cy="25" r="2" fill="#FFFFFF" opacity="0.5" />
              </>
            )}
          </g>
        </svg>
      );
  }
};
