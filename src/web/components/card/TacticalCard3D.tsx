import React, { forwardRef, useRef, useImperativeHandle, useCallback } from 'react';
import { TacticalSuitIcon, CardSuit } from './TacticalSuitIcon';
import { CardTheme, getThemeFont, ThemeFontKey } from '../../themes/themeRegistry';
import { triggerHaptic } from '../../utils/haptics';

export type CardSize = 'responsive' | 'xs' | 'sm' | 'md' | 'lg';

export interface TacticalCard3DProps extends React.HTMLAttributes<HTMLDivElement> {
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
  customStyle?: {
    cardBg?: string;
    cardBorder?: string;
    redSuitColor?: string;
    blackSuitColor?: string;
    fontKey?: ThemeFontKey;
  };
  enableTilt?: boolean;
  onClick?: () => void;
}

// Default Classic Playing Card palette
const DEFAULT_ESPORTS_THEME: CardTheme = {
  background: 'linear-gradient(165deg, #ffffff 0%, #fdfcf9 40%, #f1f5f9 100%)',
  boxShadow: '0 10px 20px -6px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08) inset',
  boxShadowSelected: '0 18px 36px -8px rgba(0,0,0,0.45), 0 0 0 2px rgba(234, 179, 8, 0.8) inset',
  border: '1px solid rgba(15, 23, 42, 0.12)',
  innerEdge: 'rgba(203, 213, 225, 0.7)',
  redSuitColor: '#dc2626',
  blackSuitColor: '#0f172a',
  fontKey: 'cinzel',
};

/**
 * Determines whether a CSS background string represents a light cardstock surface
 * vs a dark or translucent surface so highlights, ink embossing, and shadows adapt cleanly.
 */
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
    for (const raw of hexMatches) {
      const hex = raw.slice(1);
      let r = 0;
      let g = 0;
      let b = 0;
      if (hex.length === 3 || hex.length === 4) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6 || hex.length === 8) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      } else {
        continue;
      }
      lumSum += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      count += 1;
    }
    if (count > 0) {
      return lumSum / count > 0.48;
    }
  }

  // Translucent glass themes (e.g., Gold Rush) sit over dark felt tables
  return false;
}

