import fc from 'fast-check';
import { GameState, validateGameState } from '../../src/domain/game-state';
import { createDeck, draw } from '../../src/domain/deck';
import { createBoard } from '../../src/domain/board';
import { create1v1Players } from '../../src/domain/player';
import { ErrorCode } from '../../src/domain/types';

describe('GameState', () => {
  it('validates a correct initial game state', () => {
    const players = create1v1Players('P1', 'P2');
    const deck = createDeck();
    
    const state: GameState = {
      id: 'game-1',
      mode: '1v1',
      phase: 'dealing',
      players,
      teams: [],
      board: createBoard(),
      deck,
      currentTurnPlayerIndex: 0,
      turnCount: 0,
      roundCount: 1
    };

    expect(validateGameState(state)).toBe(true);
  });

  it('throws on negative scores', () => {
    const players = create1v1Players('P1', 'P2');
    const invalidPlayers = [{ ...players[0], score: -1 }, players[1]];
    
    const state: GameState = {
      id: 'game-1',
      mode: '1v1',
      phase: 'dealing',
      players: invalidPlayers,
      teams: [],
      board: createBoard(),
      deck: createDeck(),
      currentTurnPlayerIndex: 0,
      turnCount: 0,
      roundCount: 1
    };

    expect(() => validateGameState(state)).toThrow(ErrorCode.INVALID_STATE);
  });

  it('throws on missing or extra cards', () => {
    const players = create1v1Players('P1', 'P2');
    const { remainingDeck } = draw(createDeck(), 1); // 51 cards
    
    const state: GameState = {
      id: 'game-1',
      mode: '1v1',
      phase: 'dealing',
      players,
      teams: [],
      board: createBoard(),
      deck: remainingDeck,
      currentTurnPlayerIndex: 0,
      turnCount: 0,
      roundCount: 1
    };

    expect(() => validateGameState(state)).toThrow(ErrorCode.INVALID_STATE);
  });

  describe('Property Tests', () => {
    it('Card conservation invariant: random distributions of 52 cards are valid', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 52, maxLength: 52 }),
          (distribution) => {
            const players = create1v1Players('P1', 'P2');
            const p1Hand: any[] = [];
            const p2Hand: any[] = [];
            const boardCards: any[] = [];
            const deckCards: any[] = [];
            const fullDeck = createDeck().cards;

            fullDeck.forEach((card, i) => {
              const bucket = distribution[i];
              if (bucket === 0) p1Hand.push(card);
              else if (bucket === 1) p2Hand.push(card);
              else if (bucket === 2) boardCards.push(card);
              else deckCards.push(card);
            });

            const state: GameState = {
              id: 'game-1',
              mode: '1v1',
              phase: 'playing',
              players: [
                { ...players[0], hand: p1Hand },
                { ...players[1], hand: p2Hand }
              ],
              teams: [],
              board: createBoard(boardCards),
              deck: { cards: deckCards },
              currentTurnPlayerIndex: 0,
              turnCount: 0,
              roundCount: 1
            };

            expect(validateGameState(state)).toBe(true);
          }
        )
      );
    });
  });
});
