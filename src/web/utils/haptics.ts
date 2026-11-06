export type HapticType =
  | 'success'
  | 'error'
  | 'light'
  | 'card_tap'
  | 'card_move'
  | 'formation'
  | 'virado'
  | 'virado_out';

export const triggerHaptic = (type: HapticType) => {
  if (typeof window !== 'undefined') {
    // Neutralize physical vibration for users with reduced motion preferences
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (window.navigator && window.navigator.vibrate) {
      switch (type) {
        case 'virado':
          window.navigator.vibrate([60, 50, 90, 50, 150]);
          break;
        case 'virado_out':
          window.navigator.vibrate([70, 60, 40]);
          break;
        case 'formation':
          window.navigator.vibrate([25, 45, 35]);
          break;
        case 'card_move':
          window.navigator.vibrate(28);
          break;
        case 'card_tap':
          window.navigator.vibrate(15);
          break;
        case 'success':
          window.navigator.vibrate([25, 40, 35]);
          break;
        case 'error':
          window.navigator.vibrate([55, 50, 55]);
          break;
        case 'light':
        default:
          window.navigator.vibrate(12);
          break;
      }
    }
  }
};
