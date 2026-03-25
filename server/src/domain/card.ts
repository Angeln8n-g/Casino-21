import { Suit, Rank, ErrorCode } from './types';

/**
 * Represents a playing card in the Casino 21 game.
 */
export interface Card {
  /** Unique identifier for the card (e.g., 'A-spades') */
  readonly id: string;
  /** The suit of the card (spades, hearts, diamonds, clubs) */
  readonly suit: Suit;
  /** The rank of the card (A, 2-10, J, Q, K) */
  readonly rank: Rank;
  /** The numerical value of the card used for gameplay (1-13) */
  readonly value: number;
}

/**
 * Gets the numerical value for a given card rank.
 * @param rank - The rank of the card
 * @returns The numerical value (1-13)
 * @throws Error if the rank is invalid
 */
export function getCardValue(rank: Rank): number {
  switch (rank) {
    case 'A': return 1;
    case 'J': return 11;
    case 'Q': return 12;
    case 'K': return 13;
    default:
      const parsed = parseInt(rank, 10);
      if (isNaN(parsed) || parsed < 2 || parsed > 10) {
        throw new Error(ErrorCode.INVALID_CARD);
      }
      return parsed;
  }
}

export function createCard(suit: Suit, rank: Rank): Card {
  const validSuits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const validRanks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  if (!validSuits.includes(suit) || !validRanks.includes(rank)) {
    throw new Error(ErrorCode.INVALID_CARD);
  }

  return {
    id: `${rank}-${suit}`,
    suit,
    rank,
    value: getCardValue(rank),
  };
}