export const TacticalCard3D = forwardRef<HTMLDivElement, TacticalCard3DProps>(
  (
    {
      rank = 'A',
      suit = 'spades',
      value,
      selected = false,
      disabled = false,
      isKey = false,
      isFaceDown = false,
      annotation,
      size = 'responsive',
      theme,
      fontKey,
      customStyle,
      enableTilt = true,
      onClick,
      className = '',
      style,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardedRef, () => internalRef.current as HTMLDivElement);

    const isRed = suit === 'hearts' || suit === 'diamonds';
    const activeTheme = theme ?? DEFAULT_ESPORTS_THEME;
    const effectiveFontKey = fontKey || customStyle?.fontKey || activeTheme.fontKey;
    const fontOption = getThemeFont(effectiveFontKey);

    const suitColor = isRed
      ? customStyle?.redSuitColor || activeTheme.redSuitColor
      : customStyle?.blackSuitColor || activeTheme.blackSuitColor;

    // Detect high-value strategic cards in K21
    const isLaBuena = rank === '10' && suit === 'diamonds';
    const isLaChica = rank === '2' && suit === 'spades';
    const isAce = rank === 'A';
    const isCourtCard = rank === 'K' || rank === 'Q' || rank === 'J';

    // Interactive 3D tilt tracking (zero-state, direct CSS variables for 120fps smoothness)
    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!enableTilt || disabled) return;
        const el = internalRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        // Weighted physical card tilt (-11 to +11 degrees)
        const tiltX = (0.5 - y) * 18;
        const tiltY = (x - 0.5) * 18;

        el.style.setProperty('--card-tilt-x', `${tiltX.toFixed(2)}deg`);
        el.style.setProperty('--card-tilt-y', `${tiltY.toFixed(2)}deg`);
        el.style.setProperty('--card-light-x', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--card-light-y', `${(y * 100).toFixed(1)}%`);
      },
      [enableTilt, disabled]
    );

    const handlePointerLeave = useCallback(() => {
      const el = internalRef.current;
      if (!el) return;
      el.style.setProperty('--card-tilt-x', '0deg');
      el.style.setProperty('--card-tilt-y', '0deg');
      el.style.setProperty('--card-light-x', '32%');
      el.style.setProperty('--card-light-y', '22%');
    }, []);

    const handleClick = useCallback(() => {
      if (!disabled && onClick) {
        triggerHaptic('card_tap');
        onClick();
      }
    }, [disabled, onClick]);

    // Dimensions map
    const sizeClasses = {
      responsive:
        'w-[clamp(2.6rem,14vw,5.2rem)] h-[clamp(3.9rem,21vw,7.8rem)] md:w-[clamp(4.2rem,5.5vw,5.5rem)] md:h-[clamp(6.3rem,8.2vw,8.2rem)] rounded-xl md:rounded-2xl p-1.5 md:p-2.5 text-xs md:text-sm',
      xs: 'w-12 h-18 text-[10px] rounded-lg p-1',
      sm: 'w-16 h-24 text-xs rounded-xl p-1.5',
      md: 'w-20 h-28 sm:w-24 sm:h-36 text-sm rounded-xl p-2 sm:p-2.5',
      lg: 'w-28 h-40 sm:w-32 sm:h-48 text-base rounded-2xl p-3 sm:p-3.5',
    }[size];

    // Symmetrical corner position classes
    const cornerTopLeftClass =
      size === 'xs'
        ? 'top-1 left-1'
        : size === 'sm'
        ? 'top-1.5 left-1.5'
        : 'top-1.5 left-1.5 sm:top-2 sm:left-2';

    const cornerBottomRightClass =
      size === 'xs'
        ? 'bottom-1 right-1'
        : size === 'sm'
        ? 'bottom-1.5 right-1.5'
        : 'bottom-1.5 right-1.5 sm:bottom-2 sm:right-2';

    // Background & surface properties
    const cardBg = customStyle?.cardBg || activeTheme.background;
    const isLightTheme = isLightCardSurface(cardBg);
    const effectiveBorder = customStyle?.cardBorder || activeTheme.border;
    const innerEdgeColor = activeTheme.innerEdge || (isLightTheme ? 'rgba(148, 163, 184, 0.7)' : 'rgba(212, 175, 55, 0.5)');

    const rankTextShadow = isLightTheme
      ? '0 1px 0 rgba(255, 255, 255, 0.75), 0 1px 2px rgba(0, 0, 0, 0.18)'
      : '0 1px 0 rgba(255, 255, 255, 0.16), 0 2px 4px rgba(0, 0, 0, 0.85)';

    const centerSuitDropShadow = isLightTheme
      ? 'drop-shadow-[0_3px_5px_rgba(0,0,0,0.22)]'
      : 'drop-shadow-[0_5px_10px_rgba(0,0,0,0.68)]';

    const thicknessBackground = isLightTheme
      ? 'linear-gradient(180deg, #e2e8f0 0%, #94a3b8 100%)'
      : 'linear-gradient(180deg, #27272a 0%, #09090b 100%)';

    const themeVars: React.CSSProperties = {
      ...(activeTheme.boxShadow
        ? ({
            '--k21-card-shadow': `${activeTheme.boxShadow}, inset 0 1px 0 rgba(255, 255, 255, 0.24), inset 0 -1.5px 0 rgba(0, 0, 0, 0.45)`,
          } as React.CSSProperties)
        : {}),
      ...(activeTheme.boxShadowSelected
        ? ({
            '--k21-card-shadow-selected': `${activeTheme.boxShadowSelected}, 0 0 0 1.5px rgba(251, 191, 36, 0.9), 0 0 22px rgba(251, 191, 36, 0.55)`,
          } as React.CSSProperties)
        : {}),
    };

    // ─── Face Down Card (Dorso 3D Casino) ───
    if (isFaceDown) {
      return (
        <div
          ref={internalRef}
          role="img"
          aria-label="Carta boca abajo K21"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
          className={`
            k21-card-3d-root k21-card-idle relative shrink-0 select-none flex flex-col items-center justify-center
            cursor-pointer overflow-visible transform-gpu touch-manipulation
            ${sizeClasses} ${className}
          `}
          style={{
            transformStyle: 'preserve-3d',
            ...style,
          }}
          {...props}
        >
          {/* Physical Cardstock Thickness */}
          <div
            className="k21-card-thickness absolute inset-0 rounded-[inherit] pointer-events-none"
            style={{ background: 'linear-gradient(180deg, #451a03 0%, #0c0a09 100%)' }}
          />

          {/* 3D Slab Thickness Bevel & Shadow */}
          <div className="k21-card-slab-back absolute inset-0 rounded-[inherit] pointer-events-none" />

          {/* Core Faceplate */}
          <div className="absolute inset-[1.5px] rounded-[inherit] overflow-hidden bg-gradient-to-br from-[#141726] via-[#090c14] to-[#040509] border border-amber-500/40 flex flex-col items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_-1.5px_3px_rgba(0,0,0,0.75)]">
            {/* Refined Casino Guilloche Diamond Weave */}
            <div className="absolute inset-0 opacity-40 pointer-events-none k21-card-back-guilloche" />
            <div className="absolute inset-0 pointer-events-none k21-card-studio-lighting" />

            {/* Double Recessed Luxury Gold Frame */}
            <div className="absolute inset-1.5 sm:inset-2 rounded-lg border border-amber-400/40 flex items-center justify-center">
              <div className="absolute inset-[3px] rounded-md border border-amber-300/20 pointer-events-none" />

              {/* Embossed Center Medallion Seal */}
              <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full border border-amber-400/35 bg-black/35 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_1px_0_rgba(251,191,36,0.2)] flex items-center justify-center">
                <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full border border-dashed border-amber-300/40 flex items-center justify-center">
                  <span className="font-['Cinzel'] font-black text-amber-300/90 text-sm sm:text-xl tracking-wider drop-shadow-[0_2px_6px_rgba(251,191,36,0.55)]">
                    21
                  </span>
                </div>
              </div>

              {/* Corner Ornaments */}
              <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-amber-400/70" />
              <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-amber-400/70" />
              <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-amber-400/70" />
              <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-amber-400/70" />
            </div>

            {/* Dynamic Specular Sheen */}
            <div className="k21-card-specular-glare absolute inset-0 rounded-[inherit] pointer-events-none" />
          </div>
        </div>
      );
    }

    // ─── Face Up Card (Realistic 3D Slab) ───
    return (
      <div
        ref={internalRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${rank} de ${suit}`}
        aria-pressed={selected}
        aria-disabled={disabled}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        className={`
          k21-card-3d-root relative shrink-0 select-none flex flex-col justify-between
          transform-gpu touch-manipulation overflow-visible
          ${sizeClasses}
          ${disabled ? 'opacity-40 cursor-not-allowed filter grayscale-[30%]' : 'cursor-pointer'}
          ${selected ? 'k21-card-selected' : isKey ? 'k21-card-key' : 'k21-card-idle'}
          ${activeTheme.extraClass ?? ''}
          ${className}
        `}
        style={{
          transformStyle: 'preserve-3d',
          ...themeVars,
          ...style,
        }}
        {...props}
      >
        {/* Physical 3D Cardstock / Metallic Edge Thickness */}
        <div
          className="k21-card-thickness absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{
            background: thicknessBackground,
            borderBottom: !isLightTheme && activeTheme.innerEdge ? `1px solid ${activeTheme.innerEdge}` : undefined,
          }}
        />

        {/* Physical 3D Slab Edge (Theme Border, Cast Shadows & Bevel) */}
        <div
          className="k21-card-slab-edge absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{
            border: effectiveBorder || undefined,
          }}
        />

        {/* ── Main Face Plate (Material Texture, Studio Lighting, Recessed Frame) ── */}
        <div
          className="k21-card-faceplate absolute inset-[1.5px] rounded-[inherit] overflow-hidden flex items-center justify-center"
          style={{
            background: disabled ? '#1e293b' : cardBg,
            boxShadow: isLightTheme
              ? 'inset 0 1px 1px 0 rgba(255,255,255,0.85), inset 0 -1px 2px 0 rgba(0,0,0,0.16)'
              : 'inset 0 1px 1px 0 rgba(255,255,255,0.2), inset 0 -1.5px 3px 0 rgba(0,0,0,0.65)',
          }}
        >
          {/* Subtle Playing-Card Linen / Brushed Satin Texture */}
          <div
            className={`absolute inset-0 pointer-events-none k21-card-linen-grain ${
              isLightTheme ? 'opacity-45' : 'opacity-80'
            }`}
          />

          {/* Directional Studio Lighting & Edge Depth Vignette */}
          <div
            className={`absolute inset-0 pointer-events-none k21-card-studio-lighting ${
              isLightTheme ? 'opacity-50' : 'opacity-95'
            }`}
          />

          {/* Recessed Double Casino Frame */}
          <div
            className="absolute inset-[3px] rounded-lg pointer-events-none border transition-colors duration-300"
            style={{
              borderColor: selected ? 'rgba(251, 191, 36, 0.72)' : innerEdgeColor,
            }}
          >
            {/* Secondary hairline metallic inner bevel */}
            {size !== 'xs' && (
              <div
                className="absolute inset-[2px] rounded-[6px] border pointer-events-none"
                style={{
                  borderColor: innerEdgeColor,
                  opacity: isLightTheme ? 0.25 : 0.32,
                }}
              />
            )}

            {/* Theme-matched corner flourishes */}
            <div
              className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l"
              style={{ borderColor: innerEdgeColor, opacity: isLightTheme ? 0.5 : 0.75 }}
            />
            <div
              className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r"
              style={{ borderColor: innerEdgeColor, opacity: isLightTheme ? 0.5 : 0.75 }}
            />
            <div
              className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l"
              style={{ borderColor: innerEdgeColor, opacity: isLightTheme ? 0.5 : 0.75 }}
            />
            <div
              className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r"
              style={{ borderColor: innerEdgeColor, opacity: isLightTheme ? 0.5 : 0.75 }}
            />
          </div>

          {/* Dynamic Specular Light Reflection Follower */}
          <div className="k21-card-specular-glare absolute inset-0 rounded-[inherit] pointer-events-none" />

          {/* Holographic Sheen Sweep (when selected or key) */}
          {(selected || isKey) && (
            <div className="absolute inset-0 rounded-[inherit] pointer-events-none overflow-hidden">
              <div className="k21-card-holographic-sweep absolute inset-0" />
            </div>
          )}

          {/* ── TOP-LEFT CORNER (Embossed Rank + Beveled Suit) ── */}
          <div
            className={`absolute ${cornerTopLeftClass} flex flex-col items-center leading-none z-10 font-bold pointer-events-none`}
            style={{ color: suitColor }}
          >
            <span
              className="tracking-tight text-[11px] sm:text-xs md:text-sm font-black"
              style={{
                fontFamily: fontOption.fontFamily,
                textShadow: rankTextShadow,
              }}
            >
              {rank}
            </span>
            <div className="mt-0.5 flex items-center justify-center">
              <TacticalSuitIcon suit={suit} size="0.8em" faceted={false} color={suitColor} />
            </div>
          </div>

          {/* ── CENTER SCULPTED 3D EMBLEM ── */}
          <div className="flex flex-col items-center justify-center relative z-10 w-full h-full my-auto pointer-events-none">
            {/* Suit-matched Ambient Backlight Aura */}
            <div
              className="absolute w-9 h-9 sm:w-14 sm:h-14 rounded-full blur-md"
              style={{
                backgroundColor: suitColor,
                opacity: isLightTheme ? 0.08 : 0.22,
              }}
            />

            {/* Recessed Luxury Medallion Crest */}
            <div
              className="absolute w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border flex items-center justify-center"
              style={{
                borderColor: innerEdgeColor,
                opacity: isLightTheme ? 0.24 : 0.38,
              }}
            >
              <div
                className={`w-5 h-5 sm:w-8 sm:h-8 border ${
                  isCourtCard || isAce ? 'rotate-45 rounded-sm' : 'rounded-full border-dashed'
                }`}
                style={{
                  borderColor: innerEdgeColor,
                  opacity: isCourtCard || isAce ? 0.85 : 0.65,
                }}
              />
            </div>

            {/* Ace Strategic Crest Label */}
            {isAce && (
              <div
                className="absolute -top-3.5 sm:-top-4 text-[8px] sm:text-[9px] font-['Cinzel'] font-black tracking-widest uppercase"
                style={{
                  color: suitColor,
                  opacity: 0.92,
                  textShadow: rankTextShadow,
                }}
              >
                AS
              </div>
            )}

            {/* Main 3D Sculpted Suit Emblem */}
            <div
              className={`relative transform-gpu transition-transform duration-300 group-hover:scale-110 ${centerSuitDropShadow}`}
            >
              <TacticalSuitIcon
                suit={suit}
                size={
                  size === 'xs'
                    ? '1.15em'
                    : size === 'sm'
                    ? '1.6em'
                    : size === 'lg'
                    ? '2.9em'
                    : 'clamp(1.5rem, 4.7vw, 2.35rem)'
                }
                faceted
                color={suitColor}
              />
            </div>

            {/* High-Impact Tactical Markers (La Buena / La Chica) */}
            {isLaBuena && (
              <div className="absolute -bottom-2 sm:-bottom-2.5 px-1 py-0.2 rounded bg-amber-500/90 text-slate-950 font-['Chakra_Petch'] font-black text-[7px] sm:text-[8px] tracking-wider uppercase shadow-md">
                +2 PTS
              </div>
            )}
            {isLaChica && (
              <div className="absolute -bottom-2 sm:-bottom-2.5 px-1 py-0.2 rounded bg-cyan-400/90 text-slate-950 font-['Chakra_Petch'] font-black text-[7px] sm:text-[8px] tracking-wider uppercase shadow-md">
                +1 PT
              </div>
            )}
          </div>

          {/* ── BOTTOM-RIGHT CORNER (Rotated 180deg: Suit + Rank) ── */}
          <div
            className={`absolute ${cornerBottomRightClass} flex flex-col items-center leading-none z-10 font-bold pointer-events-none rotate-180`}
            style={{
              color: suitColor,
              transform: 'rotate(180deg)',
              transformOrigin: 'center',
            }}
          >
            <span
              className="tracking-tight text-[11px] sm:text-xs md:text-sm font-black"
              style={{
                fontFamily: fontOption.fontFamily,
                textShadow: rankTextShadow,
              }}
            >
              {rank}
            </span>
            <div className="mt-0.5 flex items-center justify-center">
              <TacticalSuitIcon suit={suit} size="0.8em" faceted={false} color={suitColor} />
            </div>
          </div>
        </div>

        {/* ── Tactical Annotation Pill (Tutorials / Mechanics) ── */}
        {annotation && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/95 border border-amber-400/60 text-amber-300 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-['Chakra_Petch'] font-black tracking-tight shadow-[0_4px_12px_rgba(0,0,0,0.8)] z-30 pointer-events-none">
            {annotation}
          </div>
        )}
      </div>
    );
  }
);

TacticalCard3D.displayName = 'TacticalCard3D';
