import { serializeGameState, deserializeGameState, CURRENT_VERSION } from '../../src/application/persistence';
import { DefaultGameEngine } from '../../src/application/game-engine';
import { GameState } from '../../src/domain/game-state';

describe('Persistence', () => {
  let engine: DefaultGameEngine;
  let state: GameState;

  beforeEach(() => {
    engine = new DefaultGameEngine();
    const result = engine.startNewGame('1v1', ['Alice', 'Bob']);
    if (result.success) {
      state = result.value;
    }
  });

  it('should serialize and deserialize game state correctly', () => {
    const json = serializeGameState(state);
    expect(typeof json).toBe('string');

    const loadedState = deserializeGameState(json);
    expect(loadedState).toEqual(state);
  });

  it('should fail with invalid JSON', () => {
    expect(() => deserializeGameState('{ invalid json ')).toThrow('Invalid JSON format');
  });

  it('should fail with unsupported version', () => {
    const invalidVersion = {
      version: 999,
      state
    };
    expect(() => deserializeGameState(JSON.stringify(invalidVersion))).toThrow('Unsupported save version: 999');
  });

  it('should fail if state invariants are broken', () => {
    const brokenState = { ...state, players: [] }; // missing players
    const json = JSON.stringify({ version: CURRENT_VERSION, state: brokenState });
    expect(() => deserializeGameState(json)).toThrow(); // validateGameState should throw
  });
});
