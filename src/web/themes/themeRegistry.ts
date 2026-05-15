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
