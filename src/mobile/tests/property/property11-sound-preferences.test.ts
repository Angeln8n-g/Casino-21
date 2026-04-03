// Feature: react-native-game-migration, Property 11: Respeto de preferencias de sonido

import * as fc from 'fast-check';

// Mock expo-av before any imports that might use it
const mockCreateAsync = jest.fn().mockResolvedValue({
  sound: { replayAsync: jest.fn().mockResolvedValue(undefined) },
});

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: mockCreateAsync,
    },
  },
}), { virtual: true });

// Mock persistenceService
jest.mock('../../services/persistenceService', () => ({
  persistenceService: {
    getPreferences: jest.fn(),
  },
}));

import { persistenceService } from '../../services/persistenceService';
import { assetManager, SoundEffect } from '../../services/assetManager';

describe('Property 11: Respeto de preferencias de sonido', () => {
  // **Validates: Requirements 11.6**

  beforeEach(() => {
    jest.clearAllMocks();
    (persistenceService.getPreferences as jest.Mock).mockResolvedValue({
      soundEnabled: false,
      hapticsEnabled: true,
      volume: 1.0,
    });
  });

  it('nunca invoca Audio.Sound.createAsync cuando soundEnabled es false', async () => {
    // **Validates: Requirements 11.6**
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('placeCard' as SoundEffect, 'takeCards' as SoundEffect, 'roundComplete' as SoundEffect),
        async (effect) => {
          jest.clearAllMocks();
          (persistenceService.getPreferences as jest.Mock).mockResolvedValue({
            soundEnabled: false,
            hapticsEnabled: true,
            volume: 1.0,
          });

          await assetManager.playSound(effect);

          expect(mockCreateAsync).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
