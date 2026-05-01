import { DefaultActionValidator, LlevarAction, FormarAction, FormarParAction, CantarAction, ColocarAction } from '../../src/application/action-validator';
import { GameState } from '../../src/domain/game-state';
import { createCard } from '../../src/domain/card';
import { ErrorCode } from '../../src/domain/types';
import { createBoard } from '../../src/domain/board';
import { createPlayer } from '../../src/domain/player';
import { createDeck } from '../../src/domain/deck';

describe('ActionValidator', () => {
  let validator: DefaultActionValidator;
  let baseState: GameState;

  beforeEach(() => {
    validator = new DefaultActionValidator();
    baseState = {
      id: 'test-game',
      mode: '1v1',
      phase: 'playing',
      players: [
        { ...createPlayer('p1', 'Player 1'), hand: [createCard('spades', '7'), createCard('hearts', 'A'), createCard('diamonds', 'A')] },
        { ...createPlayer('p2', 'Player 2'), hand: [createCard('clubs', '7')] }
      ],
      teams: [],
      board: createBoard(
        [createCard('hearts', '7'), createCard('diamonds', '3'), createCard('clubs', '4')],
        [{ id: 'f1', cards: [createCard('spades', '5'), createCard('hearts', '2')], value: 7, createdBy: 'p1', createdAt: 1 }]
      ),
      deck: createDeck(),
      currentTurnPlayerIndex: 0,
      turnCount: 1,
      roundCount: 1,
      roundStartPlayerIndex: 0
    };
  });

  describe('llevar', () => {
    it('should allow taking matching cards and formations', () => {
      const action: LlevarAction = {
        type: 'llevar',
        playerId: 'p1',
        cardId: '7-spades',
        boardCardIds: ['7-hearts'],
        formationIds: ['f1']
      };
      const result = validator.validate(baseState, action);
      expect(result.isValid).toBe(true);
    });

    it('should reject taking non-matching cards', () => {
      const action: LlevarAction = {
        type: 'llevar',
        playerId: 'p1',
        cardId: '7-spades',
        boardCardIds: ['3-diamonds'],
        formationIds: []
      };
      const result = validator.validate(baseState, action);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ErrorCode.INVALID_ACTION);
    });

    it('should reject if card is not in hand', () => {
      const action: LlevarAction = {
        type: 'llevar',
        playerId: 'p1',
        cardId: '10-spades',
        boardCardIds: [],
        formationIds: []
      };
      const result = validator.validate(baseState, action);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ErrorCode.CARD_NOT_IN_HAND);
    });

    it('should allow taking a formation and a loose card if their sum matches hand card (Opponent)', () => {
      // Create a state where Player 1 (p1) is trying to pick up Player 2's (p2) formation
      const stateWithOpponentFormation = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [createCard('spades', 'K')] }, // Hand card value 13
          baseState.players[1]
        ],
        board: createBoard(
          [createCard('diamonds', '4')], // Loose card value 4
          [{ id: 'f2', cards: [createCard('hearts', '9')], value: 9, createdBy: 'p2', createdAt: 1 }] // Formation value 9
        )
      };

      const action: LlevarAction = {
        type: 'llevar',
        playerId: 'p1',
        cardId: 'K-spades',
        boardCardIds: ['4-diamonds'],
        formationIds: ['f2']
      };

      const result = validator.validate(stateWithOpponentFormation, action);
      expect(result.isValid).toBe(true);
    });

    it('should reject taking a formation and a loose card if the formation belongs to the player', () => {
      // Create a state where Player 1 (p1) is trying to pick up THEIR OWN formation with a higher card
      const stateWithOwnFormation = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [createCard('spades', 'K')] }, // Hand card value 13
          baseState.players[1]
        ],
        board: createBoard(
          [createCard('diamonds', '4')], // Loose card value 4
          [{ id: 'f1', cards: [createCard('hearts', '9')], value: 9, createdBy: 'p1', createdAt: 1 }] // Formation value 9 created by p1
        )
      };

      const action: LlevarAction = {
        type: 'llevar',
        playerId: 'p1',
        cardId: 'K-spades',
        boardCardIds: ['4-diamonds'],
        formationIds: ['f1']
      };

      const result = validator.validate(stateWithOwnFormation, action);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ErrorCode.INVALID_ACTION);
    });
  });

  describe('formar', () => {
    it('should allow forming if sum matches card in hand', () => {
      // Create a specific state for this test
      const stateForFormar = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [createCard('spades', '2'), createCard('hearts', '7')] },
          baseState.players[1]
        ],
        board: createBoard([createCard('diamonds', '5')])
      };

      const action: FormarAction = {
        type: 'formar',
        playerId: 'p1',
        cardId: '2-spades',
        boardCardIds: ['5-diamonds']
      };
      const result = validator.validate(stateForFormar, action);
      expect(result.isValid).toBe(true);
    });

    it('should reject if player does not have a card to take the formation', () => {
      const stateForFormar = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [createCard('spades', '2'), createCard('hearts', '8')] },
          baseState.players[1]
        ],
        board: createBoard([createCard('diamonds', '5')])
      };

      const action: FormarAction = {
        type: 'formar',
        playerId: 'p1',
        cardId: '2-spades',
        boardCardIds: ['5-diamonds']
      };
      const result = validator.validate(stateForFormar, action);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ErrorCode.INVALID_ACTION);
    });

    it('should reject if sum > 14', () => {
      const stateForFormar = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [createCard('spades', '10'), createCard('hearts', 'K')] },
          baseState.players[1]
        ],
        board: createBoard([createCard('diamonds', '6')])
      };

      const action: FormarAction = {
        type: 'formar',
        playerId: 'p1',
        cardId: '10-spades',
        boardCardIds: ['6-diamonds']
      };
      const result = validator.validate(stateForFormar, action);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ErrorCode.INVALID_FORMATION_SUM);
    });
  });

  describe('formarPar', () => {
    it('should allow adding to a formation of the same value', () => {
      const stateForFormarPar = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [createCard('spades', '7'), createCard('hearts', '7')] },
          baseState.players[1]
        ],
        board: createBoard([], [{ id: 'f1', cards: [createCard('diamonds', '7')], value: 7, createdBy: 'p2', createdAt: 1 }])
      };

      const action: FormarParAction = {
        type: 'formarPar',
        playerId: 'p1',
        cardId: '7-spades',
        formationId: 'f1'
      };
      const result = validator.validate(stateForFormarPar, action);
      expect(result.isValid).toBe(true);
    });

    it('should reject if player does not have another card to take the par', () => {
      const stateForFormarPar = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [createCard('spades', '7'), createCard('hearts', '8')] },
          baseState.players[1]
        ],
        board: createBoard([], [{ id: 'f1', cards: [createCard('diamonds', '7')], value: 7, createdBy: 'p2', createdAt: 1 }])
      };

      const action: FormarParAction = {
        type: 'formarPar',
        playerId: 'p1',
        cardId: '7-spades',
        formationId: 'f1'
      };
      const result = validator.validate(stateForFormarPar, action);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ErrorCode.INVALID_ACTION);
    });

    it('should reject if formation does not exist', () => {
      const stateForFormarPar = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [createCard('spades', '7'), createCard('hearts', '7')] },
          baseState.players[1]
        ]
      };

      const action: FormarParAction = {
        type: 'formarPar',
        playerId: 'p1',
        cardId: '7-spades',
        formationId: 'non-existent'
      };
      const result = validator.validate(stateForFormarPar, action);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ErrorCode.FORMATION_NOT_FOUND);
    });
  });

  describe('cantar', () => {
    it('should allow cantar if player has at least 2 aces', () => {
      const stateWithTwoAces = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [createCard('spades', 'A'), createCard('hearts', 'A')] },
          baseState.players[1]
        ]
      };
      const action: CantarAction = {
        type: 'cantar',
        playerId: 'p1',
        cardId: 'A-spades'
      };
      const result = validator.validate(stateWithTwoAces, action);
      expect(result.isValid).toBe(true);
    });

    it('should reject cantar if player has only 1 ace', () => {
      const stateWithOneAce = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [createCard('spades', 'A'), createCard('hearts', '2')] },
          baseState.players[1]
        ]
      };
      const action: CantarAction = {
        type: 'cantar',
        playerId: 'p1',
        cardId: 'A-spades'
      };
      const result = validator.validate(stateWithOneAce, action);
      expect(result.isValid).toBe(false);
    });
  });

  describe('llevar canted card', () => {
    it('should allow carrying a canted card if player uses an Ace', () => {
      const stateWithCanted = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [createCard('spades', 'A')] },
          baseState.players[1]
        ],
        board: createBoard([], [], [{ card: createCard('hearts', 'A'), cantedBy: 'p2', protectedUntilTurn: 99 }])
      };
      const action: LlevarAction = {
        type: 'llevar',
        playerId: 'p1',
        cardId: 'A-spades',
        boardCardIds: ['A-hearts'],
        formationIds: []
      };
      const result = validator.validate(stateWithCanted, action);
      expect(result.isValid).toBe(true);
    });

    it('should reject carrying a canted card if player uses non-Ace', () => {
      // Though mathematically impossible to match value 1 with a non-Ace, we test the logic protection
      const stateWithCanted = {
        ...baseState,
        players: [
          { ...baseState.players[0], hand: [createCard('spades', '2')] },
          baseState.players[1]
        ],
        board: createBoard([], [], [{ card: createCard('hearts', 'A'), cantedBy: 'p2', protectedUntilTurn: 99 }])
      };
      const action: LlevarAction = {
        type: 'llevar',
        playerId: 'p1',
        cardId: '2-spades',
        boardCardIds: ['A-hearts'],
        formationIds: []
      };
      const result = validator.validate(stateWithCanted, action);
      expect(result.isValid).toBe(false);
    });
  });

  describe('colocar', () => {
    it('should be valid to place a card if no active formations belong to player', () => {
      // Modify baseState so p1 doesn't have active formations
      const stateNoFormations = {
        ...baseState,
        board: createBoard([])
      };
      const action: ColocarAction = {
        type: 'colocar',
        playerId: 'p1',
        cardId: '7-spades'
      };
      const result = validator.validate(stateNoFormations, action);
      expect(result.isValid).toBe(true);
    });

    it('should be invalid to place a card if player has an active formation', () => {
      const action: ColocarAction = {
        type: 'colocar',
        playerId: 'p1',
        cardId: '7-spades'
      };
      const result = validator.validate(baseState, action); // baseState has f1 createdBy p1
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ErrorCode.INVALID_ACTION);
    });
  });

  describe('getValidActions', () => {
    it('should return a list of valid actions for the current player', () => {
      const actions = validator.getValidActions(baseState, 'p1');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.type === 'colocar')).toBe(true);
      expect(actions.some(a => a.type === 'cantar')).toBe(true);
      expect(actions.some(a => a.type === 'llevar')).toBe(true);
      expect(actions.some(a => a.type === 'formar')).toBe(true);
      expect(actions.some(a => a.type === 'formarPar')).toBe(true);
    });

    it('should return empty array if not player turn', () => {
      const actions = validator.getValidActions(baseState, 'p2');
      expect(actions.length).toBe(0);
    });
  });
});
