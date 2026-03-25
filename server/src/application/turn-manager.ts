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

    // IMPORTANTE: Al iniciar un nuevo reparto (mano) dentro de la misma ronda, 
    // el turno DEBE avanzar al siguiente jugador, como si hubiera jugado una carta.
    // Si no avanza, el jugador que tiró la última carta jugaría dos veces seguidas.
    const nextTurnIndex = this.getNextPlayer(state);

    return {
      ...state,
      deck: currentDeck,
      players: newPlayers,
      roundCount: state.roundCount + 1,
      currentTurnPlayerIndex: nextTurnIndex
    };
  }
}
