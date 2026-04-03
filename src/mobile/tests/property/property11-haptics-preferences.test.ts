// Feature: react-native-game-migration, Property 11: Respeto de preferencias de haptics

import * as fc from 'fast-check';

// Mock expo-haptics before any imports that might use it
const mockImpactAsync = jest.fn().mockResolvedValue(undefined);
const mockNotificationAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-haptics', () => ({
  impactAsync: mockImpactAsync,
  ImpactFeedbackStyle: { Light: 'Light' },
  notificationAsync: mockNotificationAsync,
  NotificationFeedbackType: { Success: 'Success' },
}), { virtual: true });

// Mock persistenceService
jest.mock('../../services/persistenceService', () => ({
  persistenceService: {
    getPreferences: jest.fn(),
  },
}));

import { persistenceService } from '../../services/persistenceService';
import { hapticsService } from '../../services/hapticsService';

describe('Property 11: Respeto de preferencias de haptics', () => {
  // **Validates: Requirements 11.7**

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: hapticsEnabled = false
    (persistenceService.getPreferences as jest.Mock).mockResolvedValue({
      soundEnabled: true,
      hapticsEnabled: false,
      volume: 1.0,
    });
  });

  it('nunca invoca expo-haptics cuando hapticsEnabled es false', async () => {
    // **Validates: Requirements 11.7**
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('impactLight' as const, 'notificationSuccess' as const),
        async (method) => {
          jest.clearAllMocks();
          (persistenceService.getPreferences as jest.Mock).mockResolvedValue({
            soundEnabled: true,
            hapticsEnabled: false,
            volume: 1.0,
          });

          if (method === 'impactLight') {
            hapticsService.impactLight();
          } else {
            hapticsService.notificationSuccess();
          }

          // Flush all pending promises/microtasks so _trigger's .then() runs
          await Promise.resolve();
          await Promise.resolve();

          expect(mockImpactAsync).not.toHaveBeenCalled();
          expect(mockNotificationAsync).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('impactLight no invoca expo-haptics cuando hapticsEnabled es false', async () => {
    hapticsService.impactLight();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockImpactAsync).not.toHaveBeenCalled();
    expect(mockNotificationAsync).not.toHaveBeenCalled();
  });

  it('notificationSuccess no invoca expo-haptics cuando hapticsEnabled es false', async () => {
    hapticsService.notificationSuccess();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockImpactAsync).not.toHaveBeenCalled();
    expect(mockNotificationAsync).not.toHaveBeenCalled();
  });
});
