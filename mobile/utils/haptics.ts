import { Vibration, Platform } from 'react-native';

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
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
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
      return;
    }

    switch (type) {
      case 'virado':
        // Patrón celebratorio intenso de 3 pulsos en crescendo al conseguir un Virado
        Vibration.vibrate([0, 60, 50, 90, 50, 150]);
        break;
      case 'virado_out':
        // Doble pulso descendente cuando se pierde/cancela un virado
        Vibration.vibrate([0, 70, 60, 40]);
        break;
      case 'formation':
        // Doble pulso táctil firme al crear, agrupar, aumentar o seleccionar una formación
        Vibration.vibrate([0, 25, 45, 35]);
        break;
      case 'card_move':
        // Pulso seco al colocar, llevar o soltar una carta en la mesa
        Vibration.vibrate(30);
        break;
      case 'card_tap':
        // Toque corto pero perceptible en motores de vibración Android/iOS
        Vibration.vibrate(18);
        break;
      case 'success':
        Vibration.vibrate([0, 25, 40, 35]);
        break;
      case 'error':
        Vibration.vibrate([0, 55, 50, 55]);
        break;
      case 'light':
      default:
        Vibration.vibrate(15);
        break;
    }
  } catch {
    // Ignorar silenciosamente si el dispositivo no soporta vibración
  }
};
