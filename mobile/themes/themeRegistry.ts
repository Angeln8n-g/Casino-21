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

export const DEFAULT_THEME: GameTheme = {
  key: 'default',
  name: 'Arena Táctica',
  description: 'Estética oficial K21: obsidiana 3D, oro campeón y cortes tácticos.',
  emoji: '🃏',
  previewColor: '#0c1220',
  cardTheme: {
    background: '#0d1322',
    innerEdge: 'rgba(56, 189, 248, 0.25)',
    redSuitColor: '#FF3366',
    blackSuitColor: '#E2E8F0',
    fontKey: 'russo',
  },
  boardTheme: {
    background: '#07263f',
    borderColor: '#2A1810',
    glowColor: 'rgba(34,211,238,0.4)',
    innerRingColor: 'rgba(253,224,71,0.35)',
    watermarkOpacity: 0.1,
  },
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
        if (cardTheme.extraClass?.includes('font-serif') || row.key === 'Vaul') {
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
  return themeCache[key] ?? DEFAULT_THEME;
}

export function getAllThemes(): GameTheme[] {
  return Object.values(themeCache);
}

export function invalidateCache(): void {
  themeCache = {};
}
