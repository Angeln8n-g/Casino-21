import { DefaultGameEngine } from '../../src/application/game-engine';
import { GameState } from '../../src/domain/game-state';
import { ErrorCode } from '../../src/domain/types';

describe('GameEngine - startNewGame', () => {
  let engine: DefaultGameEngine;

  beforeEach(() => {
    engine = new DefaultGameEngine();
  });

  it('should initialize a 1v1 game correctly', () => {
    const result = engine.startNewGame('1v1', ['Alice', 'Bob']);
    
    expect(result.success).toBe(true);
    if (!result.success) return;

    const state = result.value;
    expect(state.mode).toBe('1v1');
    expect(state.players.length).toBe(2);
    expect(state.players[0].name).toBe('Alice');
    expect(state.players[1].name).toBe('Bob');
    
    expect(state.players[0].hand.length).toBe(4);
    expect(state.players[1].hand.length).toBe(4);
    expect(state.board.cards.length).toBe(4);
    expect(state.deck.cards.length).toBe(52 - 8 - 4); // 40
    
    expect(state.currentTurnPlayerIndex).toBeGreaterThanOrEqual(0);
    expect(state.currentTurnPlayerIndex).toBeLessThan(2);
  });

  it('should initialize a 2v2 game correctly', () => {
    const result = engine.startNewGame('2v2', ['P1', 'P2', 'P3', 'P4']);
    
    expect(result.success).toBe(true);
    if (!result.success) return;

    const state = result.value;
    expect(state.mode).toBe('2v2');
    expect(state.players.length).toBe(4);
    expect(state.teams.length).toBe(2);
    
    for (const player of state.players) {
      expect(player.hand.length).toBe(4);
    }
    
    expect(state.board.cards.length).toBe(4);
    expect(state.deck.cards.length).toBe(52 - 16 - 4); // 32
  });

  it('should fail with invalid number of players for 1v1', () => {
    const result = engine.startNewGame('1v1', ['Alice']);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ErrorCode.INVALID_STATE);
    }
  });

  it('should fail with invalid number of players for 2v2', () => {
    const result = engine.startNewGame('2v2', ['P1', 'P2']);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ErrorCode.INVALID_STATE);
    }
  });
});

