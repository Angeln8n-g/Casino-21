import { Card, createCard } from './card';
import { Suit, Rank, ErrorCode } from './types';

export interface Deck {
  readonly cards: readonly Card[];
}

export function createDeck(): Deck {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const cards: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      cards.push(createCard(suit, rank));
    }
  }

  return { cards };
}

export function shuffle(deck: Deck): Deck {
  const newCards = [...deck.cards];
  for (let i = newCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = newCards[i];
    if (temp && newCards[j]) {
      newCards[i] = newCards[j] as Card;
      newCards[j] = temp;
    }
  }
  return { cards: newCards };
}

export function draw(deck: Deck, count: number): { drawn: Card[], remainingDeck: Deck } {
  if (count < 0) {
    throw new Error(ErrorCode.INVALID_ACTION);
  }
  if (count > deck.cards.length) {
    throw new Error(ErrorCode.DECK_EMPTY);
  }

  if (count === 0) {
    return {
      drawn: [],
      remainingDeck: deck
    };
  }

  // Draw from the "top" of the deck, which we'll consider the start of the array
  // Or "end" of array is more efficient. Let's draw from the end (top = end)
  const drawn = deck.cards.slice(-count).reverse();
  const remainingCards = deck.cards.slice(0, -count);

  return {
    drawn,
    remainingDeck: { cards: remainingCards }
  };
}
