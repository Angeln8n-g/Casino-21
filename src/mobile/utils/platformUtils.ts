// Feature: react-native-game-migration
// Requirements: 13.2, 13.3, 13.4, 13.5

import { Platform, ViewStyle } from 'react-native';

/**
 * Returns platform-appropriate shadow styles for cards.
 * iOS uses shadow* props; Android uses elevation.
 */
export function getCardShadowStyle(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }) as ViewStyle;
}

/**
 * Returns the appropriate KeyboardAvoidingView behavior per platform.
 * iOS uses 'padding'; Android uses 'height'.
 */
export function getKeyboardBehavior(): 'padding' | 'height' {
  return Platform.OS === 'ios' ? 'padding' : 'height';
}

/**
 * Returns true if the screen width is considered small (< 375px).
 */
export function isSmallScreen(width: number): boolean {
  return width < 375;
}

/**
 * Returns top/bottom padding based on safe area insets.
 */
export function getSafeAreaPadding(insets: { top: number; bottom: number }): {
  paddingTop: number;
  paddingBottom: number;
} {
  return {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
  };
}
