import { GameState } from '../domain/game-state';
import { GameMode, ErrorCode } from '../domain/types';
import { Action, ActionValidator, DefaultActionValidator, canPartitionIntoSum } from './action-validator';
import { TurnManager, DefaultTurnManager } from './turn-manager';
import { ScoreCalculator, DefaultScoreCalculator } from './score-calculator';
import { createDeck, shuffle, draw } from '../domain/deck';
import { create1v1Players, Player } from '../domain/player';
import { create2v2PlayersAndTeams, Team } from '../domain/team';
import { Board, createBoard, addCard, removeCards, addFormation, removeFormation, addCantedCard, removeCantedCard, isEmpty } from '../domain/board';
import { Card } from '../domain/card';
import { serializeGameState, deserializeGameState } from './persistence';

/** Represents the outcome of an operation, containing either the successful value or an error code */
export type Result<T> = { success: true; value: T } | { success: false; error: ErrorCode };

/**
 * Core orchestrator of the game logic.
 * Manages game initialization, turns, actions, and persistence.
 */
export interface GameEngine {
  /**
   * Starts a new game with the specified mode and players.
   * @param mode - '1v1' or '2v2'
   * @param playerNames - Array of player names (2 for 1v1, 4 for 2v2)
   * @returns A Result containing the initial GameState or an error
   */
  startNewGame(mode: GameMode, playerNames: string[]): Result<GameState>;
  
  /**
   * Processes a player's action during their turn.
   * @param state - The current game state
   * @param action - The action to execute
   * @returns A Result containing the new GameState or an error if invalid
   */
  playCard(state: GameState, action: Action): Result<GameState>;
  
  /**
   * Retrieves the current game state if a game is active.
   * @returns The current GameState or null if no game is running
   */
  getCurrentState(): GameState | null;
  
  /**
   * Gets a list of all valid actions a player can take in the current state.
   * @param state - The current game state
   * @param playerId - The ID of the player to check actions for
   * @returns An array of valid Action objects
   */
  getValidActions(state: GameState, playerId: string): Action[];

  /**
   * Calculates the best automatic action for a player when their turn times out.
   * Priority 1: Take their own formation if possible.
   * Priority 2: Drop the lowest value non-Ace card.
   * Fallback: Drop an Ace.
   * @param state - The current game state
   * @param playerId - The ID of the player
   * @returns An Action to be executed
   */
  getTimeoutAction(state: GameState, playerId: string): Action;
  
  /**
   * Serializes the current game state to a JSON string.
   * @param state - The game state to save
   * @returns A JSON string representation
   */
  saveGame(state: GameState): string;
  
  /**
   * Deserializes a game state from a JSON string and resumes the game.
   * @param json - The JSON string to load
   * @returns A Result containing the loaded GameState or an error
   */
  loadGame(json: string): Result<GameState>;
}

export class DefaultGameEngine implements GameEngine {
  private validator: ActionValidator;
  private turnManager: TurnManager;
  private scoreCalculator: ScoreCalculator;
  private currentState: GameState | null = null;

  constructor(
    validator: ActionValidator = new DefaultActionValidator(),
    turnManager: TurnManager = new DefaultTurnManager(),
    scoreCalculator: ScoreCalculator = new DefaultScoreCalculator()
  ) {
    this.validator = validator;
    this.turnManager = turnManager;
    this.scoreCalculator = scoreCalculator;
  }

  startNewGame(mode: GameMode, playerNames: string[]): Result<GameState> {
    if (mode === '1v1' && playerNames.length !== 2) {
      return { success: false, error: ErrorCode.INVALID_STATE };
    }
    if (mode === '2v2' && playerNames.length !== 4) {
      return { success: false, error: ErrorCode.INVALID_STATE };
    }

    let deck = shuffle(createDeck());
    
    let players: Player[] = [];
    let teams: Team[] = [];

    if (mode === '1v1') {
      const p = create1v1Players(playerNames[0], playerNames[1]);
      players = [p[0], p[1]];
    } else {
      const pt = create2v2PlayersAndTeams(
        [playerNames[0], playerNames[2]],
        [playerNames[1], playerNames[3]]
      );
      players = pt.players;
      teams = pt.teams;
    }

    // Deal 4 cards to each player
    const dealtPlayers = players.map(player => {
      const { drawn, remainingDeck } = draw(deck, 4);
      deck = remainingDeck;
      return { ...player, hand: drawn };
    });

    // Place 4 cards on board
    const { drawn: boardCards, remainingDeck } = draw(deck, 4);
    deck = remainingDeck;
    const board = createBoard(boardCards);

    const state: GameState = {
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
    };

    this.currentState = state;
    return { success: true, value: state };
  }

