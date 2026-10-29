// ─── Theme Registry ──────────────────────────────────────────────────────────
// Maps a theme key (stored in profiles.equipped_theme) to visual properties
// applied to cards and the board.
// Themes are loaded from the public.themes table at app startup.
// The DEFAULT_THEME is the hardcoded fallback when DB is unavailable.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../services/supabase';

export interface CardTheme {
  background: string;
  boxShadow: string;
  boxShadowSelected: string;
  border: string;
  innerEdge: string;
  redSuitColor: string;
  blackSuitColor: string;
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
    themeCache[row.key] = {
      key: row.key,
      name: row.name,
      description: row.description,
      emoji: row.emoji,
      previewColor: row.preview_color,
      cardTheme: row.card_theme as CardTheme,
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
