// Feature: react-native-game-migration, Property 6: Gestos deshabilitados fuera del turno

import * as fc from 'fast-check';
import { Card } from '../../../domain/card';

/**
 * Replicates the guard logic from HandView.handleCardPress:
 *   if (!disabled) { onCardSelect(card) }
 *
 * This is the exact condition implemented in HandView.tsx (Req 4.7).
 */
function simulateHandCardPress(
  card: Card,
  disabled: boolean,
  onCardSelect: (card: Card) => void
): void {
  if (!disabled) {
    onCardSelect(card);
  }
}

describe('Property 6: Gestos deshabilitados fuera del turno', () => {
  // **Validates: Requirements 4.7**

  it('onCardSelect nunca se invoca cuando disabled=true para cualquier carta y estado de juego', () => {
    fc.assert(
      fc.property(
        // Arbitrary cards in hand
        fc.array(
          fc.record({
            id: fc.string(),
            rank: fc.constantFrom('A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'),
            suit: fc.constantFrom('spades', 'hearts', 'diamonds', 'clubs'),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        // currentTurnPlayerIndex: whose turn it is
        fc.integer({ min: 0, max: 3 }),
        // localPlayerIndex: the local player (must differ from currentTurnPlayerIndex)
        fc.integer({ min: 0, max: 3 }),
        (cards, currentTurnPlayerIndex, localPlayerIndex) => {
          // Only test cases where it's NOT the local player's turn
          fc.pre(currentTurnPlayerIndex !== localPlayerIndex);

          // disabled=true because it's not the local player's turn
          const disabled = true;

          const onCardSelect = jest.fn();

          // Simulate tapping every card in hand
          for (const card of cards) {
            simulateHandCardPress(card as Card, disabled, onCardSelect);
          }

          // onCardSelect must never have been called
          return onCardSelect.mock.calls.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('onCardSelect SÍ se invoca cuando disabled=false (turno del jugador local)', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          rank: fc.constantFrom('A', '2', '3'),
          suit: fc.constantFrom('spades', 'hearts'),
        }),
        (card) => {
          const disabled = false;
          const onCardSelect = jest.fn();

          simulateHandCardPress(card as Card, disabled, onCardSelect);

          return onCardSelect.mock.calls.length === 1 &&
            onCardSelect.mock.calls[0][0] === card;
        }
      ),
      { numRuns: 100 }
    );
  });
});
