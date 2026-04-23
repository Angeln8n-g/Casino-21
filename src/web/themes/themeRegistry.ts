// ─── Theme Registry ──────────────────────────────────────────────────────────
// Maps a theme key (stored in profiles.equipped_theme) to visual properties
// applied to cards and the board. All styling is CSS-in-JS / Tailwind class names.
// The DB only stores the key; the visual definition lives here.
// ─────────────────────────────────────────────────────────────────────────────

export interface CardTheme {
  /** CSS background for the card face */
  background: string;
  /** Box shadow when normal */
  boxShadow: string;
  /** Box shadow when selected */
  boxShadowSelected: string;
  /** Border style */
  border: string;
  /** Inner edge color (inset border) */
  innerEdge: string;
  /** Color for red suits (hearts/diamonds) */
  redSuitColor: string;
  /** Color for black suits (spades/clubs) */
  blackSuitColor: string;
  /** Extra CSS class on the card root (for animations, etc.) */
  extraClass?: string;
}

export interface BoardTheme {
  /** CSS background gradient / color for the board surface */
  background: string;
  /** Outer border color (the thick wooden/metal ring) */
  borderColor: string;
  /** Glow / ring color when a card is hovering */
  glowColor: string;
  /** Decorative inner ring color */
  innerRingColor: string;
  /** Optional overlay gradient on top of the background */
  overlayGradient?: string;
  /** Watermark text opacity (0–1) */
  watermarkOpacity: number;
}

export interface GameTheme {
  key: string;
  name: string;
  description: string;
  emoji: string;
  /** Used in the store preview mini-card */
  previewColor: string;
  cardTheme: CardTheme;
  boardTheme: BoardTheme;
}

// ─── Theme Definitions ────────────────────────────────────────────────────────

const DEFAULT_THEME: GameTheme = {
  key: 'default',
  name: 'Clásico',
  description: 'El estilo original del juego, limpio y elegante.',
  emoji: '🃏',
  previewColor: '#ffffff',
  cardTheme: {
    background: 'linear-gradient(165deg, #ffffff 0%, #f8fafc 35%, #e2e8f0 100%)',
    boxShadow:
      '0 10px 20px -6px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.45) inset, inset 0 2px 6px rgba(255,255,255,0.9)',
    boxShadowSelected:
      '0 22px 40px -10px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.45) inset, inset 0 2px 6px rgba(255,255,255,0.9)',
    border: '1px solid rgba(255,255,255,0.55)',
    innerEdge: 'rgba(148,163,184,0.8)',
    redSuitColor: '#dc2626',
    blackSuitColor: '#111827',
  },
  boardTheme: {
    background:
      'radial-gradient(circle at 50% 20%, rgba(56,189,248,0.2) 0%, rgba(15,23,42,0) 38%), radial-gradient(circle at 50% 100%, rgba(14,116,144,0.25) 0%, rgba(8,47,73,0.05) 45%), linear-gradient(145deg, #0a3258 0%, #07263f 45%, #041a2e 100%)',
    borderColor: '#2A1810',
    glowColor: 'rgba(34,211,238,0.4)',
    innerRingColor: 'rgba(253,224,71,0.35)',
    watermarkOpacity: 0.1,
  },
};

