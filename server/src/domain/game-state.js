"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGameState = validateGameState;
const types_1 = require("./types");
/**
 * Validates the invariants of the game state to ensure correctness.
 * @param state - The game state to validate
 * @returns true if valid, throws Error otherwise
 */
function validateGameState(state) {
    // Validar índice de jugador actual
    if (state.currentTurnPlayerIndex < 0 || state.currentTurnPlayerIndex >= state.players.length) {
        throw new Error(types_1.ErrorCode.INVALID_STATE);
    }
    // Validar puntuaciones no negativas
    for (const player of state.players) {
        if (player.score < 0 || player.virados < 0)
            throw new Error(types_1.ErrorCode.INVALID_STATE);
    }
    for (const team of state.teams) {
        if (team.score < 0 || team.virados < 0)
            throw new Error(types_1.ErrorCode.INVALID_STATE);
    }
    // Validar sumas de formaciones
    for (const formation of state.board.formations) {
        const sum = formation.cards.reduce((acc, card) => acc + card.value, 0);
        // In Casino, a formation's sum must be a multiple of its value (e.g. 9 + (7+2) = 18 which is 9*2)
        // Or exactly its value.
        if (sum % formation.value !== 0 || sum === 0) {
            throw new Error(types_1.ErrorCode.INVALID_STATE);
        }
    }
    // Validar conservación y unicidad de 52 cartas
    const allCardIds = new Set();
    let totalCards = 0;
    const addCards = (cards) => {
        for (const card of cards) {
            if (allCardIds.has(card.id))
                throw new Error(types_1.ErrorCode.INVALID_STATE);
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
        throw new Error(types_1.ErrorCode.INVALID_STATE);
    }
    return true;
}
