// ─── Theme Registry ──────────────────────────────────────────────────────────
// Maps a theme key (stored in profiles.equipped_theme) to visual properties
// applied to cards and the board.
// Themes are loaded from the public.themes table at app startup.
// The DEFAULT_THEME is the hardcoded fallback when DB is unavailable.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../services/supabase';

export type ThemeFontKey = 'russo' | 'chakra' | 'cinzel' | 'orbitron';

export interface ThemeFontOption {
  key: ThemeFontKey;
  name: string;
  fontFamily: string;
  className: string;
  category: 'esports' | 'cyber' | 'classic' | 'future';
  sampleText: string;
  description: string;
}

export const THEME_FONTS: Record<ThemeFontKey, ThemeFontOption> = {
  russo: {
    key: 'russo',
    name: 'Russo One',
    fontFamily: "'Russo One', sans-serif",
    className: "font-['Russo_One']",
    category: 'esports',
    sampleText: 'A K Q 10 21',
    description: 'Angulosa, pesada y contundente; la estética oficial de esports de K21.',
  },
  chakra: {
    key: 'chakra',
    name: 'Chakra Petch',
    fontFamily: "'Chakra Petch', sans-serif",
    className: "font-['Chakra_Petch']",
    category: 'cyber',
    sampleText: 'A K Q 10 21',
    description: 'Geométrica, militar y de alta precisión táctica.',
  },
  cinzel: {
    key: 'cinzel',
    name: 'Cinzel',
    fontFamily: "'Cinzel', serif",
    className: "font-['Cinzel']",
    category: 'classic',
    sampleText: 'A K Q 10 21',
    description: 'Serif romana inspirada en barajas clásicas reales y casinos de lujo.',
  },
  orbitron: {
    key: 'orbitron',
    name: 'Orbitron',
    fontFamily: "'Orbitron', sans-serif",
    className: "font-['Orbitron']",
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
  boxShadow: string;
  boxShadowSelected: string;
  border: string;
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

const DEFAULT_THEME: GameTheme = {
  key: 'default',
  name: 'Arena Táctica',
  description: 'Estética oficial K21: obsidiana 3D, oro campeón y cortes tácticos.',
  emoji: '🃏',
  previewColor: '#0c1220',
  cardTheme: {
    background: 'linear-gradient(155deg, #131b2e 0%, #0d1322 55%, #070b14 100%)',
    boxShadow: 'none',
    boxShadowSelected: 'none',
    border: 'none',
    innerEdge: 'rgba(56, 189, 248, 0.25)',
    redSuitColor: '#FF3366',
    blackSuitColor: '#E2E8F0',
    fontKey: 'russo',
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

let themeCache: Record<string, GameTheme> = {};

export async function loadThemes(): Promise<void> {
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .eq('is_active', true);
  if (error) return;
  themeCache = {};
  for (const row of data) {
    const cardTheme = (row.card_theme || {}) as CardTheme;
    // Infer fontKey if missing from legacy records
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