const VAULT_NOIR: GameTheme = {
  key: 'vault_noir',
  name: 'Vault Noir',
  description: 'Casino de lujo. Cartas crema envejecidas sobre terciopelo negro.',
  emoji: '🖤',
  previewColor: '#1a1208',
  cardTheme: {
    background: 'linear-gradient(160deg, #fdf8ee 0%, #f5ead4 50%, #ede1c4 100%)',
    boxShadow:
      '0 10px 28px -6px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,180,130,0.5) inset, inset 0 2px 6px rgba(255,245,220,0.6)',
    boxShadowSelected:
      '0 22px 45px -10px rgba(0,0,0,0.8), 0 0 0 2px rgba(212,180,130,0.7) inset, inset 0 2px 8px rgba(255,245,220,0.8)',
    border: '1px solid rgba(160,120,60,0.6)',
    innerEdge: 'rgba(160,120,60,0.5)',
    redSuitColor: '#8b1a1a',
    blackSuitColor: '#1a0f00',
    extraClass: 'font-serif',
  },
  boardTheme: {
    background:
      'radial-gradient(circle at 40% 30%, rgba(60,30,10,0.9) 0%, rgba(8,5,2,0) 55%), linear-gradient(160deg, #1a0e04 0%, #0f0803 60%, #080502 100%)',
    borderColor: '#5a3a1a',
    glowColor: 'rgba(212,180,100,0.35)',
    innerRingColor: 'rgba(212,175,55,0.3)',
    overlayGradient:
      'linear-gradient(135deg, rgba(180,130,40,0.12) 0%, transparent 40%, transparent 60%, rgba(180,130,40,0.08) 100%)',
    watermarkOpacity: 0.06,
  },
};

const NEON_DEALER: GameTheme = {
  key: 'neon_dealer',
  name: 'Neon Dealer',
  description: 'Cyberpunk neón. Cada palo brilla con su propio color.',
  emoji: '⚡',
  previewColor: '#0d0d1a',
  cardTheme: {
    background: 'linear-gradient(160deg, #0d0d1a 0%, #111128 50%, #0a0a18 100%)',
    boxShadow:
      '0 10px 28px -6px rgba(0,0,0,0.8), 0 0 0 1px rgba(100,80,200,0.4) inset, inset 0 0 12px rgba(80,60,180,0.15)',
    boxShadowSelected:
      '0 22px 45px -10px rgba(80,60,200,0.6), 0 0 0 2px rgba(140,100,255,0.6) inset, 0 0 30px rgba(100,80,220,0.4)',
    border: '1px solid rgba(100,80,200,0.5)',
    innerEdge: 'rgba(100,80,200,0.4)',
    redSuitColor: '#ff2d55',  // neon pink/red for hearts & diamonds
    blackSuitColor: '#00e5ff', // neon cyan for spades & clubs
    extraClass: 'font-mono',
  },
  boardTheme: {
    background:
      'radial-gradient(circle at 50% 30%, rgba(80,40,160,0.35) 0%, rgba(5,5,20,0) 50%), linear-gradient(145deg, #050510 0%, #080820 50%, #030310 100%)',
    borderColor: '#1a1040',
    glowColor: 'rgba(80,60,255,0.5)',
    innerRingColor: 'rgba(80,60,255,0.25)',
    overlayGradient:
      'linear-gradient(135deg, rgba(255,40,80,0.08) 0%, transparent 40%, transparent 60%, rgba(0,200,255,0.08) 100%)',
    watermarkOpacity: 0.08,
  },
};

const GOLD_RUSH: GameTheme = {
  key: 'gold_rush',
  name: 'Gold Rush',
  description: 'Glassmorphism premium. Dorado y cristal sobre fondo oscuro.',
  emoji: '✨',
  previewColor: '#1a1200',
  cardTheme: {
    background:
      'linear-gradient(160deg, rgba(255,245,200,0.18) 0%, rgba(255,215,0,0.08) 50%, rgba(200,160,0,0.12) 100%)',
    boxShadow:
      '0 10px 28px -6px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,215,0,0.35) inset, inset 0 2px 8px rgba(255,220,50,0.15)',
    boxShadowSelected:
      '0 22px 45px -10px rgba(200,150,0,0.55), 0 0 0 2px rgba(255,215,0,0.6) inset, 0 0 40px rgba(255,200,0,0.3)',
    border: '1px solid rgba(255,215,0,0.4)',
    innerEdge: 'rgba(255,215,0,0.3)',
    redSuitColor: '#fbbf24',
    blackSuitColor: '#fef3c7',
    extraClass: 'backdrop-blur-sm',
  },
  boardTheme: {
    background:
      'radial-gradient(circle at 50% 20%, rgba(180,140,0,0.3) 0%, rgba(10,8,0,0) 55%), linear-gradient(145deg, #100d00 0%, #0c0a00 55%, #080600 100%)',
    borderColor: '#3d2e00',
    glowColor: 'rgba(255,215,0,0.45)',
    innerRingColor: 'rgba(255,215,0,0.3)',
    overlayGradient:
      'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, transparent 35%, transparent 65%, rgba(255,215,0,0.08) 100%)',
    watermarkOpacity: 0.07,
  },
};

