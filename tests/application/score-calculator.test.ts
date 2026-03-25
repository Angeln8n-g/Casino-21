import { DefaultScoreCalculator } from '../../src/application/score-calculator';
import { GameState } from '../../src/domain/game-state';
import { createPlayer } from '../../src/domain/player';
import { createTeam } from '../../src/domain/team';
import { createCard } from '../../src/domain/card';
import { createBoard } from '../../src/domain/board';
import { createDeck } from '../../src/domain/deck';

describe('ScoreCalculator', () => {
  let calculator: DefaultScoreCalculator;

  beforeEach(() => {
    calculator = new DefaultScoreCalculator();
  });

  const createBaseState = (p1Score = 0, p2Score = 0): GameState => ({
    id: 'test-game',
    mode: '1v1',
    phase: 'playing',
    players: [
      { ...createPlayer('p1', 'Player 1'), score: p1Score },
      { ...createPlayer('p2', 'Player 2'), score: p2Score }
    ],
    teams: [],
    board: createBoard(),
    deck: createDeck(),
    currentTurnPlayerIndex: 0,
    turnCount: 1,
    roundCount: 1
  });

  it('should award 3 points for most cards and 1 for most spades', () => {
    let state = createBaseState();
    
    // p1 has 3 spades, 5 cards total
    const p1Cards = [
      createCard('spades', '3'),
      createCard('spades', '4'),
      createCard('spades', '5'),
      createCard('hearts', '2'),
      createCard('diamonds', '3')
    ];
    
    // p2 has 1 spade, 3 cards total
    const p2Cards = [
      createCard('spades', '7'),
      createCard('clubs', '2'),
      createCard('clubs', '3')
    ];

    state = {
      ...state,
      players: [
        { ...state.players[0], collectedCards: p1Cards },
        { ...state.players[1], collectedCards: p2Cards }
      ]
    };

    const { breakdowns, newState } = calculator.calculateRoundScore(state);

    const p1Breakdown = breakdowns.find(b => b.id === 'p1')!;
    expect(p1Breakdown.points.cards).toBe(3);
    expect(p1Breakdown.points.spades).toBe(1);
    expect(p1Breakdown.points.total).toBe(4);

    expect(newState.players[0].score).toBe(4);
    expect(newState.players[1].score).toBe(0);
  });

  it('should award points for special cards', () => {
    let state = createBaseState();
    
    const p1Cards = [
      createCard('diamonds', '10'), // 2 points
      createCard('spades', '2'),    // 1 point
      createCard('hearts', 'A'),    // 1 point
      createCard('spades', 'A')     // 1 point
    ];
    
    state = {
      ...state,
      players: [
        { ...state.players[0], collectedCards: p1Cards, virados: 2 },
        { ...state.players[1], collectedCards: [] }
      ]
    };

    const { breakdowns } = calculator.calculateRoundScore(state);

    const p1Breakdown = breakdowns.find(b => b.id === 'p1')!;
    expect(p1Breakdown.points.tenOfDiamonds).toBe(2);
    expect(p1Breakdown.points.twoOfSpades).toBe(1);
    expect(p1Breakdown.points.aces).toBe(2);
    expect(p1Breakdown.points.virados).toBe(2);
    expect(p1Breakdown.points.cards).toBe(3); // majority
    expect(p1Breakdown.points.spades).toBe(1); // majority
    expect(p1Breakdown.points.total).toBe(11);
  });

  it('should handle ties (no points awarded for ties)', () => {
    let state = createBaseState();
    
    const p1Cards = [createCard('spades', '3'), createCard('hearts', '2')];
    const p2Cards = [createCard('spades', '4'), createCard('diamonds', '3')];

    state = {
      ...state,
      players: [
        { ...state.players[0], collectedCards: p1Cards },
        { ...state.players[1], collectedCards: p2Cards }
      ]
    };

    const { breakdowns } = calculator.calculateRoundScore(state);

    const p1Breakdown = breakdowns.find(b => b.id === 'p1')!;
    const p2Breakdown = breakdowns.find(b => b.id === 'p2')!;

    expect(p1Breakdown.points.cards).toBe(0);
    expect(p2Breakdown.points.cards).toBe(0);
    expect(p1Breakdown.points.spades).toBe(0);
    expect(p2Breakdown.points.spades).toBe(0);
  });

  it('should apply special rules at 17 points (only cards and spades)', () => {
    let state = createBaseState(17, 0); // p1 has 17 points
    
    const p1Cards = [
      createCard('diamonds', '10'),
      createCard('spades', '2'),
      createCard('hearts', 'A'),
      createCard('spades', 'A')
    ];
    
    state = {
      ...state,
      players: [
        { ...state.players[0], collectedCards: p1Cards, virados: 1 },
        { ...state.players[1], collectedCards: [] }
      ]
    };

    const { breakdowns } = calculator.calculateRoundScore(state);
    const p1Breakdown = breakdowns.find(b => b.id === 'p1')!;

    expect(p1Breakdown.points.cards).toBe(3); // Allowed
    expect(p1Breakdown.points.spades).toBe(1); // Allowed
    expect(p1Breakdown.points.tenOfDiamonds).toBe(0); // Restricted
    expect(p1Breakdown.points.twoOfSpades).toBe(0); // Restricted
    expect(p1Breakdown.points.aces).toBe(0); // Restricted
    expect(p1Breakdown.points.virados).toBe(0); // Restricted
  });

  it('should apply special rules at 18/19 points (only cards)', () => {
    let state = createBaseState(18, 19); // p1 has 18, p2 has 19
    
    const p1Cards = [createCard('spades', 'A')]; // Just enough to win cards/spades if p2 has none? No, 1 card.
    const p2Cards = [createCard('spades', '2'), createCard('spades', '3')]; // p2 wins cards and spades

    state = {
      ...state,
      players: [
        { ...state.players[0], collectedCards: p1Cards },
        { ...state.players[1], collectedCards: p2Cards }
      ]
    };

    const { breakdowns } = calculator.calculateRoundScore(state);
    const p2Breakdown = breakdowns.find(b => b.id === 'p2')!;

    expect(p2Breakdown.points.cards).toBe(3); // Allowed
    expect(p2Breakdown.points.spades).toBe(0); // Restricted
  });

  it('should apply special rules at 20 points (only spades)', () => {
    let state = createBaseState(20, 0); // p1 has 20 points
    
    const p1Cards = [createCard('spades', '2'), createCard('spades', '3')]; // wins cards and spades
    
    state = {
      ...state,
      players: [
        { ...state.players[0], collectedCards: p1Cards },
        state.players[1]
      ]
    };
    
    const { breakdowns } = calculator.calculateRoundScore(state);
    const p1Breakdown = breakdowns.find(b => b.id === 'p1')!;

    expect(p1Breakdown.points.cards).toBe(0); // Restricted
    expect(p1Breakdown.points.spades).toBe(1); // Allowed
  });

  it('should aggregate team scores in 2v2 mode', () => {
    const state: GameState = {
      ...createBaseState(),
      mode: '2v2',
      players: [
        { ...createPlayer('p1', 'P1', 't1'), collectedCards: [createCard('spades', '2')], virados: 1 },
        { ...createPlayer('p2', 'P2', 't2'), collectedCards: [createCard('diamonds', '10')] },
        { ...createPlayer('p3', 'P3', 't1'), collectedCards: [createCard('hearts', '2'), createCard('clubs', '2')] },
        { ...createPlayer('p4', 'P4', 't2'), collectedCards: [] }
      ],
      teams: [
        createTeam('t1', ['p1', 'p3']),
        createTeam('t2', ['p2', 'p4'])
      ]
    };

    const { breakdowns, newState } = calculator.calculateRoundScore(state);
    
    const t1Breakdown = breakdowns.find(b => b.id === 't1')!;
    // t1 has 3 cards, t2 has 1 card
    expect(t1Breakdown.points.cards).toBe(3);
    // t1 has 1 spade (2 of spades), t2 has 0 spades
    expect(t1Breakdown.points.spades).toBe(1);
    expect(t1Breakdown.points.twoOfSpades).toBe(1);
    expect(t1Breakdown.points.virados).toBe(1);
    expect(t1Breakdown.points.total).toBe(6);

    const t2Breakdown = breakdowns.find(b => b.id === 't2')!;
    expect(t2Breakdown.points.tenOfDiamonds).toBe(2);
    expect(t2Breakdown.points.total).toBe(2);

    expect(newState.teams[0].score).toBe(6);
    expect(newState.teams[1].score).toBe(2);
    
    // Check that collectedCards and virados are reset
    expect(newState.players[0].virados).toBe(0);
    expect(newState.players[0].collectedCards.length).toBe(0);
  });
});
