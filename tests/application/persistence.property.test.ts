import fc from 'fast-check';
import { DefaultGameEngine } from '../../src/application/game-engine';
import { serializeGameState, deserializeGameState } from '../../src/application/persistence';

describe('Persistence Properties', () => {
  it('Property 23: Game state serialization round trip', () => {
    // Generate valid game states by starting a new game and possibly applying random actions
    // To simplify, we'll just test the start state with random parameters.
    fc.assert(
      fc.property(
        fc.constantFrom('1v1', '2v2'),
        fc.array(fc.string({ minLength: 1 }), { minLength: 4, maxLength: 4 }),
        (mode, names) => {
          const engine = new DefaultGameEngine();
          const pNames = mode === '1v1' ? names.slice(0, 2) : names;
          const result = engine.startNewGame(mode as any, pNames);
          
          if (result.success) {
            const state = result.value;
            const serialized = serializeGameState(state);
            const deserialized = deserializeGameState(serialized);
            
            // Re-validate state
            expect(deserialized).toEqual(state);
          }
        }
      )
    );
  });
});
