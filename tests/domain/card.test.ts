import { createCard, getCardValue } from '../../src/domain/card';
import { ErrorCode } from '../../src/domain/types';

describe('Card', () => {
  it('creates a valid card', () => {
    const card = createCard('spades', 'A');
    expect(card.suit).toBe('spades');
    expect(card.rank).toBe('A');
    expect(card.value).toBe(1);
    expect(card.id).toBe('A-spades');
  });

  it('assigns correct values to ranks', () => {
    expect(createCard('hearts', '2').value).toBe(2);
    expect(createCard('diamonds', '10').value).toBe(10);
    expect(createCard('clubs', 'J').value).toBe(11);
    expect(createCard('spades', 'Q').value).toBe(12);
    expect(createCard('hearts', 'K').value).toBe(13);
  });

  it('throws INVALID_CARD for invalid rank', () => {
    expect(() => createCard('spades', '1' as any)).toThrow(ErrorCode.INVALID_CARD);
  });

  it('throws INVALID_CARD for invalid suit', () => {
    expect(() => createCard('stars' as any, 'A')).toThrow(ErrorCode.INVALID_CARD);
  });
});
