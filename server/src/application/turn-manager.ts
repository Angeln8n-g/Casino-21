import { GameState } from '../domain/game-state';
import { draw } from '../domain/deck';
import { ErrorCode } from '../domain/types';

export interface TurnManager {
  getNextPlayer(state: GameState): number;
  isRoundComplete(state: GameState): boolean;
  startNewRound(state: GameState): GameState;
}

export class DefaultTurnManager implements TurnManager {
  getNextPlayer(state: GameState): number {
    return (state.currentTurnPlayerIndex + 1) % state.players.length;
  }

  isRoundComplete(state: GameState): boolean {
    return state.players.every(player => player.hand.length === 0);
  }

  startNewRound(state: GameState): GameState {
    if (!this.isRoundComplete(state)) {
      throw new Error(ErrorCode.INVALID_STATE);
    }

    let currentDeck = state.deck;
    const newPlayers = state.players.map(player => {
      const { drawn, remainingDeck } = draw(currentDeck, 4);
      currentDeck = remainingDeck;
      return {
        ...player,
        hand: drawn
      };
    });

    // El jugador que inicia la nueva ronda alterna con cada ronda.
    const newRoundCount = state.roundCount + 1;
    const nextStartPlayerIndex = (state.roundStartPlayerIndex + 1) % state.players.length;

    return {
      ...state,
      deck: currentDeck,
      players: newPlayers,
      roundCount: newRoundCount,
      roundStartPlayerIndex: nextStartPlayerIndex,
      currentTurnPlayerIndex: nextStartPlayerIndex
    };
  }
}
