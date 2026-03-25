import { 
  createBoard, 
  addCard, 
  removeCards, 
  addFormation, 
  removeFormation, 
  addCantedCard, 
  removeCantedCard, 
  isEmpty 
} from '../../src/domain/board';
import { createCard } from '../../src/domain/card';

describe('Board', () => {
  const card1 = createCard('spades', 'A');
  const card2 = createCard('hearts', '10');

  it('creates an empty board by default', () => {
    const board = createBoard();
    expect(board.cards).toEqual([]);
    expect(board.formations).toEqual([]);
    expect(board.cantedCards).toEqual([]);
    expect(isEmpty(board)).toBe(true);
  });

  it('addCard adds a card immutably', () => {
    const board = createBoard();
    const newBoard = addCard(board, card1);
    
    expect(newBoard.cards).toContain(card1);
    expect(board.cards).not.toContain(card1); // Immutable check
    expect(isEmpty(newBoard)).toBe(false);
  });

  it('removeCards removes multiple cards immutably', () => {
    let board = createBoard();
    board = addCard(board, card1);
    board = addCard(board, card2);
    
    const newBoard = removeCards(board, [card1.id]);
    
    expect(newBoard.cards).not.toContain(card1);
    expect(newBoard.cards).toContain(card2);
    expect(board.cards).toContain(card1); // Immutable check
  });

  it('addFormation adds a formation immutably', () => {
    const board = createBoard();
    const formation = {
      id: 'f1',
      cards: [card1, card2],
      value: 11,
      createdBy: 'p1',
      createdAt: 1
    };
    
    const newBoard = addFormation(board, formation);
    
    expect(newBoard.formations).toContain(formation);
    expect(board.formations).not.toContain(formation);
    expect(isEmpty(newBoard)).toBe(false);
  });

  it('removeFormation removes a formation immutably', () => {
    let board = createBoard();
    const formation = {
      id: 'f1',
      cards: [card1],
      value: 1,
      createdBy: 'p1',
      createdAt: 1
    };
    board = addFormation(board, formation);
    
    const newBoard = removeFormation(board, 'f1');
    
    expect(newBoard.formations).not.toContain(formation);
    expect(board.formations).toContain(formation);
  });

  it('addCantedCard and removeCantedCard operate immutably', () => {
    const board = createBoard();
    const cantedCard = {
      card: card1,
      cantedBy: 'p1',
      protectedUntilTurn: 5
    };
    
    const withCanted = addCantedCard(board, cantedCard);
    expect(withCanted.cantedCards).toContain(cantedCard);
    expect(isEmpty(withCanted)).toBe(false);
    
    const withoutCanted = removeCantedCard(withCanted, card1.id);
    expect(withoutCanted.cantedCards).not.toContain(cantedCard);
    expect(isEmpty(withoutCanted)).toBe(true);
  });

  it('isEmpty returns true only when all collections are empty', () => {
    expect(isEmpty(createBoard())).toBe(true);
    expect(isEmpty(addCard(createBoard(), card1))).toBe(false);
    
    const formation = { id: 'f1', cards: [], value: 0, createdBy: '', createdAt: 0 };
    expect(isEmpty(addFormation(createBoard(), formation))).toBe(false);
    
    const canted = { card: card1, cantedBy: '', protectedUntilTurn: 0 };
    expect(isEmpty(addCantedCard(createBoard(), canted))).toBe(false);
  });
});