describe('GameEngine - playCard', () => {
  let engine: DefaultGameEngine;
  let initialState: GameState;

  beforeEach(() => {
    engine = new DefaultGameEngine();
    const result = engine.startNewGame('1v1', ['P1', 'P2']);
    if (result.success) {
      initialState = result.value;
    }
  });

  it('should allow a player to "colocar" a card', () => {
    const playerIndex = initialState.currentTurnPlayerIndex;
    const player = initialState.players[playerIndex];
    const cardToPlay = player.hand[0];

    const result = engine.playCard(initialState, {
      type: 'colocar',
      playerId: player.id,
      cardId: cardToPlay.id
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const newState = result.value;
    const updatedPlayer = newState.players[playerIndex];
    
    expect(updatedPlayer.hand.length).toBe(3);
    expect(updatedPlayer.hand.find(c => c.id === cardToPlay.id)).toBeUndefined();
    expect(newState.board.cards.length).toBe(5);
    expect(newState.board.cards.find(c => c.id === cardToPlay.id)).toBeDefined();
    
    expect(newState.currentTurnPlayerIndex).toBe((playerIndex + 1) % 2);
  });

  it('should handle "llevar" correctly with matching value and sums', () => {
    const modifiedState = { ...initialState };
    const player = modifiedState.players[modifiedState.currentTurnPlayerIndex];
    
    // Give player a 5. Put a 5, 2, and 3 on board. 
    // Player plays 5, takes the 5, and takes the 2+3 (sum=5).
    const playerCard = { id: 'test-card-5-hand', suit: 'spades', rank: '5', value: 5 } as any;
    const boardCard1 = { id: 'test-card-5-board', suit: 'hearts', rank: '5', value: 5 } as any;
    const boardCard2 = { id: 'test-card-2-board', suit: 'clubs', rank: '2', value: 2 } as any;
    const boardCard3 = { id: 'test-card-3-board', suit: 'diamonds', rank: '3', value: 3 } as any;
    
    modifiedState.players = modifiedState.players.map((p, i) => 
      i === modifiedState.currentTurnPlayerIndex 
        ? { ...p, hand: [playerCard, ...p.hand.slice(1)] } 
        : p
    );
    modifiedState.board = { ...modifiedState.board, cards: [boardCard1, boardCard2, boardCard3, ...modifiedState.board.cards] };

    const result = engine.playCard(modifiedState, {
      type: 'llevar',
      playerId: player.id,
      cardId: playerCard.id,
      boardCardIds: [boardCard1.id, boardCard2.id, boardCard3.id],
      formationIds: []
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const newState = result.value;
    const updatedPlayer = newState.players[modifiedState.currentTurnPlayerIndex];
    
    expect(updatedPlayer.hand.find(c => c.id === playerCard.id)).toBeUndefined();
    expect(newState.board.cards.find(c => c.id === boardCard1.id)).toBeUndefined();
    expect(newState.board.cards.find(c => c.id === boardCard2.id)).toBeUndefined();
    expect(newState.board.cards.find(c => c.id === boardCard3.id)).toBeUndefined();
    expect(updatedPlayer.collectedCards.map(c => c.id)).toContain(playerCard.id);
    expect(updatedPlayer.collectedCards.map(c => c.id)).toContain(boardCard1.id);
    expect(updatedPlayer.collectedCards.map(c => c.id)).toContain(boardCard2.id);
    expect(updatedPlayer.collectedCards.map(c => c.id)).toContain(boardCard3.id);
  });

  it('should reject action if not player turn', () => {
    const wrongPlayerIndex = (initialState.currentTurnPlayerIndex + 1) % 2;
    const player = initialState.players[wrongPlayerIndex];
    const cardToPlay = player.hand[0];

    const result = engine.playCard(initialState, {
      type: 'colocar',
      playerId: player.id,
      cardId: cardToPlay.id
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ErrorCode.NOT_YOUR_TURN);
    }
  });

  it('should handle "formar" correctly', () => {
    const modifiedState = { ...initialState };
    const player = modifiedState.players[modifiedState.currentTurnPlayerIndex];
    
    // Player plays a 4, board has a 5. They form 9. Player MUST have a 9 in hand.
    const playerCardToPlay = { id: 'card-4-play', suit: 'clubs', rank: '4', value: 4 } as any;
    const playerCardToHold = { id: 'card-9-hold', suit: 'spades', rank: '9', value: 9 } as any;
    const boardCard = { id: 'card-5-board', suit: 'diamonds', rank: '5', value: 5 } as any;
    
    modifiedState.players = modifiedState.players.map((p, i) => 
      i === modifiedState.currentTurnPlayerIndex 
        ? { ...p, hand: [playerCardToPlay, playerCardToHold, ...p.hand.slice(2)] } 
        : p
    );
    modifiedState.board = { ...modifiedState.board, cards: [boardCard] };

    const result = engine.playCard(modifiedState, {
      type: 'formar',
      playerId: player.id,
      cardId: playerCardToPlay.id,
      boardCardIds: [boardCard.id]
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const newState = result.value;
    const updatedPlayer = newState.players[modifiedState.currentTurnPlayerIndex];
    
    expect(updatedPlayer.hand.find(c => c.id === playerCardToPlay.id)).toBeUndefined();
    expect(updatedPlayer.hand.find(c => c.id === playerCardToHold.id)).toBeDefined();
    expect(newState.board.cards.length).toBe(0);
    expect(newState.board.formations.length).toBe(1);
    expect(newState.board.formations[0].value).toBe(9);
    expect(newState.board.formations[0].cards.map(c => c.id)).toContain(playerCardToPlay.id);
  });

  it('should handle virado correctly', () => {
    const modifiedState = { ...initialState };
    const player = modifiedState.players[modifiedState.currentTurnPlayerIndex];
    
    // Give player a 5 and put a 5 on board, leaving board empty
    const playerCard = { id: 'test-card-1', suit: 'spades', rank: '5', value: 5 } as any;
    const boardCard = { id: 'test-card-2', suit: 'hearts', rank: '5', value: 5 } as any;
    
    modifiedState.players = modifiedState.players.map((p, i) => 
      i === modifiedState.currentTurnPlayerIndex 
        ? { ...p, hand: [playerCard, ...p.hand.slice(1)] } 
        : p
    );
    modifiedState.board = { cards: [boardCard], formations: [], cantedCards: [] };

    const result = engine.playCard(modifiedState, {
      type: 'llevar',
      playerId: player.id,
      cardId: playerCard.id,
      boardCardIds: [boardCard.id],
      formationIds: []
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const newState = result.value;
    const updatedPlayer = newState.players[modifiedState.currentTurnPlayerIndex];
    
    expect(newState.board.cards.length).toBe(0);
    expect(updatedPlayer.virados).toBe(1);
  });
});

describe('GameEngine - rounds and victory', () => {
  let engine: DefaultGameEngine;

  beforeEach(() => {
    engine = new DefaultGameEngine();
  });

  it('should end round when all players have empty hands', () => {
    const result = engine.startNewGame('1v1', ['P1', 'P2']);
    expect(result.success).toBe(true);
    if (!result.success) return;

    let state = result.value;

    // Simulate everyone playing all their cards (8 turns total)
    for (let i = 0; i < 8; i++) {
      const currentPlayer = state.players[state.currentTurnPlayerIndex];
      const cardToPlay = currentPlayer.hand[0];
      const playResult = engine.playCard(state, {
        type: 'colocar',
        playerId: currentPlayer.id,
        cardId: cardToPlay.id
      });
      
      expect(playResult.success).toBe(true);
      if (playResult.success) {
        state = playResult.value;
      }
    }

    // At the 8th play, hand is empty, so it should trigger a new round
    expect(state.players[0].hand.length).toBe(4);
    expect(state.players[1].hand.length).toBe(4);
    expect(state.roundCount).toBe(2);
    // Deck should have decreased by 8
    expect(state.deck.cards.length).toBe(40 - 8);
  });

  it('should declare winner if points reach >= 21 at the end of deck', () => {
    const result = engine.startNewGame('1v1', ['P1', 'P2']);
    expect(result.success).toBe(true);
    if (!result.success) return;

    let state = result.value;
    
    // Artificially empty the deck and give one player enough points to win
    state = {
      ...state,
      deck: { cards: [] },
      players: state.players.map((p, i) => i === 0 ? { ...p, score: 25 } : p)
    };

    // Simulate 8 plays
    for (let i = 0; i < 8; i++) {
      const currentPlayer = state.players[state.currentTurnPlayerIndex];
      const cardToPlay = currentPlayer.hand[0];
      
      const playResult = engine.playCard(state, {
        type: 'colocar',
        playerId: currentPlayer.id,
        cardId: cardToPlay.id
      });
      
      expect(playResult.success).toBe(true);
      if (playResult.success) {
        state = playResult.value;
      }
    }

    expect(state.phase).toBe('scoring');
    
    // Continue to next round
    const nextRoundResult = engine.continueToNextRound(state);
    expect(nextRoundResult.success).toBe(true);
    if (!nextRoundResult.success) return;
    state = nextRoundResult.value;

    expect(state.phase).toBe('completed');
    expect(state.winnerId).toBe(state.players[0].id);
  });

  it('should reshuffle and deal if no one has 21 points at the end of deck', () => {
    const result = engine.startNewGame('1v1', ['P1', 'P2']);
    expect(result.success).toBe(true);
    if (!result.success) return;

    let state = result.value;
    
    state = {
      ...state,
      deck: { cards: [] },
      players: state.players.map((p, i) => i === 0 ? { ...p, score: 5 } : p)
    };

    for (let i = 0; i < 8; i++) {
      const currentPlayer = state.players[state.currentTurnPlayerIndex];
      const cardToPlay = currentPlayer.hand[0];
      
      const playResult = engine.playCard(state, {
        type: 'colocar',
        playerId: currentPlayer.id,
        cardId: cardToPlay.id
      });
      
      expect(playResult.success).toBe(true);
      if (playResult.success) {
        state = playResult.value;
      }
    }

    // Should be in scoring phase first
    expect(state.phase).toBe('scoring');
    
    const nextRoundResult = engine.continueToNextRound(state);
    expect(nextRoundResult.success).toBe(true);
    if (!nextRoundResult.success) return;
    state = nextRoundResult.value;

    // Should not be completed
    expect(state.phase).toBe('playing');
    expect(state.winnerId).toBeUndefined();
    // New round started, new deck created
    expect(state.deck.cards.length).toBe(40);
    expect(state.players[0].hand.length).toBe(4);
    expect(state.board.cards.length).toBe(4);
  });
});
