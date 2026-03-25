import { DefaultTurnManager } from '../../src/application/turn-manager';
import { GameState } from '../../src/domain/game-state';
import { createBoard } from '../../src/domain/board';
import { createDeck, draw } from '../../src/domain/deck';
import { createPlayer } from '../../src/domain/player';
import { ErrorCode } from '../../src/domain/types';

describe('TurnManager', () => {
  let turnManager: DefaultTurnManager;
  let baseState: GameState;

  beforeEach(() => {
    turnManager = new DefaultTurnManager();
    const deck = createDeck();
    const { drawn: p1Hand, remainingDeck: deck2 } = draw(deck, 4);
    const { drawn: p2Hand, remainingDeck: finalDeck } = draw(deck2, 4);

    baseState = {
      id: 'test-game',
      mode: '1v1',
      phase: 'playing',
      players: [
        { ...createPlayer('p1', 'Player 1'), hand: p1Hand },
        { ...createPlayer('p2', 'Player 2'), hand: p2Hand }
      ],
      teams: [],
      board: createBoard(),
      deck: finalDeck,
      currentTurnPlayerIndex: 0,
      turnCount: 1,
      roundCount: 1
    };
  });

  describe('getNextPlayer', () => {
    it('should progress sequentially in 1v1', () => {
      expect(turnManager.getNextPlayer(baseState)).toBe(1);
      const nextState = { ...baseState, currentTurnPlayerIndex: 1 };
      expect(turnManager.getNextPlayer(nextState)).toBe(0);
    });

    it('should progress sequentially in 2v2', () => {
      const state2v2: GameState = {
        ...baseState,
        mode: '2v2',
        players: [
          createPlayer('p1', 'Player 1', 't1'),
          createPlayer('p2', 'Player 2', 't2'),
          createPlayer('p3', 'Player 3', 't1'),
          createPlayer('p4', 'Player 4', 't2')
        ],
        currentTurnPlayerIndex: 0
      };

      expect(turnManager.getNextPlayer(state2v2)).toBe(1);
      
      const state1 = { ...state2v2, currentTurnPlayerIndex: 1 };
      expect(turnManager.getNextPlayer(state1)).toBe(2);

      const state2 = { ...state2v2, currentTurnPlayerIndex: 2 };
      expect(turnManager.getNextPlayer(state2)).toBe(3);

      const state3 = { ...state2v2, currentTurnPlayerIndex: 3 };
      expect(turnManager.getNextPlayer(state3)).toBe(0);
    });
  });

  describe('isRoundComplete', () => {
    it('should return false if players have cards', () => {
      expect(turnManager.isRoundComplete(baseState)).toBe(false);
    });

    it('should return true if all players hands are empty', () => {
      const stateEndRound: GameState = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [] },
          { ...baseState.players[1], hand: [] }
        ]
      };
      expect(turnManager.isRoundComplete(stateEndRound)).toBe(true);
    });
  });

  describe('startNewRound', () => {
    it('should throw error if current round is not complete', () => {
      expect(() => turnManager.startNewRound(baseState)).toThrow(ErrorCode.INVALID_STATE);
    });

    it('should draw 4 new cards for each player and increment round count', () => {
      const stateEndRound: GameState = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [] },
          { ...baseState.players[1], hand: [] }
        ]
      };

      const deckSizeBefore = stateEndRound.deck.cards.length;
      const newState = turnManager.startNewRound(stateEndRound);

      expect(newState.roundCount).toBe(2);
      expect(newState.players[0].hand.length).toBe(4);
      expect(newState.players[1].hand.length).toBe(4);
      expect(newState.deck.cards.length).toBe(deckSizeBefore - 8);
    });

    it('should throw DECK_EMPTY if not enough cards', () => {
      const stateEndRound: GameState = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [] },
          { ...baseState.players[1], hand: [] }
        ],
        deck: { cards: [] } // Empty deck
      };

      expect(() => turnManager.startNewRound(stateEndRound)).toThrow(ErrorCode.DECK_EMPTY);
    });
  });
});
