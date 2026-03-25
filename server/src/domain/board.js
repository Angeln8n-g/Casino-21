"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBoard = createBoard;
exports.addCard = addCard;
exports.removeCards = removeCards;
exports.addFormation = addFormation;
exports.removeFormation = removeFormation;
exports.addCantedCard = addCantedCard;
exports.removeCantedCard = removeCantedCard;
exports.isEmpty = isEmpty;
/**
 * Creates a new board instance.
 */
function createBoard(cards = [], formations = [], cantedCards = []) {
    return { cards, formations, cantedCards };
}
function addCard(board, card) {
    return {
        ...board,
        cards: [...board.cards, card],
    };
}
function removeCards(board, cardIds) {
    return {
        ...board,
        cards: board.cards.filter(c => !cardIds.includes(c.id)),
    };
}
function addFormation(board, formation) {
    return {
        ...board,
        formations: [...board.formations, formation],
    };
}
function removeFormation(board, formationId) {
    return {
        ...board,
        formations: board.formations.filter(f => f.id !== formationId),
    };
}
function addCantedCard(board, card, playerId) {
    return {
        ...board,
        cantedCards: [...board.cantedCards, { card, playerId }]
    };
}
function removeCantedCard(board, cardId) {
    return {
        ...board,
        cantedCards: board.cantedCards.filter(c => c.card.id !== cardId),
    };
}
function isEmpty(board) {
    return board.cards.length === 0 && board.formations.length === 0 && board.cantedCards.length === 0;
}
