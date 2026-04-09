export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type GameMode = '1v1' | '2v2';

export type GamePhase = 'dealing' | 'playing' | 'scoring' | 'completed';

export interface Points {
  cards: number;
  spades: number;
  tenOfDiamonds: number;
  twoOfSpades: number;
  aces: number;
  virados: number;
  total: number;
}

export interface ScoreBreakdown {
  id: string; // playerId or teamId
  points: Points;
}

export enum ErrorCode {
  INVALID_CARD = 'INVALID_CARD',
  DECK_EMPTY = 'DECK_EMPTY',
  INVALID_ACTION = 'INVALID_ACTION',
  NOT_YOUR_TURN = 'NOT_YOUR_TURN',
  CARD_NOT_IN_HAND = 'CARD_NOT_IN_HAND',
  INVALID_FORMATION_SUM = 'INVALID_FORMATION_SUM',
  FORMATION_NOT_FOUND = 'FORMATION_NOT_FOUND',
  CANNOT_INCREASE_GROUP = 'CANNOT_INCREASE_GROUP',
  CARD_PROTECTED = 'CARD_PROTECTED',
  INVALID_STATE = 'INVALID_STATE',
}
