export type HapticType = 'success' | 'error' | 'light' | 'card_tap';

export const triggerHaptic = (type: HapticType) => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    switch (type) {
      case 'success':
        window.navigator.vibrate([15, 30, 15]);
        break;
      case 'error':
        window.navigator.vibrate([50, 50, 50]);
        break;
      case 'light':
        window.navigator.vibrate(10);
        break;
      case 'card_tap':
        // A very short, crisp vibration for tapping a card
        window.navigator.vibrate(5);
        break;
      default:
        window.navigator.vibrate(10);
    }
  }
};