  playCard(state: GameState, action: Action): Result<GameState> {
    // 1. Verify it's the player's turn and validate action
    const validation = this.validator.validate(state, action);
    if (!validation.isValid) {
      return { success: false, error: validation.error || ErrorCode.INVALID_ACTION };
    }

    let newState = { ...state };
    let playerIndex = newState.players.findIndex(p => p.id === action.playerId);
    let player = { ...newState.players[playerIndex] };

    // 2. Execute action specific logic
    switch (action.type) {
      case 'colocar': {
        const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
        const card = player.hand[cardIndex];
        player.hand = player.hand.filter(c => c.id !== action.cardId);
        newState.board = addCard(newState.board, card);
        break;
      }
      case 'llevar': {
        const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
        const card = player.hand[cardIndex];
        player.hand = player.hand.filter(c => c.id !== action.cardId);
        
        const collectedCards = [card];
        
        // Take board cards (normal and canted)
        if (action.boardCardIds.length > 0) {
          // Normal cards
          const boardCardsToTake = newState.board.cards.filter(c => action.boardCardIds.includes(c.id));
          collectedCards.push(...boardCardsToTake);
          newState.board = removeCards(newState.board, action.boardCardIds);
          
          // Canted cards
          const cantedCardsToTake = newState.board.cantedCards.filter(c => action.boardCardIds.includes(c.card.id));
          for (const canted of cantedCardsToTake) {
            collectedCards.push(canted.card);
            newState.board = removeCantedCard(newState.board, canted.card.id);
          }
        }

        // Take formations
        if (action.formationIds.length > 0) {
          for (const formationId of action.formationIds) {
            const formation = newState.board.formations.find(f => f.id === formationId);
            if (formation) {
              collectedCards.push(...formation.cards);
              newState.board = removeFormation(newState.board, formationId);
            }
          }
        }

        player.collectedCards = [...player.collectedCards, ...collectedCards];

        // Check for virado (if board is left empty)
        if (isEmpty(newState.board)) {
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
            } else {
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
              player.virados += 1;
            }
          }
        }
        
        // Update the last player to take cards
        (newState as any).lastPlayerToTakeId = action.playerId;
        
        break;
      }
      case 'formar': {
        const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
        const card = player.hand[cardIndex];
        player.hand = player.hand.filter(c => c.id !== action.cardId);

        const boardCardsToForm = newState.board.cards.filter(c => action.boardCardIds.includes(c.id));
        newState.board = removeCards(newState.board, action.boardCardIds);

        // Calculate target value by finding which value from the remaining hand cards can perfectly partition the selected cards
        let formationValue = 0;
        let isGroup = false;

        const allValues = [card.value, ...boardCardsToForm.map(c => c.value)];
        const possibleAces = card.rank === 'A' ? [1, 14] : [card.value];
        
        // Find potential targets from player's remaining hand
        const potentialTargets = new Set<number>();
        for (const c of player.hand) {
          if (c.rank === 'A') {
            potentialTargets.add(1);
            potentialTargets.add(14);
          } else {
            potentialTargets.add(c.value);
          }
        }

        // Determine the actual formationValue
        for (const handVal of possibleAces) {
          const valuesToPartition = [handVal, ...boardCardsToForm.map(c => c.value)];
          for (const target of potentialTargets) {
            if (target > 14) continue;
            if (canPartitionIntoSum(valuesToPartition, target)) {
              const totalSum = valuesToPartition.reduce((a, b) => a + b, 0);
              formationValue = target;
              if (totalSum > target) {
                isGroup = true;
              }
              break;
            }
          }
          if (formationValue > 0) break;
        }

        // Fallback if not found (should not happen if validation passed)
        if (formationValue === 0) {
          formationValue = card.value + boardCardsToForm.reduce((sum, c) => sum + c.value, 0);
        }

        // Auto-group check: merge into ANY formation of this value
        const matchingFormations = newState.board.formations.filter(f => f.value === formationValue);

        if (matchingFormations.length > 0) {
          const primaryFormation = matchingFormations[0];
          let mergedCards = [...primaryFormation.cards, ...boardCardsToForm, card];
          
          for (let i = 1; i < matchingFormations.length; i++) {
             mergedCards = [...mergedCards, ...matchingFormations[i].cards];
             newState.board = removeFormation(newState.board, matchingFormations[i].id);
          }

          const updatedFormation = {
            ...primaryFormation,
            cards: mergedCards,
            isGroup: true,
            createdBy: action.playerId
          };
          
          const newFormations = newState.board.formations.map(f => f.id === primaryFormation.id ? updatedFormation : f);
          newState.board = { ...newState.board, formations: newFormations };
        } else {
          const newFormation = {
            id: Math.random().toString(36).substring(2, 9),
            cards: [...boardCardsToForm, card],
            value: formationValue,
            isGroup: isGroup,
            createdBy: action.playerId,
            createdAt: newState.turnCount
          };
          newState.board = addFormation(newState.board, newFormation);
        }
        break;
      }
      case 'formarPar': {
        const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
        const card = player.hand[cardIndex];
        player.hand = player.hand.filter(c => c.id !== action.cardId);

        let boardCardsToForm: import('../domain/card').Card[] = [];
        if (action.boardCardIds && action.boardCardIds.length > 0) {
          boardCardsToForm = newState.board.cards.filter(c => action.boardCardIds!.includes(c.id));
          newState.board = removeCards(newState.board, action.boardCardIds);
        }

        let targetValue = card.value;
        if (card.rank === 'A' && boardCardsToForm.length > 0) {
           const values = boardCardsToForm.map(c => c.value);
           const sum = values.reduce((a, b) => a + b, 0);
           if (sum % 14 === 0) targetValue = 14;
           else targetValue = 1;
        } else if (card.rank === 'A' && action.formationId) {
           const form = newState.board.formations.find(f => f.id === action.formationId);
           if (form) targetValue = form.value;
        }

        // Gather ALL formations of this value from the board
        const matchingFormations = newState.board.formations.filter(f => f.value === targetValue);
        
        if (matchingFormations.length > 0) {
          // Merge EVERYTHING into the first matching formation
          const primaryFormation = matchingFormations[0];
          let mergedCards = [...primaryFormation.cards, ...boardCardsToForm, card];
          
          // Add cards from other matching formations and remove them
          for (let i = 1; i < matchingFormations.length; i++) {
             mergedCards = [...mergedCards, ...matchingFormations[i].cards];
             newState.board = removeFormation(newState.board, matchingFormations[i].id);
          }

          const updatedFormation = {
            ...primaryFormation,
            cards: mergedCards,
            isGroup: true,
            createdBy: action.playerId
          };
          
          // Update the primary formation in the array
          const newFormations = newState.board.formations.map(f => f.id === primaryFormation.id ? updatedFormation : f);
          newState.board = { ...newState.board, formations: newFormations };
        } else {
          // No existing formations of this value, create a new one
          const newFormation = {
            id: Math.random().toString(36).substring(2, 9),
            cards: [...boardCardsToForm, card],
            value: targetValue,
            isGroup: true,
            createdBy: action.playerId,
            createdAt: newState.turnCount
          };
          newState.board = addFormation(newState.board, newFormation);
        }
        break;
      }
      case 'aumentarFormacion': {
        const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
        const card = player.hand[cardIndex];
        player.hand = player.hand.filter(c => c.id !== action.cardId);

        const formationIndex = newState.board.formations.findIndex(f => f.id === action.formationId);
        const formation = newState.board.formations[formationIndex];
        
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
        break;
      }
      case 'cantar': {
        const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
        const card = player.hand[cardIndex];
        player.hand = player.hand.filter(c => c.id !== action.cardId);

        newState.board = addCantedCard(newState.board, {
          card,
          cantedBy: action.playerId,
          // Protected for 1 round: turns equal to number of players
          protectedUntilTurn: newState.turnCount + newState.players.length
        });
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
      } else {
        // End of round and no deck: give remaining board cards to last player who took
        if (!isEmpty(newState.board) && newState.lastPlayerToTakeId) {
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
            
            lastPlayer.collectedCards = [...lastPlayer.collectedCards, ...remainingCards];
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
        (newState as any).lastScoreBreakdown = breakdowns;
      }
    } else {
      newState.currentTurnPlayerIndex = this.turnManager.getNextPlayer(newState);
    }

