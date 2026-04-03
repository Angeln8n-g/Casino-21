import { persistenceService } from './persistenceService';

export interface HapticsService {
  impactLight(): void;
  notificationSuccess(): void;
}

class HapticsServiceImpl implements HapticsService {
  impactLight(): void {
    this._trigger('impactLight');
  }

  notificationSuccess(): void {
    this._trigger('notificationSuccess');
  }

  private _trigger(type: 'impactLight' | 'notificationSuccess'): void {
    persistenceService.getPreferences().then((prefs) => {
      if (!prefs.hapticsEnabled) return;
      try {
        // Dynamic import to handle unavailability (e.g. simulator)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Haptics = require('expo-haptics');
        if (type === 'impactLight') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      } catch {
        // expo-haptics not available (simulator or unsupported device) — skip silently
      }
    }).catch(() => {
      // Preferences unavailable — skip silently
    });
  }
}

export const hapticsService: HapticsService = new HapticsServiceImpl();
