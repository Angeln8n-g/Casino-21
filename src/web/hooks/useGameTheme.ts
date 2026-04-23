import { getTheme, GameTheme } from '../themes/themeRegistry';
import { useAuth } from './useAuth';

/**
 * Returns the active GameTheme based on the local player's equipped_theme.
 * Cards are styled with this theme. The board uses the HOST's theme (resolved
 * separately in GameScreen via the room state).
 */
export function useGameTheme(): GameTheme {
  const { profile } = useAuth();
  return getTheme(profile?.equipped_theme ?? 'default');
}
