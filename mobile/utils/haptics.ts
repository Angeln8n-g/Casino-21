import { Vibration, Platform } from 'react-native';

export type HapticType = 'success' | 'error' | 'light' | 'card_tap';

export const triggerHaptic = (type: HapticType) => {
  if (Platform.OS === 'web') {
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
          window.navigator.vibrate(5);
          break;
        default:
          window.navigator.vibrate(10);
      }
    }
    return;
  }

  switch (type) {
    case 'success':
      Vibration.vibrate([0, 15, 30, 15]);
      break;
    case 'error':
      Vibration.vibrate([0, 50, 50, 50]);
      break;
    case 'light':
      Vibration.vibrate(10);
      break;
    case 'card_tap':
      Vibration.vibrate(5);
      break;
    default:
      Vibration.vibrate(10);
  }
};
