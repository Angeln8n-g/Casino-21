// Feature: react-native-game-migration, Property 5: Round-trip de preferencias

import * as fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistenceService, UserPreferences } from '../../services/persistenceService';

/**
 * **Validates: Requirements 9.4**
 *
 * Property 5: Round-trip de preferencias
 * Para cualquier UserPreferences arbitrario, savePreferences seguido de
 * getPreferences debe retornar un objeto con los mismos valores.
 */

describe('Property 5: Round-trip de preferencias', () => {
  // **Validates: Requirements 9.4**

  beforeEach(() => {
    // Clear the in-memory AsyncStorage mock store before each test
    (AsyncStorage as any)._store && Object.keys((AsyncStorage as any)._store).forEach((k) => {
      delete (AsyncStorage as any)._store[k];
    });
    jest.clearAllMocks();
  });

  it('savePreferences → getPreferences retorna valores idénticos para preferencias arbitrarias', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record<UserPreferences>({
          soundEnabled: fc.boolean(),
          hapticsEnabled: fc.boolean(),
          volume: fc.float({ min: 0, max: 1 }),
        }),
        async (prefs) => {
          // Clear store for each run to avoid cross-run interference
          const store = (AsyncStorage as any)._store;
          if (store) {
            Object.keys(store).forEach((k) => delete store[k]);
          }

          await persistenceService.savePreferences(prefs);
          const retrieved = await persistenceService.getPreferences();

          expect(retrieved.soundEnabled).toBe(prefs.soundEnabled);
          expect(retrieved.hapticsEnabled).toBe(prefs.hapticsEnabled);
          // Use toBeCloseTo for float comparison to handle floating-point precision
          expect(retrieved.volume).toBeCloseTo(prefs.volume, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});
