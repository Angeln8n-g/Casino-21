import { Card } from './card';

/**
 * Represents a player in the game.
 */
export interface Player {
  /** Unique identifier for the player */
  readonly id: string;
  /** Display name of the player */
  readonly name: string;
  /** Current cards held by the player */
  readonly hand: readonly Card[];
  /** Cards won by the player during gameplay */
  readonly collectedCards: readonly Card[];
  /** Number of times the player has cleared the board (virados) */
  readonly virados: number;
  /** Current score accumulated by the player */
  readonly score: number;
  /** Optional team identifier if playing in 2v2 mode */
  readonly teamId?: string;
}

/**
 * Creates a new player instance with default initial state.
 * @param id - The unique identifier for the player
 * @param name - The display name
 * @param teamId - Optional team identifier
 * @returns A new Player object
 */
export function createPlayer(id: string, name: string, teamId?: string): Player {
  return {
    id,
    name,
    hand: [],
    collectedCards: [],
    virados: 0,
    score: 0,
    teamId: teamId
  } as unknown as Player;
}

export function create1v1Players(player1Name: string, player2Name: string): [Player, Player] {
  return [
    createPlayer('p1', player1Name),
    createPlayer('p2', player2Name),
  ];
}
