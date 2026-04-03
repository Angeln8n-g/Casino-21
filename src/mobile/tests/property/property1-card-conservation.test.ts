// Feature: react-native-game-migration, Property 1: Conservación de 52 cartas

import * as fc from 'fast-check';
import { DefaultGameEngine } from '../../../application/game-engine';
import { GameState } from '../../../domain/game-state';
import { Card } from '../../../domain/card';

/**
 * Counts all cards present in a game state across every location:
 * deck + board (loose cards + formation cards + canted cards) +
 * player hands + player collected cards + team collected cards
 */
function countAllCards(state: GameState): number {
  let total = 0;

  // Deck
  total += state.deck.cards.length;

  // Board: loose cards
  total += state.board.cards.length;

  // Board: formation cards
  for (const formation of state.board.formations) {
    total += formation.cards.length;
  }

  // Board: canted cards
  total += state.board.cantedCards.length;

  // Players: hand + collected
  for (const player of state.players) {
    total += player.hand.length;
    total += player.collectedCards.length;
  }

  // Teams: collected cards (2v2 mode)
  for (const team of state.teams) {
    total += team.collectedCards.length;
  }

  return total;
}

/**
 * Collects all card IDs from every location in the state to check uniqueness.
 */
function collectAllCardIds(state: GameState): string[] {
  const ids: string[] = [];

  ids.push(...state.deck.cards.map((c: Card) => c.id));
  ids.push(...state.board.cards.map((c: Card) => c.id));

  for (const formation of state.board.formations) {
    ids.push(...formation.cards.map((c: Card) => c.id));
  }

  for (const canted of state.board.cantedCards) {
    ids.push(canted.card.id);
  }

  for (const player of state.players) {
    ids.push(...player.hand.map((c: Card) => c.id));
    ids.push(...player.collectedCards.map((c: Card) => c.id));
  }

  for (const team of state.teams) {
    ids.push(...team.collectedCards.map((c: Card) => c.id));
  }

  return ids;
}

describe('Property 1: Conservación de 52 cartas', () => {
  // **Validates: Requirements 1.4**

  it('el estado inicial de un juego 1v1 contiene exactamente 52 cartas', () => {
    const engine = new DefaultGameEngine();
    const result = engine.startNewGame('1v1', ['Alice', 'Bob']);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(countAllCards(result.value)).toBe(52);
    }
  });

  it('el estado inicial de un juego 2v2 contiene exactamente 52 cartas', () => {
    const engine = new DefaultGameEngine();
    const result = engine.startNewGame('2v2', ['Alice', 'Bob', 'Carol', 'Dave']);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(countAllCards(result.value)).toBe(52);
    }
  });

  it('conserva 52 cartas tras aplicar acciones aleatorias válidas en modo 1v1', () => {
    // **Validates: Requirements 1.4**
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // número de turnos a simular
        (numTurns) => {
          const engine = new DefaultGameEngine();
          const startResult = engine.startNewGame('1v1', ['Alice', 'Bob']);
          if (!startResult.success) return true; // skip if can't start

          let state: GameState = startResult.value;

          for (let i = 0; i < numTurns; i++) {
            // Stop if game is no longer in playing phase
            if (state.phase !== 'playing') break;

            const currentPlayer = state.players[state.currentTurnPlayerIndex];
            const validActions = engine.getValidActions(state, currentPlayer.id);

            if (validActions.length === 0) break;

            // Pick the first valid action deterministically
            const action = validActions[0];
            const result = engine.playCard(state, action);

            if (!result.success) break;
            state = result.value;

            // The invariant: total cards must always be 52
            const total = countAllCards(state);
            if (total !== 52) return false;
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('conserva 52 cartas tras aplicar acciones aleatorias válidas en modo 2v2', () => {
    // **Validates: Requirements 1.4**
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (numTurns) => {
          const engine = new DefaultGameEngine();
          const startResult = engine.startNewGame('2v2', ['Alice', 'Bob', 'Carol', 'Dave']);
          if (!startResult.success) return true;

          let state: GameState = startResult.value;

          for (let i = 0; i < numTurns; i++) {
            if (state.phase !== 'playing') break;

            const currentPlayer = state.players[state.currentTurnPlayerIndex];
            const validActions = engine.getValidActions(state, currentPlayer.id);

            if (validActions.length === 0) break;

            const action = validActions[0];
            const result = engine.playCard(state, action);

            if (!result.success) break;
            state = result.value;

            const total = countAllCards(state);
            if (total !== 52) return false;
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('no hay cartas duplicadas en ningún estado de juego válido', () => {
    // **Validates: Requirements 1.4**
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 15 }),
        (numTurns) => {
          const engine = new DefaultGameEngine();
          const startResult = engine.startNewGame('1v1', ['Alice', 'Bob']);
          if (!startResult.success) return true;

          let state: GameState = startResult.value;

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

          // Check uniqueness: no card ID should appear more than once
          const ids = collectAllCardIds(state);
          const uniqueIds = new Set(ids);
          return ids.length === uniqueIds.size && ids.length === 52;
        }
      ),
      { numRuns: 10 }
    );
  });
});
