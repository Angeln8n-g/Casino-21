import fc from 'fast-check';
import { createDeck, shuffle, draw } from '../../src/domain/deck';
import { ErrorCode } from '../../src/domain/types';

describe('Deck', () => {
  it('creates a deck with 52 unique cards', () => {
    const deck = createDeck();
    expect(deck.cards.length).toBe(52);
    
    const ids = new Set(deck.cards.map(c => c.id));
    expect(ids.size).toBe(52);
  });

  it('shuffle changes the order but keeps all 52 cards', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    
    expect(shuffled.cards.length).toBe(52);
    expect(shuffled).not.toEqual(deck); // Might randomly be equal, but very unlikely
    
    const originalIds = new Set(deck.cards.map(c => c.id));
    const shuffledIds = new Set(shuffled.cards.map(c => c.id));
    expect(originalIds).toEqual(shuffledIds);
  });

  it('draw returns requested number of cards and remaining deck', () => {
    const deck = createDeck();
    const { drawn, remainingDeck } = draw(deck, 4);
    
    expect(drawn.length).toBe(4);
    expect(remainingDeck.cards.length).toBe(48);
  });

  it('draw throws INVALID_ACTION for negative count', () => {
    const deck = createDeck();
    expect(() => draw(deck, -1)).toThrow(ErrorCode.INVALID_ACTION);
  });

  it('draw throws DECK_EMPTY for count greater than remaining cards', () => {
    const deck = createDeck();
    expect(() => draw(deck, 53)).toThrow(ErrorCode.DECK_EMPTY);
  });

  describe('Property Tests', () => {
    it('Card conservation invariant: shuffle maintains 52 cards', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10 }), (seed) => {
          let deck = createDeck();
          for (let i = 0; i < seed; i++) {
            deck = shuffle(deck);
          }
          expect(deck.cards.length).toBe(52);
          const ids = new Set(deck.cards.map(c => c.id));
          expect(ids.size).toBe(52);
        })
      );
    });

    it('Card conservation invariant: draw reduces the deck correctly', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 52 }), (count) => {
          const deck = createDeck();
          const { drawn, remainingDeck } = draw(deck, count);
          
          expect(drawn.length).toBe(count);
          expect(remainingDeck.cards.length).toBe(52 - count);
          
          const drawnIds = new Set(drawn.map(c => c.id));
          const remainingIds = new Set(remainingDeck.cards.map(c => c.id));
          
          expect(drawnIds.size + remainingIds.size).toBe(52);
          // Intersection should be empty
          drawnIds.forEach(id => {
            expect(remainingIds.has(id)).toBe(false);
          });
        })
      );
    });
  });
});