    this.currentState = newState;
    return { success: true, value: newState };
  }

  continueToNextRound(state: GameState): Result<GameState> {
    if (state.phase !== 'scoring') {
      return { success: false, error: ErrorCode.INVALID_STATE };
    }

    let newState = { ...state };
    
    // Check for victory
    const winner = this.checkVictory(newState);
    if (winner) {
      newState.phase = 'completed';
      newState.winnerId = winner;
    } else {
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
      } else {
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
      } else {
         newState = this.reshuffleForNextDeal(newState);
      }
    }

    this.currentState = newState;
    return { success: true, value: newState };
  }

  private checkVictory(state: GameState): string | undefined {
    let winnerId: string | undefined;
    let maxScore = 20; // Must be > 20 to win

    if (state.mode === '2v2') {
      for (const team of state.teams) {
        if (team.score > maxScore) {
          maxScore = team.score;
          winnerId = team.id;
        }
      }
    } else {
      for (const player of state.players) {
        if (player.score > maxScore) {
          maxScore = player.score;
          winnerId = player.id;
        }
      }
    }

    return winnerId;
  }

  private reshuffleForNextDeal(state: GameState): GameState {
    // Gather all cards from everywhere to make a new deck
    let deck = shuffle(createDeck());
    
    // Deal 4 cards to each player
    const dealtPlayers = state.players.map(player => {
      const { drawn, remainingDeck } = draw(deck, 4);
      deck = remainingDeck;
      return { ...player, hand: drawn, collectedCards: [], virados: 0 };
    });

    const teams = state.teams.map(team => ({
      ...team,
      collectedCards: [],
      virados: 0
    }));

    // Place 4 cards on board
    const { drawn: boardCards, remainingDeck } = draw(deck, 4);
    deck = remainingDeck;
    const board = createBoard(boardCards);

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

  getCurrentState(): GameState | null {
    return this.currentState;
  }

  getValidActions(state: GameState, playerId: string): Action[] {
    return this.validator.getValidActions(state, playerId);
  }

  getTimeoutAction(state: GameState, playerId: string): Action {
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.hand.length === 0) {
      // Return a dummy safe action, or throw. In practice, hand shouldn't be empty if it's their turn.
      throw new Error('Cannot get timeout action for empty hand');
    }

    // Priority 1: Take own formation
    const myFormations = state.board.formations.filter(f => f.createdBy === playerId);
    if (myFormations.length > 0) {
      const validActions = this.getValidActions(state, playerId);
      // 'llevar' is the action type in the client for taking cards
      const llevarActions = validActions.filter(a => a.type === 'llevar') as import('./action-validator').LlevarAction[];
      
      // Find a llevar action that takes at least one of my formations
      const takeMyFormationAction = llevarActions.find(a => 
        a.formationIds.some(fid => myFormations.some(mf => mf.id === fid))
      );

      if (takeMyFormationAction) {
        return takeMyFormationAction;
      }
    }

    // Priority 2: Drop lowest non-Ace card
    const nonAces = player.hand.filter(c => c.rank !== 'A');
    let cardToDrop;
    
    if (nonAces.length > 0) {
      // Sort by value ascending
      nonAces.sort((a, b) => a.value - b.value);
      cardToDrop = nonAces[0];
    } else {
      // Fallback: Drop an Ace
      cardToDrop = player.hand[0];
    }

    return {
      type: 'colocar',
      playerId,
      cardId: cardToDrop.id
    };
  }

  saveGame(state: GameState): string {
    return serializeGameState(state);
  }

  loadGame(json: string): Result<GameState> {
    try {
      const state = deserializeGameState(json);
      this.currentState = state;
      return { success: true, value: state };
    } catch (e) {
      return { success: false, error: ErrorCode.INVALID_STATE };
    }
  }
}
