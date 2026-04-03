// Feature: react-native-game-migration, Property 8: Actualización de estado sin mutación local

import * as fc from 'fast-check';
import { GameState } from '../../../domain/game-state';
import { gameReducer, initialGameState, GameAction, MobileGameState } from '../../store/gameReducer';

/**
 * Arbitrary for non-SET_GAME_STATE actions.
 */
const nonSetGameStateAction: fc.Arbitrary<GameAction> = fc.oneof(
  fc.string().map((s): GameAction => ({ type: 'SET_LOCAL_PLAYER_ID', payload: s })),
  fc.string().map((s): GameAction => ({ type: 'SET_ERROR', payload: s })),
  fc.constant<GameAction>({ type: 'CLEAR_ERROR' }),
  fc.integer({ min: 0, max: 60 }).map((n): GameAction => ({ type: 'SET_TIME_REMAINING', payload: n })),
  fc.option(fc.string()).map((s): GameAction => ({ type: 'SET_DISCONNECTION_MESSAGE', payload: s })),
);

describe('Property 8: Actualización de estado sin mutación local', () => {
  // **Validates: Requirements 8.2**

  it('gameState permanece null cuando solo se aplican acciones que no son SET_GAME_STATE', () => {
    fc.assert(
      fc.property(
        fc.array(nonSetGameStateAction, { minLength: 0, maxLength: 20 }),
        (actions) => {
          let state = { ...initialGameState };

          for (const action of actions) {
            state = gameReducer(state, action);
            if (state.gameState !== null) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('el reducer no muta el estado anterior (inmutabilidad)', () => {
    fc.assert(
      fc.property(
        fc.array(nonSetGameStateAction, { minLength: 1, maxLength: 20 }),
        (actions) => {
          let state: MobileGameState = { ...initialGameState };

          for (const action of actions) {
            const frozen = Object.freeze({ ...state });
            // If the reducer mutates `frozen`, it will throw in strict mode
            // We also verify the returned state is a new reference
            const nextState = gameReducer(frozen as MobileGameState, action);
            if (nextState === (frozen as MobileGameState)) {
              // Same reference is only acceptable for the default (unknown) action branch
              // All known actions should return a new object
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('SET_GAME_STATE sí actualiza gameState (caso positivo)', () => {
    const mockGameState = { id: 'mock-game' } as unknown as GameState;

    const nextState = gameReducer(initialGameState, {
      type: 'SET_GAME_STATE',
      payload: mockGameState,
    });

    expect(nextState.gameState).toBe(mockGameState);
  });

  it('SET_GAME_STATE con null limpia gameState', () => {
    const stateWithGame: MobileGameState = {
      ...initialGameState,
      gameState: { id: 'some-game' } as unknown as GameState,
    };

    const nextState = gameReducer(stateWithGame, {
      type: 'SET_GAME_STATE',
      payload: null,
    });

    expect(nextState.gameState).toBeNull();
  });
});
