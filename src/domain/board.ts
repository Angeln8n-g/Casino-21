import { Card } from './card';

/**
 * Represents a group of cards combined to match a specific value.
 */
export interface Formation {
  /** Unique identifier for the formation */
  readonly id: string;
  /** Cards that make up this formation */
  readonly cards: readonly Card[];
  /** The target value of the formation */
  readonly value: number;
  /** ID of the player who created the formation */
  readonly createdBy: string;
  /** Turn number when the formation was created */
  readonly createdAt: number;
}

/**
 * Represents a card that has been "canted" (protected) by a player.
 */
export interface CantedCard {
  /** The protected card (usually an Ace) */
  readonly card: Card;
  /** ID of the player who canted the card */
  readonly cantedBy: string;
  /** The turn number until which this card is protected from being taken by others */
  readonly protectedUntilTurn: number;
}

/**
 * Represents the play area where cards are placed, formed, or canted.
 */
export interface Board {
  /** Loose cards currently on the board */
  readonly cards: readonly Card[];
  /** Formations currently active on the board */
  readonly formations: readonly Formation[];
  /** Canted cards currently protected on the board */
  readonly cantedCards: readonly CantedCard[];
}

/**
 * Creates a new board instance.
 */
export function createBoard(
  cards: readonly Card[] = [],
  formations: readonly Formation[] = [],
  cantedCards: readonly CantedCard[] = []
): Board {
  return { cards, formations, cantedCards };
}

export function addCard(board: Board, card: Card): Board {
  return {
    ...board,
    cards: [...board.cards, card],
  };
}

export function removeCards(board: Board, cardIds: string[]): Board {
  return {
    ...board,
    cards: board.cards.filter(c => !cardIds.includes(c.id)),
  };
}

export function addFormation(board: Board, formation: Formation): Board {
  return {
    ...board,
    formations: [...board.formations, formation],
  };
}

export function removeFormation(board: Board, formationId: string): Board {
  return {
    ...board,
    formations: board.formations.filter(f => f.id !== formationId),
  };
}

export function addCantedCard(board: Board, cantedCard: CantedCard): Board {
  return {
    ...board,
    cantedCards: [...board.cantedCards, cantedCard],
  };
}

export function removeCantedCard(board: Board, cardId: string): Board {
  return {
    ...board,
    cantedCards: board.cantedCards.filter(c => c.card.id !== cardId),
  };
}

export function isEmpty(board: Board): boolean {
  return board.cards.length === 0 && board.formations.length === 0 && board.cantedCards.length === 0;
}
