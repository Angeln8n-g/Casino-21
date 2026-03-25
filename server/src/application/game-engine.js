"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultGameEngine = void 0;
const types_1 = require("../domain/types");
const action_validator_1 = require("./action-validator");
const turn_manager_1 = require("./turn-manager");
const score_calculator_1 = require("./score-calculator");
const deck_1 = require("../domain/deck");
const player_1 = require("../domain/player");
const team_1 = require("../domain/team");
const board_1 = require("../domain/board");
const persistence_1 = require("./persistence");
class DefaultGameEngine {
    validator;
    turnManager;
    scoreCalculator;
    currentState = null;
    constructor(validator = new action_validator_1.DefaultActionValidator(), turnManager = new turn_manager_1.DefaultTurnManager(), scoreCalculator = new score_calculator_1.DefaultScoreCalculator()) {
        this.validator = validator;
        this.turnManager = turnManager;
        this.scoreCalculator = scoreCalculator;
    }
    startNewGame(mode, playerNames) {
        if (mode === '1v1' && playerNames.length !== 2) {
            return { success: false, error: types_1.ErrorCode.INVALID_STATE };
        }
        if (mode === '2v2' && playerNames.length !== 4) {
            return { success: false, error: types_1.ErrorCode.INVALID_STATE };
        }
        let deck = (0, deck_1.shuffle)((0, deck_1.createDeck)());
        let players = [];
        let teams = [];
        if (mode === '1v1') {
            const p1Name = playerNames[0] || 'Jugador 1';
            const p2Name = playerNames[1] || 'Jugador 2';
            const p = (0, player_1.create1v1Players)(p1Name, p2Name);
            players = p;
        }
        else {
            const t1P1Name = playerNames[0] || 'Jugador 1';
            const t1P2Name = playerNames[2] || 'Jugador 3';
            const t2P1Name = playerNames[1] || 'Jugador 2';
            const t2P2Name = playerNames[3] || 'Jugador 4';
            const pt = (0, team_1.create2v2PlayersAndTeams)([t1P1Name, t1P2Name], [t2P1Name, t2P2Name]);
            players = pt.players;
            teams = pt.teams;
        }
        // Deal 4 cards to each player
        const dealtPlayers = players.map(player => {
            const { drawn, remainingDeck } = (0, deck_1.draw)(deck, 4);
            deck = remainingDeck;
            return { ...player, hand: drawn };
        });
        // Place 4 cards on board
        const { drawn: boardCards, remainingDeck } = (0, deck_1.draw)(deck, 4);
        deck = remainingDeck;
        const board = (0, board_1.createBoard)(boardCards);
        const state = {
            id: Math.random().toString(36).substring(2, 9),
            mode,
            phase: 'playing',
            players: dealtPlayers,
            teams,
            board,
            deck,
            currentTurnPlayerIndex: Math.floor(Math.random() * players.length),
            turnCount: 0,
            roundCount: 1,
            lastAction: undefined,
            lastScoreBreakdown: undefined,
            lastPlayerToTakeId: undefined,
            winnerId: undefined
        };
        this.currentState = state;
        return { success: true, value: state };
    }
    playCard(state, action, skipValidation = false) {
        if (!skipValidation) {
            const validation = this.validator.validate(state, action);
            if (!validation.isValid) {
                return { success: false, error: validation.error || types_1.ErrorCode.INVALID_ACTION };
            }
        }
        let newState = { ...state };
        let playerIndex = newState.players.findIndex(p => p.id === action.playerId);
        if (playerIndex === -1) {
            return { success: false, error: types_1.ErrorCode.INVALID_STATE };
        }
        let player = { ...newState.players[playerIndex] };
        // 2. Execute action specific logic
        switch (action.type) {
            case 'colocar':
            case 'botar': {
                const handCards = player.hand || [];
                const cardIndex = handCards.findIndex(c => c.id === action.cardId);
                const card = handCards[cardIndex];
                if (!card)
                    return { success: false, error: types_1.ErrorCode.INVALID_ACTION };
                player.hand = handCards.filter(c => c.id !== action.cardId);
                newState.board = (0, board_1.addCard)(newState.board, card);
                break;
            }
            case 'llevar': {
                const handCards = player.hand || [];
                const cardIndex = handCards.findIndex(c => c.id === action.cardId);
                const card = handCards[cardIndex];
                if (!card)
                    return { success: false, error: types_1.ErrorCode.INVALID_ACTION }; // type guard
                player.hand = handCards.filter(c => c.id !== action.cardId);
                const collectedCards = [card];
                // Take board cards (normal and canted)
                if (action.boardCardIds.length > 0) {
                    // Normal cards
                    const boardCardsToTake = newState.board.cards.filter(c => action.boardCardIds.includes(c.id));
                    collectedCards.push(...boardCardsToTake);
                    newState.board = (0, board_1.removeCards)(newState.board, action.boardCardIds);
                    // Canted cards
                    const cantedCardsToTake = newState.board.cantedCards.filter(c => action.boardCardIds.includes(c.card.id));
                    for (const canted of cantedCardsToTake) {
                        collectedCards.push(canted.card);
                        newState.board = (0, board_1.removeCantedCard)(newState.board, canted.card.id);
                    }
                }
                // Take formations
                if (action.formationIds.length > 0) {
                    for (const formationId of action.formationIds) {
                        const formation = newState.board.formations.find(f => f.id === formationId);
                        if (formation) {
                            collectedCards.push(...formation.cards);
                            newState.board = (0, board_1.removeFormation)(newState.board, formationId);
                        }
                    }
                }
                player.collectedCards = [...(player.collectedCards || []), ...collectedCards];
                // Check for virado (if board is left empty)
                if ((0, board_1.isEmpty)(newState.board)) {
                    // Rule: A virado is awarded only if there are cards remaining in the deck
                    // OR if there are cards remaining in players' hands.
                    if (newState.deck.cards.length > 0 || newState.players.some(p => p.hand.length > 0)) {
                        let removedFromOpponent = false;
                        // Rule 4: If this player gets a virado, we remove one virado from the opponent(s) if they have any.
                        // In 1v1, it's the other player. In 2v2, it's the other team.
                        if (newState.mode === '1v1') {
                            newState.players = newState.players.map(p => {
                                if (p.id !== player.id && p.virados > 0) {
                                    removedFromOpponent = true;
                                    return { ...p, virados: p.virados - 1 };
                                }
                                return p;
                            });
                        }
                        else {
                            newState.teams = newState.teams.map(t => {
                                if (t.id !== player.teamId && t.virados > 0) {
                                    removedFromOpponent = true;
                                    return { ...t, virados: t.virados - 1 };
                                }
                                return t;
                            });
                            // also remove from the player on that team who has a virado to keep it consistent
                            const otherTeamId = newState.teams.find(t => t.id !== player.teamId)?.id;
                            newState.players = newState.players.map(p => {
                                if (p.teamId === otherTeamId && p.virados > 0 && removedFromOpponent) {
                                    // Only remove one virado per team occurrence
                                    return { ...p, virados: p.virados - 1 };
                                }
                                return p;
                            });
                        }
                        // Only add a virado to this player if we DID NOT remove one from the opponent
                        if (!removedFromOpponent) {
                            if (player.virados !== undefined) {
                                player.virados += 1;
                            }
                            else {
                                player.virados = 1;
                            }
                        }
                    }
                }
                // Update the last player to take cards
                newState.lastPlayerToTakeId = action.playerId;
                break;
            }
            case 'formar': {
                const handCards = player.hand || [];
                const cardIndex = handCards.findIndex(c => c.id === action.cardId);
                const card = handCards[cardIndex];
                if (!card)
                    return { success: false, error: types_1.ErrorCode.INVALID_ACTION }; // type guard
                player.hand = handCards.filter(c => c.id !== action.cardId);
                const boardCardsToForm = newState.board.cards.filter(c => action.boardCardIds.includes(c.id));
                newState.board = (0, board_1.removeCards)(newState.board, action.boardCardIds);
                const formationValue = card.value + boardCardsToForm.reduce((sum, c) => sum + c.value, 0);
                const newFormation = {
                    id: Math.random().toString(36).substring(2, 9),
                    cards: [...boardCardsToForm, card],
                    value: formationValue,
                    createdBy: action.playerId,
                    createdAt: newState.turnCount
                };
                newState.board = (0, board_1.addFormation)(newState.board, newFormation);
                break;
            }
            case 'formarPar': {
                const handCards = player.hand || [];
                const cardIndex = handCards.findIndex(c => c.id === action.cardId);
                const card = handCards[cardIndex];
                if (!card)
                    return { success: false, error: types_1.ErrorCode.INVALID_ACTION }; // type guard
                player.hand = handCards.filter(c => c.id !== action.cardId);
                let updatedFormation;
                let formationIdToRemove;
                if (action.formationId) {
                    const formation = newState.board.formations.find(f => f.id === action.formationId);
                    updatedFormation = {
                        ...formation,
                        cards: [...formation.cards, card],
                        createdBy: action.playerId // Usually taking ownership of the par
                    };
                    formationIdToRemove = action.formationId;
                }
                else if (action.boardCardIds && action.boardCardIds.length > 0) {
                    const boardCardsToForm = newState.board.cards.filter(c => action.boardCardIds.includes(c.id));
                    newState.board = (0, board_1.removeCards)(newState.board, action.boardCardIds);
                    updatedFormation = {
                        id: Math.random().toString(36).substring(2, 9),
                        cards: [...boardCardsToForm, card],
                        value: card.value, // or 14 if it's an Ace, but card.value handles it unless it's a sum. Wait, targetValue is sum.
                        createdBy: action.playerId,
                        createdAt: newState.turnCount
                    };
                    // Correct value if it was an Ace taking a 14
                    const targetValue = boardCardsToForm.reduce((sum, c) => sum + c.value, 0);
                    updatedFormation.value = targetValue;
                }
                if (formationIdToRemove) {
                    newState.board = (0, board_1.removeFormation)(newState.board, formationIdToRemove);
                }
                if (updatedFormation) {
                    newState.board = (0, board_1.addFormation)(newState.board, updatedFormation);
                }
                break;
            }
            case 'aumentarFormacion': {
                const handCards = player.hand || [];
                const cardIndex = handCards.findIndex(c => c.id === action.cardId);
                const card = handCards[cardIndex];
                if (!card)
                    return { success: false, error: types_1.ErrorCode.INVALID_ACTION }; // type guard
                player.hand = handCards.filter(c => c.id !== action.cardId);
                const formationIndex = newState.board.formations.findIndex(f => f.id === action.formationId);
                if (formationIndex !== -1) {
                    const formation = newState.board.formations[formationIndex];
                    if (formation) {
                        const newFormation = {
                            ...formation,
                            cards: [...formation.cards, card],
                            value: formation.value + card.value,
                            createdBy: action.playerId, // now owned by this player
                            createdAt: newState.turnCount
                        };
                        const newFormations = [...newState.board.formations];
                        newFormations[formationIndex] = newFormation;
                        newState.board = { ...newState.board, formations: newFormations };
                    }
                }
                break;
            }
            case 'cantar': {
                const handCards = player.hand || [];
                const cardIndex = handCards.findIndex(c => c.id === action.cardId);
                const card = handCards[cardIndex];
                if (!card)
                    return { success: false, error: types_1.ErrorCode.INVALID_ACTION }; // type guard
                player.hand = handCards.filter(c => c.id !== action.cardId);
                newState.board = (0, board_1.addCantedCard)(newState.board, card, action.playerId);
                break;
            }
        }
        newState.players = newState.players.map((p, i) => i === playerIndex ? player : p);
        newState.turnCount += 1;
        newState.lastAction = action.type;
        // 3. Advance turn and check for round end
        if (this.turnManager.isRoundComplete(newState)) {
            if (newState.deck.cards.length > 0) {
                // Start new round
                newState = this.turnManager.startNewRound(newState);
                // Turn goes to the person next to the one who dealt, but TurnManager handles getNextPlayer
                // In our TurnManager, it just does (current + 1) % players.length. We'll stick to that.
            }
            else {
                // End of round and no deck: give remaining board cards to last player who took
                if (!(0, board_1.isEmpty)(newState.board) && newState.lastPlayerToTakeId) {
                    const lastPlayerIndex = newState.players.findIndex(p => p.id === newState.lastPlayerToTakeId);
                    if (lastPlayerIndex !== -1) {
                        const lastPlayer = { ...newState.players[lastPlayerIndex] };
                        const remainingCards = [...newState.board.cards];
                        for (const form of newState.board.formations) {
                            remainingCards.push(...form.cards);
                        }
                        for (const canted of newState.board.cantedCards) {
                            remainingCards.push(canted.card);
                        }
                        lastPlayer.collectedCards = [...(lastPlayer.collectedCards || []), ...remainingCards];
                        newState.players = newState.players.map((p, i) => i === lastPlayerIndex ? lastPlayer : p);
                        // Clear the board
                        newState.board = { cards: [], formations: [], cantedCards: [] };
                    }
                }
                // Calculate score
                const { newState: scoredState, breakdowns } = this.scoreCalculator.calculateRoundScore(newState);
                newState = scoredState;
                // Change phase to scoring and save breakdowns
                newState.phase = 'scoring';
                newState.lastScoreBreakdown = breakdowns;
            }
        }
        else {
            newState.currentTurnPlayerIndex = this.turnManager.getNextPlayer(newState);
        }
        this.currentState = newState;
        return { success: true, value: newState };
    }
    continueToNextRound(state) {
        if (state.phase !== 'scoring') {
            return { success: false, error: types_1.ErrorCode.INVALID_STATE };
        }
        let newState = { ...state };
        // Check for victory
        const winner = this.checkVictory(newState);
        if (winner) {
            newState.phase = 'completed';
            newState.winnerId = winner;
        }
        else {
            // If no one reaches 21, check if anyone did
            let maxScore = -1;
            let possibleWinner = undefined;
            if (newState.mode === '2v2') {
                for (const team of newState.teams) {
                    if (team.score >= 21 && team.score > maxScore) {
                        maxScore = team.score;
                        possibleWinner = team.id;
                    }
                }
            }
            else {
                for (const p of newState.players) {
                    if (p.score >= 21 && p.score > maxScore) {
                        maxScore = p.score;
                        possibleWinner = p.id;
                    }
                }
            }
            if (possibleWinner) {
                newState.phase = 'completed';
                newState.winnerId = possibleWinner;
            }
            else {
                newState = this.reshuffleForNextDeal(newState);
            }
        }
        this.currentState = newState;
        return { success: true, value: newState };
    }
    checkVictory(state) {
        let winnerId;
        let maxScore = 20; // Must be > 20 to win
        if (state.mode === '2v2') {
            for (const team of state.teams) {
                if (team.score > maxScore) {
                    maxScore = team.score;
                    winnerId = team.id;
                }
            }
        }
        else {
            for (const player of state.players) {
                if (player.score > maxScore) {
                    maxScore = player.score;
                    winnerId = player.id;
                }
            }
        }
        return winnerId;
    }
    reshuffleForNextDeal(state) {
        // Gather all cards from everywhere to make a new deck
        let deck = (0, deck_1.shuffle)((0, deck_1.createDeck)());
        // Deal 4 cards to each player
        const dealtPlayers = state.players.map(player => {
            const { drawn, remainingDeck } = (0, deck_1.draw)(deck, 4);
            deck = remainingDeck;
            return { ...player, hand: drawn, collectedCards: [], virados: 0 };
        });
        const teams = state.teams.map(team => ({
            ...team,
            collectedCards: [],
            virados: 0
        }));
        // Place 4 cards on board
        const { drawn: boardCards, remainingDeck } = (0, deck_1.draw)(deck, 4);
        deck = remainingDeck;
        const board = (0, board_1.createBoard)(boardCards);
        return {
            ...state,
            phase: 'playing',
            players: dealtPlayers,
            teams,
            board,
            deck,
            roundCount: state.roundCount + 1,
            // We keep the turn index where it was or advance it for the next dealer
            currentTurnPlayerIndex: (state.currentTurnPlayerIndex + 1) % state.players.length,
            turnCount: 0,
            lastAction: undefined,
            lastScoreBreakdown: undefined
        };
    }
    getCurrentState() {
        return this.currentState;
    }
    getValidActions(state, playerId) {
        return this.validator.getValidActions(state, playerId);
    }
    saveGame(state) {
        return (0, persistence_1.serializeGameState)(state);
    }
    loadGame(json) {
        try {
            const state = (0, persistence_1.deserializeGameState)(json);
            this.currentState = state;
            return { success: true, value: state };
        }
        catch (e) {
            return { success: false, error: types_1.ErrorCode.INVALID_STATE };
        }
    }
}
exports.DefaultGameEngine = DefaultGameEngine;
