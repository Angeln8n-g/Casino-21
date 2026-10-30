import { useState, useEffect } from 'react';
import { getTheme, GameTheme, ThemeFontKey } from '../themes/themeRegistry';
import { useAuth } from './useAuth';
import { safeStorage } from '../utils/safeStorage';

const FONT_PREF_KEY = 'k21_preferred_font';

/**
 * Reads player's manual font preference override from safe storage
 */
export function getStoredFontPreference(): ThemeFontKey | null {
  const stored = safeStorage.getItem(FONT_PREF_KEY);
  if (stored === 'russo' || stored === 'chakra' || stored === 'cinzel' || stored === 'orbitron') {
    return stored as ThemeFontKey;
  }
  return null;
}

/**
 * Saves or clears player's manual font preference and dispatches update event
 */
export function setStoredFontPreference(fontKey: ThemeFontKey | null): void {
  if (fontKey) {
    safeStorage.setItem(FONT_PREF_KEY, fontKey);
  } else {
    safeStorage.removeItem(FONT_PREF_KEY);
  }
  window.dispatchEvent(new Event('font_preference_updated'));
}

/**
 * Returns the active GameTheme based on the local player's equipped_theme.
 * If the player has chosen a custom font preference, it overrides the theme's default font.
 */
export function useGameTheme(): GameTheme {
  const { profile } = useAuth();
  const [fontPref, setFontPref] = useState<ThemeFontKey | null>(getStoredFontPreference);

  useEffect(() => {
    const handler = () => {
      setFontPref(getStoredFontPreference());
    };
    window.addEventListener('font_preference_updated', handler);
    return () => window.removeEventListener('font_preference_updated', handler);
  }, []);

  const baseTheme = getTheme(profile?.equipped_theme ?? 'default');

  if (fontPref) {
    return {
      ...baseTheme,
      cardTheme: {
        ...baseTheme.cardTheme,
        fontKey: fontPref,
      },
    };
  }

  return baseTheme;
}
