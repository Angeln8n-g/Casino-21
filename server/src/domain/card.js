"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCardValue = getCardValue;
exports.createCard = createCard;
const types_1 = require("./types");
/**
 * Gets the numerical value for a given card rank.
 * @param rank - The rank of the card
 * @returns The numerical value (1-13)
 * @throws Error if the rank is invalid
 */
function getCardValue(rank) {
    switch (rank) {
        case 'A': return 1;
        case 'J': return 11;
        case 'Q': return 12;
        case 'K': return 13;
        default:
            const parsed = parseInt(rank, 10);
            if (isNaN(parsed) || parsed < 2 || parsed > 10) {
                throw new Error(types_1.ErrorCode.INVALID_CARD);
            }
            return parsed;
    }
}
function createCard(suit, rank) {
    const validSuits = ['spades', 'hearts', 'diamonds', 'clubs'];
    const validRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    if (!validSuits.includes(suit) || !validRanks.includes(rank)) {
        throw new Error(types_1.ErrorCode.INVALID_CARD);
    }
    return {
        id: `${rank}-${suit}`,
        suit,
        rank,
        value: getCardValue(rank),
    };
}
