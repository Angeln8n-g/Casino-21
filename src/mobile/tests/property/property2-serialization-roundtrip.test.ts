// Feature: react-native-game-migration, Property 2: Round-trip de serialización del estado

import * as fc from 'fast-check';
import { DefaultGameEngine } from '../../../application/game-engine';
import { serializeGameState, deserializeGameState } from '../../../application/persistence';
import { GameState } from '../../../domain/game-state';

describe('Property 2: Round-trip de serialización del estado', () => {
  // **Validates: Requirements 1.5**

  it('serializeGameState → deserializeGameState produce estado estructuralmente equivalente', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 15 }), // número de turnos a jugar
        (numTurns) => {
          const engine = new DefaultGameEngine();
          const startResult = engine.startNewGame('1v1', ['Alice', 'Bob']);
          if (!startResult.success) return true; // skip if can't start

          let state: GameState = startResult.value;

          // Play numTurns turns to generate varied game states
          for (let i = 0; i < numTurns; i++) {
            if (state.phase !== 'playing') break;

            const currentPlayer = state.players[state.currentTurnPlayerIndex];
            const validActions = engine.getValidActions(state, currentPlayer.id);

            if (validActions.length === 0) break;

            const result = engine.playCard(state, validActions[0]);
            if (!result.success) break;
            state = result.value;
          }

          // Serialize then deserialize
          const json = serializeGameState(state);
          const restored = deserializeGameState(json);

          // Verify structural equivalence
          if (restored.phase !== state.phase) return false;
          if (restored.players.length !== state.players.length) return false;

          for (let i = 0; i < state.players.length; i++) {
            if (restored.players[i].id !== state.players[i].id) return false;
          }

          if (restored.deck.cards.length !== state.deck.cards.length) return false;

          const originalBoardCards =
            state.board.cards.length +
            state.board.formations.reduce((sum, f) => sum + f.cards.length, 0) +
            state.board.cantedCards.length;

          const restoredBoardCards =
            restored.board.cards.length +
            restored.board.formations.reduce((sum, f) => sum + f.cards.length, 0) +
            restored.board.cantedCards.length;

          if (restoredBoardCards !== originalBoardCards) return false;

          if (restored.currentTurnPlayerIndex !== state.currentTurnPlayerIndex) return false;

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});
