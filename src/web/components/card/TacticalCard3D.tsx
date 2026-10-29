import React, { forwardRef, useRef, useImperativeHandle, useCallback } from 'react';
import { TacticalSuitIcon, CardSuit } from './TacticalSuitIcon';
import { CardTheme } from '../../themes/themeRegistry';
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
  customStyle?: {
    cardBg?: string;
    cardBorder?: string;
    redSuitColor?: string;
    blackSuitColor?: string;
  };
  enableTilt?: boolean;
  onClick?: () => void;
}

// Default Arena Táctica Esports palette
const DEFAULT_ESPORTS_THEME: CardTheme = {
  background: 'linear-gradient(155deg, #131b2e 0%, #0d1322 55%, #070b14 100%)',
  boxShadow: 'none',
  boxShadowSelected: 'none',
  border: 'none',
  innerEdge: 'rgba(56, 189, 248, 0.25)',
  redSuitColor: '#FF3366',
  blackSuitColor: '#E2E8F0',
};

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

    const suitColor = isRed
      ? customStyle?.redSuitColor || activeTheme.redSuitColor
      : customStyle?.blackSuitColor || activeTheme.blackSuitColor;

    // Detect high-value strategic cards in K21
    const isLaBuena = rank === '10' && suit === 'diamonds';
    const isLaChica = rank === '2' && suit === 'spades';
    const isAce = rank === 'A';
    const isFaceCard = rank === 'K' || rank === 'Q' || rank === 'J';

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

        // Incline angles (-12 to +12 degrees)
        const tiltX = (0.5 - y) * 16;
        const tiltY = (x - 0.5) * 16;

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
      el.style.setProperty('--card-light-x', '50%');
      el.style.setProperty('--card-light-y', '20%');
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

    // Background calculation
    const cardBg = customStyle?.cardBg || activeTheme.background;

    // ─── Face Down Card (Dorso 3D Esports) ───
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
            k21-card-3d-root relative shrink-0 select-none flex flex-col items-center justify-center
            cursor-pointer overflow-visible transition-all duration-300 transform-gpu touch-manipulation
            ${sizeClasses} ${className}
          `}
          style={{
            transformStyle: 'preserve-3d',
            ...style,
          }}
          {...props}
        >
          {/* 3D Slab Thickness Bevel & Shadow */}
          <div className="k21-card-slab-back absolute inset-0 rounded-[inherit] pointer-events-none" />

          {/* Core Faceplate */}
          <div className="absolute inset-[1.5px] rounded-[inherit] overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#090d16] to-[#04060a] border border-amber-500/30 flex flex-col items-center justify-center">
            {/* Tactical Hex / Carbon Weave Texture */}
            <div className="absolute inset-0 opacity-20 pointer-events-none k21-carbon-weave" />

            {/* Inner Cyber-Etched Frame */}
            <div className="absolute inset-1.5 sm:inset-2 rounded-lg border border-amber-400/25 flex items-center justify-center">
              {/* Concentric Energy Rings */}
              <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full border border-amber-400/20 flex items-center justify-center">
                <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full border border-dashed border-amber-400/30 flex items-center justify-center">
                  <span className="font-['Russo_One'] text-amber-400/80 text-sm sm:text-xl tracking-wider drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)]">
                    21
                  </span>
                </div>
              </div>

              {/* Corner Tech Accents */}
              <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-amber-400/60" />
              <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-amber-400/60" />
              <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-amber-400/60" />
              <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-amber-400/60" />
            </div>

            {/* Dynamic Specular Sheen */}
            <div className="k21-card-specular-glare absolute inset-0 rounded-[inherit] pointer-events-none" />
          </div>
        </div>
      );
    }

    // ─── Face Up Card (3D Slab) ───
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
          transition-transform duration-200 transform-gpu touch-manipulation overflow-visible
          ${sizeClasses}
          ${disabled ? 'opacity-40 cursor-not-allowed filter grayscale-[30%]' : 'cursor-pointer'}
          ${selected ? 'k21-card-selected' : isKey ? 'k21-card-key' : 'k21-card-idle'}
          ${activeTheme.extraClass ?? ''}
          ${className}
        `}
        style={{
          transformStyle: 'preserve-3d',
          ...style,
        }}
        {...props}
      >
        {/* Physical 3D Slab Thickness (Beveled Edge & Cast Shadows) */}
        <div className="k21-card-slab-edge absolute inset-0 rounded-[inherit] pointer-events-none" />

        {/* ── Main Face Plate (Material Texture, Rim, Recessed Chamber) ── */}
        <div
          className="k21-card-faceplate absolute inset-[1.5px] rounded-[inherit] overflow-hidden flex flex-col justify-between p-1.5 sm:p-2"
          style={{
            background: disabled ? '#1e293b' : cardBg,
            boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.15), inset 0 -1px 2px 0 rgba(0,0,0,0.6)',
          }}
        >
          {/* Subtle Cyber / Carbon Micro-Texture */}
          <div className="absolute inset-0 opacity-15 pointer-events-none k21-carbon-weave" />

          {/* Recessed Inner Tactical Border with Chamfered Corners */}
          <div
            className="absolute inset-[3px] rounded-lg pointer-events-none border transition-colors duration-300"
            style={{
              borderColor: selected ? 'rgba(251, 191, 36, 0.5)' : activeTheme.innerEdge,
            }}
          >
            {/* Tech Corner Crosshairs */}
            <div className="absolute top-0.5 left-0.5 w-1 h-1 border-t border-l border-white/20" />
            <div className="absolute top-0.5 right-0.5 w-1 h-1 border-t border-r border-white/20" />
            <div className="absolute bottom-0.5 left-0.5 w-1 h-1 border-b border-l border-white/20" />
            <div className="absolute bottom-0.5 right-0.5 w-1 h-1 border-b border-r border-white/20" />
          </div>

          {/* Dynamic Specular Light Reflection Follower */}
          <div className="k21-card-specular-glare absolute inset-0 rounded-[inherit] pointer-events-none" />

          {/* Holographic Sheen Sweep (when selected or key) */}
          {(selected || isKey) && (
            <div className="absolute inset-0 rounded-[inherit] pointer-events-none overflow-hidden">
              <div className="k21-card-holographic-sweep absolute inset-0" />
            </div>
          )}

          {/* ── TOP-LEFT INDEX (Rank + Tactical Suit) ── */}
          <div
            className="flex flex-col items-start leading-none relative z-10 font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            style={{ color: suitColor }}
          >
            <span className="font-['Russo_One'] tracking-tight text-[11px] sm:text-xs md:text-sm">
              {rank}
            </span>
            <div className="mt-0.5 flex items-center justify-center">
              <TacticalSuitIcon suit={suit} size="0.75em" color={suitColor} />
            </div>
          </div>

          {/* ── CENTER EMBOSSED 3D PIECE ── */}
          <div className="self-center flex-grow flex flex-col items-center justify-center relative z-10 w-full my-auto pointer-events-none">
            {/* Ambient Backlight Aura for the Suit */}
            <div
              className="absolute w-8 h-8 sm:w-14 sm:h-14 rounded-full blur-md opacity-35"
              style={{
                backgroundColor: isRed ? '#F43F5E' : '#38BDF8',
              }}
            />

            {/* Recessed Radar / Energy Ring Watermark */}
            <div className="absolute w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border border-white/10 flex items-center justify-center opacity-60">
              <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full border border-dashed border-white/10" />
            </div>

            {/* Ace / Strategic Badge Halo */}
            {isAce && (
              <div className="absolute -top-3.5 sm:-top-4 text-[8px] sm:text-[9px] font-['Chakra_Petch'] font-black tracking-widest text-amber-400 uppercase opacity-90 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]">
                AS
              </div>
            )}

            {/* The Main 3D Faceted Suit Emblem */}
            <div className="relative transform-gpu transition-transform duration-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)] group-hover:scale-110">
              <TacticalSuitIcon
                suit={suit}
                size={
                  size === 'xs'
                    ? '1.1em'
                    : size === 'sm'
                    ? '1.5em'
                    : size === 'lg'
                    ? '2.8em'
                    : 'clamp(1.4rem, 4.5vw, 2.2rem)'
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

          {/* ── BOTTOM-RIGHT INDEX (Inverted Rank + Tactical Suit) ── */}
          <div
            className="flex flex-col items-end leading-none relative z-10 font-bold rotate-180 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            style={{ color: suitColor }}
          >
            <span className="font-['Russo_One'] tracking-tight text-[11px] sm:text-xs md:text-sm">
              {rank}
            </span>
            <div className="mt-0.5 flex items-center justify-center">
              <TacticalSuitIcon suit={suit} size="0.75em" color={suitColor} />
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
