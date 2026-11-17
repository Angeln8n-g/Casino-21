import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { parseColorToRgb, toHexColor } from './TacticalSuitIcon';

interface BoardThemeOverlayProps {
  background?: string | null;
  overlayGradient?: string | null;
  compact?: boolean;
}

interface DustParticle {
  cx: string;
  cy: string;
  color: string;
  opacity: number;
  r: number;
}

interface TableSpotlight {
  cx: string;
  cy: string;
  color: string;
  opacity: number;
}

function parseColorAndAlpha(rawColor: string): { hex: string; alpha: number } {
  const alphaMatch = rawColor.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)/i);
  const alpha = alphaMatch ? Math.max(0, Math.min(1, Number(alphaMatch[1]))) : 1;
  const rgb = parseColorToRgb(rawColor);
  return {
    hex: rgb ? toHexColor(rgb) : '#fbbf24',
    alpha: Number.isFinite(alpha) ? alpha : 1,
  };
}

function parseOverlayEffects(
  background?: string | null,
  overlayGradient?: string | null
): { particles: DustParticle[]; spotlight: TableSpotlight | null } {
  const particles: DustParticle[] = [];
  let spotlight: TableSpotlight | null = null;

  const combined = [background || '', overlayGradient || ''].filter(Boolean).join(', ');
  if (!combined) return { particles, spotlight };

  // Parse micro dust particles (0px -> transparent Npx)
  const dotRegex =
    /radial-gradient\(\s*(?:circle\s+)?at\s+([\d.]+%)\s+([\d.]+%)\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s+0(?:px)?\s*,\s*transparent\s+([\d.]+)(?:px)?\s*\)/gi;

  let match: RegExpExecArray | null;
  while ((match = dotRegex.exec(combined)) !== null) {
    const { hex, alpha } = parseColorAndAlpha(match[3]);
    const radius = Math.max(1, Math.min(3.5, Number(match[4]) || 2));
    particles.push({
      cx: match[1],
      cy: match[2],
      color: hex,
      opacity: alpha,
      r: radius,
    });
  }

  // Parse large ambient table spotlight (0% start)
  const spotRegex =
    /radial-gradient\(\s*(?:circle\s+)?at\s+([\d.]+%)\s+([\d.]+%)\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s+0%/i;
  const spotMatch = combined.match(spotRegex);
  if (spotMatch) {
    const { hex, alpha } = parseColorAndAlpha(spotMatch[3]);
    if (alpha > 0.01 && alpha < 0.7) {
      spotlight = {
        cx: spotMatch[1],
        cy: spotMatch[2],
        color: hex,
        opacity: alpha,
      };
    }
  }

  return { particles, spotlight };
}

/**
 * Renders pure-CSS radial table spotlights and gold/neon dust particles
 * from theme definitions natively in React Native without requiring external bitmaps.
 */
export const BoardThemeOverlay = memo(function BoardThemeOverlay({
  background,
  overlayGradient,
  compact = false,
}: BoardThemeOverlayProps) {
  const { particles, spotlight } = useMemo(
    () => parseOverlayEffects(background, overlayGradient),
    [background, overlayGradient]
  );

  if (!spotlight && particles.length === 0) {
    return null;
  }

  const rScale = compact ? 0.75 : 1;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Svg width="100%" height="100%" fill="none">
        {spotlight && (
          <>
            <Circle cx={spotlight.cx} cy={spotlight.cy} r="46%" fill={spotlight.color} opacity={spotlight.opacity * 0.35} />
            <Circle cx={spotlight.cx} cy={spotlight.cy} r="30%" fill={spotlight.color} opacity={spotlight.opacity * 0.55} />
            <Circle cx={spotlight.cx} cy={spotlight.cy} r="16%" fill={spotlight.color} opacity={spotlight.opacity * 0.75} />
          </>
        )}

        {particles.map((pt, idx) => (
          <React.Fragment key={idx}>
            <Circle
              cx={pt.cx}
              cy={pt.cy}
              r={pt.r * 1.9 * rScale}
              fill={pt.color}
              opacity={pt.opacity * 0.22}
            />
            <Circle
              cx={pt.cx}
              cy={pt.cy}
              r={pt.r * 0.85 * rScale}
              fill={pt.color}
              opacity={pt.opacity * 0.92}
            />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
});
