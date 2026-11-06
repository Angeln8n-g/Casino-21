import { supabase } from '../services/supabase';

export type ThemeFontKey = 'russo' | 'chakra' | 'cinzel' | 'orbitron';

export interface ThemeFontOption {
  key: ThemeFontKey;
  name: string;
  fontFamily: string;
  category: 'esports' | 'cyber' | 'classic' | 'future';
  sampleText: string;
  description: string;
}

export const THEME_FONTS: Record<ThemeFontKey, ThemeFontOption> = {
  russo: {
    key: 'russo',
    name: 'Russo One',
    fontFamily: 'RussoOne_400Regular',
    category: 'esports',
    sampleText: 'A K Q 10 21',
    description: 'Angulosa, pesada y contundente; la estética oficial de esports de K21.',
  },
  chakra: {
    key: 'chakra',
    name: 'Chakra Petch',
    fontFamily: 'ChakraPetch_700Bold',
    category: 'cyber',
    sampleText: 'A K Q 10 21',
    description: 'Geométrica, militar y de alta precisión táctica.',
  },
  cinzel: {
    key: 'cinzel',
    name: 'Cinzel',
    fontFamily: 'Cinzel_700Bold',
    category: 'classic',
    sampleText: 'A K Q 10 21',
    description: 'Serif romana inspirada en barajas clásicas reales y casinos de lujo.',
  },
  orbitron: {
    key: 'orbitron',
    name: 'Orbitron',
    fontFamily: 'Orbitron_700Bold',
    category: 'future',
    sampleText: 'A K Q 10 21',
    description: 'Sci-fi, pulida y futurista; ideal para tapetes neón y cyber-decks.',
  },
};

export const ALL_THEME_FONTS: ThemeFontOption[] = Object.values(THEME_FONTS);

export function getThemeFont(fontKey?: string | null): ThemeFontOption {
  if (fontKey && fontKey in THEME_FONTS) {
    return THEME_FONTS[fontKey as ThemeFontKey];
  }
  return THEME_FONTS.russo;
}

export interface CardTheme {
  background: string;
  boxShadow?: string;
  boxShadowSelected?: string;
  border?: string;
  innerEdge: string;
  redSuitColor: string;
  blackSuitColor: string;
  fontKey?: ThemeFontKey;
  extraClass?: string;
}

export interface BoardTheme {
  background: string;
  backgroundImage?: string;
  borderColor: string;
  glowColor: string;
  innerRingColor: string;
  overlayGradient?: string;
  watermarkOpacity: number;
}

export interface GameTheme {
  key: string;
  name: string;
  description: string;
  emoji: string;
  previewColor: string;
  cardTheme: CardTheme;
  boardTheme: BoardTheme;
}

export const CLASSIC_THEME: GameTheme = {
  key: 'classic',
  name: 'Baraja Clásica',
  description: 'Diseño tradicional de casino: tapete verde esmeralda, cartas marfil con tipografía romana Cinzel y palos carmesí y carbón.',
  emoji: '🂠',
  previewColor: '#0e4429',
  cardTheme: {
    background: 'linear-gradient(165deg, #ffffff 0%, #fdfcf9 40%, #f1f5f9 100%)',
    boxShadow: '0 10px 20px -6px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08) inset',
    boxShadowSelected: '0 18px 36px -8px rgba(0,0,0,0.45), 0 0 0 2px rgba(234, 179, 8, 0.8) inset',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    innerEdge: 'rgba(203, 213, 225, 0.7)',
    redSuitColor: '#dc2626',
    blackSuitColor: '#0f172a',
    fontKey: 'cinzel',
  },
  boardTheme: {
    background:
      'radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.25) 0%, rgba(5, 46, 22, 0) 65%), linear-gradient(145deg, #0e4429 0%, #072e1a 50%, #041d10 100%)',
    borderColor: '#78350f',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    innerRingColor: 'rgba(234, 179, 8, 0.45)',
    watermarkOpacity: 0.08,
  },
};

export const DEFAULT_THEME: GameTheme = {
  ...CLASSIC_THEME,
  key: 'default',
};

let themeCache: Record<string, GameTheme> = {};

export async function loadThemes(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('is_active', true);
    if (error || !data) return;
    themeCache = {};
    for (const row of data) {
      const cardTheme = (row.card_theme || {}) as CardTheme;
      if (!cardTheme.fontKey) {
        if (
          cardTheme.extraClass?.includes('font-serif') ||
          row.key === 'Vaul' ||
          row.key === 'classic' ||
          row.key === 'default'
        ) {
          cardTheme.fontKey = 'cinzel';
        } else if (cardTheme.extraClass?.includes('font-mono') || row.key === 'neon-dealer') {
          cardTheme.fontKey = 'orbitron';
        } else if (row.key === 'bento-casino') {
          cardTheme.fontKey = 'chakra';
        } else {
          cardTheme.fontKey = 'russo';
        }
      }

      themeCache[row.key] = {
        key: row.key,
        name: row.name,
        description: row.description,
        emoji: row.emoji,
        previewColor: row.preview_color,
        cardTheme,
        boardTheme: row.board_theme as BoardTheme,
      };
    }
  } catch (e) {
    console.warn('Error loading themes on mobile:', e);
  }
}

export function getTheme(key: string | null | undefined): GameTheme {
  if (!key) return DEFAULT_THEME;
  if (key === 'classic') return themeCache['classic'] ?? CLASSIC_THEME;
  if (key === 'default') return themeCache['default'] ?? DEFAULT_THEME;
  return themeCache[key] ?? DEFAULT_THEME;
}

export function getAllThemes(): GameTheme[] {
  return Object.values(themeCache);
}

export function invalidateCache(): void {
  themeCache = {};
}
