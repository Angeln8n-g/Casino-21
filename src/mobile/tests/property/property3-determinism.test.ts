// Feature: react-native-game-migration, Property 3: Acciones del motor producen resultados deterministas

import * as fc from 'fast-check';
import { DefaultGameEngine } from '../../../application/game-engine';
import { GameState } from '../../../domain/game-state';
import { serializeGameState } from '../../../application/persistence';

describe('Property 3: Determinismo del motor de juego', () => {
  // **Validates: Requirements 1.2**

  it('aplicar la misma acción al mismo estado produce resultados idénticos', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }), // número de turnos previos para variar el estado
        (numTurns) => {
          const engine = new DefaultGameEngine();
          const startResult = engine.startNewGame('1v1', ['Alice', 'Bob']);
          if (!startResult.success) return true;

          let state: GameState = startResult.value;

          // Avanzar numTurns turnos para obtener un estado variado
          for (let i = 0; i < numTurns; i++) {
            if (state.phase !== 'playing') break;

            const currentPlayer = state.players[state.currentTurnPlayerIndex];
            const validActions = engine.getValidActions(state, currentPlayer.id);

            if (validActions.length === 0) break;

            const action = validActions[0];
            const result = engine.playCard(state, action);

            if (!result.success) break;
            state = result.value;
          }

          if (state.phase !== 'playing') return true;

          // Obtener acciones válidas para el estado actual
          const currentPlayer = state.players[state.currentTurnPlayerIndex];
          const validActions = engine.getValidActions(state, currentPlayer.id);

          if (validActions.length === 0) return true;

          // Tomar la primera acción válida
          const action = validActions[0];

          // Aplicar la MISMA acción al MISMO estado DOS veces
          const result1 = engine.playCard(state, action);
          const result2 = engine.playCard(state, action);

          // Ambas deben tener el mismo éxito/fallo
          if (result1.success !== result2.success) return false;

          if (!result1.success || !result2.success) return true;

          // Comparar los estados resultantes mediante serialización JSON
          const serialized1 = serializeGameState(result1.value);
          const serialized2 = serializeGameState(result2.value);

          return serialized1 === serialized2;
        }
      ),
      { numRuns: 10 }
    );
  });
});
