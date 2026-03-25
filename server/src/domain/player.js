"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlayer = createPlayer;
exports.create1v1Players = create1v1Players;
/**
 * Creates a new player instance with default initial state.
 * @param id - The unique identifier for the player
 * @param name - The display name
 * @param teamId - Optional team identifier
 * @returns A new Player object
 */
function createPlayer(id, name, teamId) {
    return {
        id,
        name,
        hand: [],
        collectedCards: [],
        virados: 0,
        score: 0,
        teamId: teamId
    };
}
function create1v1Players(player1Name, player2Name) {
    return [
        createPlayer('p1', player1Name),
        createPlayer('p2', player2Name),
    ];
}
