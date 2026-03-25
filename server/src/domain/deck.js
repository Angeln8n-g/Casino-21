"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeck = createDeck;
exports.shuffle = shuffle;
exports.draw = draw;
const card_1 = require("./card");
const types_1 = require("./types");
function createDeck() {
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const cards = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            cards.push((0, card_1.createCard)(suit, rank));
        }
    }
    return { cards };
}
function shuffle(deck) {
    const newCards = [...deck.cards];
    for (let i = newCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = newCards[i];
        if (temp && newCards[j]) {
            newCards[i] = newCards[j];
            newCards[j] = temp;
        }
    }
    return { cards: newCards };
}
function draw(deck, count) {
    if (count < 0) {
        throw new Error(types_1.ErrorCode.INVALID_ACTION);
    }
    if (count > deck.cards.length) {
        throw new Error(types_1.ErrorCode.DECK_EMPTY);
    }
    if (count === 0) {
        return {
            drawn: [],
            remainingDeck: deck
        };
    }
    // Draw from the "top" of the deck, which we'll consider the start of the array
    // Or "end" of array is more efficient. Let's draw from the end (top = end)
    const drawn = deck.cards.slice(-count).reverse();
    const remainingCards = deck.cards.slice(0, -count);
    return {
        drawn,
        remainingDeck: { cards: remainingCards }
    };
}
