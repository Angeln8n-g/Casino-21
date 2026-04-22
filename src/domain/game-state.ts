import { GameMode, GamePhase, ErrorCode, ScoreBreakdown } from './types';
import { Player } from './player';
import { Team } from './team';
import { Deck } from './deck';
import { Board } from './board';

/**
 * Represents the entire state of a Casino 21 game at a given moment.
 */
export interface GameState {
  /** Unique identifier for the game instance */
  readonly id: string;
  /** Game mode: 1v1 or 2v2 */
  readonly mode: GameMode;
  /** Current phase of the game (e.g., dealing, playing, scoring) */
  readonly phase: GamePhase;
  /** List of all players in the game */
  readonly players: readonly Player[];
  /** List of teams (used primarily in 2v2 mode) */
  readonly teams: readonly Team[];
  /** The current state of the play area */
  readonly board: Board;
  /** The remaining deck of cards */
  readonly deck: Deck;
  /** Index of the player whose turn it is in the `players` array */
  readonly currentTurnPlayerIndex: number;
  /** Total number of turns taken in the current match */
  readonly turnCount: number;
  /** Total number of rounds played */
  readonly roundCount: number;
  /** Index of the player who started the current round (alternates each round) */
  readonly roundStartPlayerIndex: number;
  /** Description of the last action taken (for display purposes) */
  readonly lastAction?: string;
  /** ID of the last player who took cards (llevar) */
  readonly lastPlayerToTakeId?: string;
  /** ID of the winning player or team, if the game is completed */
  readonly winnerId?: string;
  /** Breakdown of the last round's score */
  readonly lastScoreBreakdown?: readonly ScoreBreakdown[];
}

/**
 * Validates the invariants of the game state to ensure correctness.
 * @param state - The game state to validate
 * @returns true if valid, throws Error otherwise
 */
export function validateGameState(state: GameState): boolean {
  // Validar índice de jugador actual
  if (state.currentTurnPlayerIndex < 0 || state.currentTurnPlayerIndex >= state.players.length) {
    throw new Error(ErrorCode.INVALID_STATE);
  }

  // Validar puntuaciones no negativas
  for (const player of state.players) {
    if (player.score < 0 || player.virados < 0) throw new Error(ErrorCode.INVALID_STATE);
  }
  for (const team of state.teams) {
    if (team.score < 0 || team.virados < 0) throw new Error(ErrorCode.INVALID_STATE);
  }

  // Validar sumas de formaciones
  for (const formation of state.board.formations) {
    const sum = formation.cards.reduce((acc, card) => acc + card.value, 0);
    // In Casino, a formation's sum must be a multiple of its value (e.g. 9 + (7+2) = 18 which is 9*2)
    // Or exactly its value.
    if (sum % formation.value !== 0 || sum === 0) {
      throw new Error(ErrorCode.INVALID_STATE);
    }
  }

  // Validar conservación y unicidad de 52 cartas
  const allCardIds = new Set<string>();
  let totalCards = 0;

  const addCards = (cards: readonly { id: string }[]) => {
    for (const card of cards) {
      if (allCardIds.has(card.id)) throw new Error(ErrorCode.INVALID_STATE);
      allCardIds.add(card.id);
      totalCards++;
    }
  };

  addCards(state.deck.cards);
  addCards(state.board.cards);
  
  for (const formation of state.board.formations) {
    addCards(formation.cards);
  }
  
  for (const canted of state.board.cantedCards) {
    addCards([canted.card]);
  }

  for (const player of state.players) {
    addCards(player.hand);
    addCards(player.collectedCards);
  }

  for (const team of state.teams) {
    addCards(team.collectedCards);
  }

  if (totalCards !== 52) {
    throw new Error(ErrorCode.INVALID_STATE);
  }

  return true;
}
