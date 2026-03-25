"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultScoreCalculator = void 0;
class DefaultScoreCalculator {
    calculateRoundScore(state) {
        const is2v2 = state.mode === '2v2';
        const entities = is2v2 ? state.teams : state.players;
        // Collect all cards for each entity to calculate majorities
        const entityCollections = entities.map(entity => {
            let collectedCards = [];
            let virados = 0;
            let currentScore = entity.score;
            if (is2v2) {
                const teamPlayers = state.players.filter(p => p.teamId === entity.id);
                teamPlayers.forEach(p => {
                    collectedCards = collectedCards.concat(p.collectedCards);
                    virados += p.virados;
                });
                // Team might also have collected cards directly in some implementations, but usually it's on players
                collectedCards = collectedCards.concat(entity.collectedCards);
                virados += entity.virados;
            }
            else {
                collectedCards = [...entity.collectedCards];
                virados = entity.virados;
            }
            return {
                id: entity.id,
                currentScore,
                cards: collectedCards,
                virados
            };
        });
        // Determine majorities
        let maxCards = -1;
        let entitiesWithMaxCards = [];
        let maxSpades = -1;
        let entitiesWithMaxSpades = [];
        entityCollections.forEach(ec => {
            const cardCount = ec.cards.length;
            if (cardCount > maxCards) {
                maxCards = cardCount;
                entitiesWithMaxCards = [ec.id];
            }
            else if (cardCount === maxCards) {
                entitiesWithMaxCards.push(ec.id);
            }
            const spadesCount = ec.cards.filter(c => c.suit === 'spades').length;
            if (spadesCount > maxSpades) {
                maxSpades = spadesCount;
                entitiesWithMaxSpades = [ec.id];
            }
            else if (spadesCount === maxSpades) {
                entitiesWithMaxSpades.push(ec.id);
            }
        });
        const breakdowns = entityCollections.map(ec => {
            let points = {
                cards: 0,
                spades: 0,
                tenOfDiamonds: 0,
                twoOfSpades: 0,
                aces: 0,
                virados: 0,
                total: 0
            };
            // Base points calculation
            if (entitiesWithMaxCards.length === 1 && entitiesWithMaxCards[0] === ec.id) {
                points.cards = 3;
            }
            if (entitiesWithMaxSpades.length === 1 && entitiesWithMaxSpades[0] === ec.id) {
                points.spades = 1;
            }
            const has10Diamonds = ec.cards.some(c => c.suit === 'diamonds' && c.rank === '10');
            if (has10Diamonds)
                points.tenOfDiamonds = 2;
            const has2Spades = ec.cards.some(c => c.suit === 'spades' && c.rank === '2');
            if (has2Spades)
                points.twoOfSpades = 1;
            const acesCount = ec.cards.filter(c => c.rank === 'A').length;
            points.aces = acesCount;
            points.virados = ec.virados;
            // Apply special rules based on current score
            if (ec.currentScore === 17) {
                points.tenOfDiamonds = 0;
                points.twoOfSpades = 0;
                points.aces = 0;
                points.virados = 0;
            }
            else if (ec.currentScore === 18 || ec.currentScore === 19) {
                points.spades = 0;
                points.tenOfDiamonds = 0;
                points.twoOfSpades = 0;
                points.aces = 0;
                points.virados = 0;
            }
            else if (ec.currentScore === 20) {
                points.cards = 0;
                points.tenOfDiamonds = 0;
                points.twoOfSpades = 0;
                points.aces = 0;
                points.virados = 0;
            }
            points.total = points.cards + points.spades + points.tenOfDiamonds + points.twoOfSpades + points.aces + points.virados;
            return {
                id: ec.id,
                points
            };
        });
        // Apply points to state
        let newPlayers = [...state.players];
        let newTeams = [...state.teams];
        if (is2v2) {
            newTeams = state.teams.map(team => {
                const breakdown = breakdowns.find(b => b.id === team.id);
                return {
                    ...team,
                    score: team.score + (breakdown?.points.total || 0),
                    virados: 0, // Reset virados for next round
                    collectedCards: [] // Reset collected cards
                };
            });
            // Also reset players in teams
            newPlayers = state.players.map(player => ({
                ...player,
                virados: 0,
                collectedCards: []
            }));
        }
        else {
            newPlayers = state.players.map(player => {
                const breakdown = breakdowns.find(b => b.id === player.id);
                return {
                    ...player,
                    score: player.score + (breakdown?.points.total || 0),
                    virados: 0, // Reset virados for next round
                    collectedCards: [] // Reset collected cards
                };
            });
        }
        const newState = {
            ...state,
            players: newPlayers,
            teams: newTeams
        };
        return { breakdowns, newState };
    }
}
exports.DefaultScoreCalculator = DefaultScoreCalculator;
