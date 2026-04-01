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
  CARD_PROTECTED = 'CARD_PROTECTED',
  INVALID_STATE = 'INVALID_STATE',
  
  // Chat errors
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  MESSAGE_TOO_SHORT = 'MESSAGE_TOO_SHORT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PLAYER_MUTED = 'PLAYER_MUTED',
  INVALID_ROOM = 'INVALID_ROOM',
  
  // Friend errors
  FRIEND_REQUEST_EXISTS = 'FRIEND_REQUEST_EXISTS',
  ALREADY_FRIENDS = 'ALREADY_FRIENDS',
  FRIEND_LIMIT_REACHED = 'FRIEND_LIMIT_REACHED',
  FRIEND_REQUEST_NOT_FOUND = 'FRIEND_REQUEST_NOT_FOUND',
  FRIEND_REQUEST_EXPIRED = 'FRIEND_REQUEST_EXPIRED',
  GAME_INVITATION_EXPIRED = 'GAME_INVITATION_EXPIRED',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  
  // Tournament errors
  TOURNAMENT_FULL = 'TOURNAMENT_FULL',
  TOURNAMENT_NOT_FOUND = 'TOURNAMENT_NOT_FOUND',
  TOURNAMENT_STARTED = 'TOURNAMENT_STARTED',
  ALREADY_JOINED = 'ALREADY_JOINED',
  INVALID_TOURNAMENT_CODE = 'INVALID_TOURNAMENT_CODE',
  
  // Achievement errors
  ACHIEVEMENT_ALREADY_UNLOCKED = 'ACHIEVEMENT_ALREADY_UNLOCKED',
  
  // Moderation errors
  PLAYER_BLOCKED = 'PLAYER_BLOCKED',
  REPORT_ALREADY_FILED = 'REPORT_ALREADY_FILED',
  TEMPORARY_BAN = 'TEMPORARY_BAN',
}
