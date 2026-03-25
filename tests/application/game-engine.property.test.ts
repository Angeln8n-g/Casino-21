import fc from 'fast-check';
import { DefaultGameEngine } from '../../src/application/game-engine';
import { validateGameState } from '../../src/domain/game-state';

describe('GameEngine Properties', () => {
  it('Property 1: Game initialization creates valid state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('1v1', '2v2'),
        fc.array(fc.string({ minLength: 1 }), { minLength: 4, maxLength: 4 }),
        (mode, names) => {
          const engine = new DefaultGameEngine();
          const pNames = mode === '1v1' ? names.slice(0, 2) : names;
          const result = engine.startNewGame(mode as any, pNames);
          
          if (result.success) {
            // Should pass validateGameState
            expect(() => validateGameState(result.value)).not.toThrow();
          } else {
            // Should never fail with valid names
            expect(result.success).toBe(true);
          }
        }
      )
    );
  });

  // For property tests on actions, it's hard to generate valid sequences of actions without a custom generator.
  // We will test that playCard never throws an exception and always returns a valid Result type, 
  // and if it returns success=true, the new state is valid.
  
  it('Property: Actions preserve state invariants or return error', () => {
    const engine = new DefaultGameEngine();
    
    fc.assert(
      fc.property(
        fc.constantFrom('colocar', 'llevar', 'formar', 'formarPar', 'cantar'),
        fc.string(), // cardId
        fc.array(fc.string()), // boardCardIds
        fc.array(fc.string()), // formationIds
        (actionType, cardId, boardCardIds, formationIds) => {
          const initResult = engine.startNewGame('1v1', ['P1', 'P2']);
          if (!initResult.success) return;
          const state = initResult.value;
          const playerId = state.players[state.currentTurnPlayerIndex].id;
          
          // Generate a potentially invalid action
          const action = {
            type: actionType,
            playerId,
            cardId,
            boardCardIds,
            formationIds,
            formationId: formationIds[0] || 'fake'
          } as any;

          const result = engine.playCard(state, action);
          
          if (result.success) {
            // If the random action somehow was valid (e.g. valid cardId and action), 
            // the resulting state must be valid
            expect(() => validateGameState(result.value)).not.toThrow();
          } else {
            // It correctly identified an invalid action
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