const BENTO_CASINO: GameTheme = {
  key: 'bento_casino',
  name: 'Bento Casino',
  description: 'Minimalismo Apple. Tarjetas limpias, sombras perfectas, tipografía suave.',
  emoji: '🍱',
  previewColor: '#f5f5f7',
  cardTheme: {
    background: 'linear-gradient(160deg, #ffffff 0%, #fafafa 50%, #f2f2f7 100%)',
    boxShadow:
      '0 8px 24px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
    boxShadowSelected:
      '0 18px 36px -8px rgba(0,0,0,0.22), 0 0 0 2px rgba(0,122,255,0.5)',
    border: '1px solid rgba(0,0,0,0.08)',
    innerEdge: 'rgba(0,0,0,0.04)',
    redSuitColor: '#ff3b30',
    blackSuitColor: '#1d1d1f',
  },
  boardTheme: {
    background: 'linear-gradient(160deg, #1c1c1e 0%, #2c2c2e 50%, #1c1c1e 100%)',
    borderColor: '#3a3a3c',
    glowColor: 'rgba(0,122,255,0.4)',
    innerRingColor: 'rgba(255,255,255,0.1)',
    overlayGradient:
      'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)',
    watermarkOpacity: 0.04,
  },
};

const TACTILE_VEGAS: GameTheme = {
  key: 'tactile_vegas',
  name: 'Tactile Vegas',
  description: 'Efecto clay 3D con colores vibrantes y físicas de rebote.',
  emoji: '🎰',
  previewColor: '#4a1942',
  cardTheme: {
    background: 'linear-gradient(160deg, #f8f0ff 0%, #efe0ff 50%, #e0caff 100%)',
    boxShadow:
      '0 6px 0 #8b5cf6, 0 12px 24px -6px rgba(100,60,180,0.5), inset 0 2px 4px rgba(255,255,255,0.6)',
    boxShadowSelected:
      '0 2px 0 #8b5cf6, 0 6px 20px -4px rgba(100,60,180,0.6), inset 0 2px 4px rgba(255,255,255,0.7)',
    border: '1.5px solid rgba(139,92,246,0.4)',
    innerEdge: 'rgba(139,92,246,0.25)',
    redSuitColor: '#e11d48',
    blackSuitColor: '#5b21b6',
    extraClass: 'font-bold',
  },
  boardTheme: {
    background:
      'radial-gradient(circle at 50% 30%, rgba(120,60,160,0.5) 0%, rgba(30,0,60,0) 60%), linear-gradient(145deg, #2d0f3f 0%, #1a0828 55%, #0f0520 100%)',
    borderColor: '#5b21b6',
    glowColor: 'rgba(139,92,246,0.5)',
    innerRingColor: 'rgba(200,140,255,0.3)',
    overlayGradient:
      'linear-gradient(135deg, rgba(200,100,255,0.1) 0%, transparent 40%, transparent 60%, rgba(100,200,255,0.08) 100%)',
    watermarkOpacity: 0.08,
  },
};

// ─── Registry Map ─────────────────────────────────────────────────────────────

export const THEME_REGISTRY: Record<string, GameTheme> = {
  default: DEFAULT_THEME,
  vault_noir: VAULT_NOIR,
  neon_dealer: NEON_DEALER,
  gold_rush: GOLD_RUSH,
  bento_casino: BENTO_CASINO,
  tactile_vegas: TACTILE_VEGAS,
};

export const ALL_THEMES = Object.values(THEME_REGISTRY);

/** Returns a theme by key, falling back to default if not found */
export function getTheme(key: string | null | undefined): GameTheme {
  if (!key) return DEFAULT_THEME;
  return THEME_REGISTRY[key] ?? DEFAULT_THEME;
}
