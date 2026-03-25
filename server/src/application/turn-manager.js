"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultTurnManager = void 0;
const deck_1 = require("../domain/deck");
const types_1 = require("../domain/types");
class DefaultTurnManager {
    getNextPlayer(state) {
        return (state.currentTurnPlayerIndex + 1) % state.players.length;
    }
    isRoundComplete(state) {
        return state.players.every(player => player.hand.length === 0);
    }
    startNewRound(state) {
        if (!this.isRoundComplete(state)) {
            throw new Error(types_1.ErrorCode.INVALID_STATE);
        }
        let currentDeck = state.deck;
        const newPlayers = state.players.map(player => {
            const { drawn, remainingDeck } = (0, deck_1.draw)(currentDeck, 4);
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
exports.DefaultTurnManager = DefaultTurnManager;
