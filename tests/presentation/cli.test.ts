import { DefaultGameEngine } from '../../src/application/game-engine';

describe('Integration - Game Flow', () => {
  it('should be able to play a full short game sequence', () => {
    const engine = new DefaultGameEngine();
    const result = engine.startNewGame('1v1', ['Alice', 'Bob']);
    expect(result.success).toBe(true);
    
    if (!result.success) return;
    let state = result.value;

    // Just play a few valid actions to see if the engine advances without errors
    for (let i = 0; i < 4; i++) {
      const currentPlayer = state.players[state.currentTurnPlayerIndex];
      const validActions = engine.getValidActions(state, currentPlayer.id);
      
      expect(validActions.length).toBeGreaterThan(0);
      
      const playResult = engine.playCard(state, validActions[0]);
      expect(playResult.success).toBe(true);
      
      if (playResult.success) {
        state = playResult.value;
      }
    }

    expect(state.turnCount).toBeGreaterThan(0);
  });
});
