import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme, GameTheme, ThemeFontKey, DEFAULT_THEME } from '../themes/themeRegistry';
import { useAuth } from './useAuth';
import { appEvents } from '../utils/events';

const FONT_PREF_KEY = 'k21_preferred_font';

export async function getStoredFontPreference(): Promise<ThemeFontKey | null> {
  try {
    const stored = await AsyncStorage.getItem(FONT_PREF_KEY);
    if (stored === 'russo' || stored === 'chakra' || stored === 'cinzel' || stored === 'orbitron') {
      return stored as ThemeFontKey;
    }
  } catch {}
  return null;
}

export async function setStoredFontPreference(fontKey: ThemeFontKey | null): Promise<void> {
  try {
    if (fontKey) {
      await AsyncStorage.setItem(FONT_PREF_KEY, fontKey);
    } else {
      await AsyncStorage.removeItem(FONT_PREF_KEY);
    }
  } catch {}
  appEvents.emit('font_preference_updated');
}

export function useGameTheme(): GameTheme {
  const { profile } = useAuth();
  const [fontPref, setFontPref] = useState<ThemeFontKey | null>(null);

  useEffect(() => {
    getStoredFontPreference().then(f => setFontPref(f));

    const handler = () => {
      getStoredFontPreference().then(f => setFontPref(f));
    };
    appEvents.on('font_preference_updated', handler);
    return () => {
      appEvents.off('font_preference_updated', handler);
    };
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
