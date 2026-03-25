import { GameState } from '../domain/game-state';
import { ErrorCode } from '../domain/types';

export type ActionType = 'llevar' | 'formar' | 'formarPar' | 'cantar' | 'colocar' | 'aumentarFormacion';

export interface BaseAction {
  type: ActionType;
  playerId: string;
  cardId: string;
}

export interface AumentarFormacionAction extends BaseAction {
  type: 'aumentarFormacion';
  formationId: string;
}

export interface LlevarAction extends BaseAction {
  type: 'llevar';
  cardId: string;
  boardCardIds: string[];
  formationIds: string[];
}

export interface FormarAction extends BaseAction {
  type: 'formar';
  boardCardIds: string[];
}

export interface FormarParAction extends BaseAction {
  type: 'formarPar';
  formationId?: string;
  boardCardIds?: string[];
}

export interface CantarAction extends BaseAction {
  type: 'cantar';
  cardId: string;
}

export interface ColocarAction extends BaseAction {
  type: 'colocar';
  cardId: string;
}

export type Action = LlevarAction | FormarAction | FormarParAction | CantarAction | ColocarAction | AumentarFormacionAction;

export interface ValidationResult {
  isValid: boolean;
  error?: ErrorCode;
}

export interface ActionValidator {
  validate(state: GameState, action: Action): ValidationResult;
  getValidActions(state: GameState, playerId: string): Action[];
}

export class DefaultActionValidator implements ActionValidator {
  validate(state: GameState, action: Action): ValidationResult {
    // Basic turn validation
    const currentPlayer = state.players[state.currentTurnPlayerIndex];
    if (currentPlayer.id !== action.playerId) {
      return { isValid: false, error: ErrorCode.NOT_YOUR_TURN };
    }

    const player = state.players.find(p => p.id === action.playerId);
    if (!player) {
      return { isValid: false, error: ErrorCode.INVALID_STATE };
    }

    // Hand check for actions requiring a card from hand
    if (action.type !== 'cantar') { // cantar uses cardId too
      const handCard = player.hand.find(c => c.id === action.cardId);
      if (!handCard) {
        return { isValid: false, error: ErrorCode.CARD_NOT_IN_HAND };
      }
    }

    // Obligatory take formation check (Rule 5)
    // If player formed in their previous turn, they MUST take a formation if they can't form again or do something else valid
    // We will enforce this partially in the engine or by rejecting 'colocar' if they have a pending formation they created
    // Actually, rule says: "Sí el jugador 1 hace una formación con una carta de su mazo, en su próximo turno sí no tiene otra jugada para formar o llevar, es obligatorio que se lleve la formación previa."
    // We'll enforce that in validateColocar: you cannot 'colocar' if you have a formation you created and could take.

    switch (action.type) {
      case 'llevar':
        return this.validateLlevar(state, action);
      case 'formar':
        return this.validateFormar(state, action);
      case 'formarPar':
        return this.validateFormarPar(state, action);
      case 'aumentarFormacion':
        return this.validateAumentarFormacion(state, action);
      case 'cantar':
        return this.validateCantar(state, action);
      case 'colocar':
        return this.validateColocar(state, action);
      default:
        return { isValid: false, error: ErrorCode.INVALID_ACTION };
    }
  }

  private validateLlevar(state: GameState, action: LlevarAction): ValidationResult {
    const player = state.players.find(p => p.id === action.playerId)!;
    const handCard = player.hand.find(c => c.id === action.cardId)!;

    if (action.boardCardIds.length === 0 && action.formationIds.length === 0) {
      return { isValid: false, error: ErrorCode.INVALID_ACTION };
    }

    // Aces can be 1 or 14
    const targetValues = handCard.rank === 'A' ? [1, 14] : [handCard.value];

    // Check formations
    for (const formationId of action.formationIds) {
      const formation = state.board.formations.find(f => f.id === formationId);
      if (!formation) {
        return { isValid: false, error: ErrorCode.FORMATION_NOT_FOUND };
      }
      if (!targetValues.includes(formation.value)) {
        return { isValid: false, error: ErrorCode.INVALID_ACTION };
      }
    }

    // Check protection
    // According to new rules, canted cards can only be taken by an Ace (value 1 or 14).
    // So if any board card is canted, handCard MUST be an Ace.
    for (const boardCardId of action.boardCardIds) {
      const isCanted = state.board.cantedCards.some(c => c.card.id === boardCardId);
      if (isCanted && handCard.rank !== 'A') {
        return { isValid: false, error: ErrorCode.CARD_PROTECTED };
      }
    }

    // Since Aces can be 1 or 14, we need to try partitioning for all possible target values
    let partitionSuccessful = false;

    // We must ensure that ALL selected board cards and formations are completely consumed
    // by the target value. The `canPartitionIntoSum` function handles board cards.
    // If formations are selected, they MUST exactly match the target value (already checked above).
    // We only need to check if the board cards can partition into the target value.
    
    if (action.boardCardIds.length > 0) {
      const boardCards = action.boardCardIds.map(id => {
        // First check normal cards
        let card = state.board.cards.find(c => c.id === id);
        // Then check canted cards if not found in normal cards
        if (!card) {
          const canted = state.board.cantedCards.find(c => c.card.id === id);
          if (canted) {
            card = canted.card;
          }
        }
        return card;
      });

      if (boardCards.some(c => !c)) {
        return { isValid: false, error: ErrorCode.INVALID_STATE };
      }

      const values = boardCards.map(c => c!.value);
      partitionSuccessful = targetValues.some(tv => {
        // Special case for Aces taking canted Aces:
        // A canted Ace can be taken by another Ace directly (1 takes 1, or 14 takes 14).
        // If ALL selected board cards are Aces and the hand card is an Ace, it's valid to take them individually.
        if (handCard.rank === 'A' && boardCards.every(c => c!.rank === 'A')) {
          // If we are just taking an Ace with an Ace, the partition logic will work for tv=1 if we treat Ace as 1, 
          // or we can explicitly allow it. The backtrack function will group 1s into 1s successfully.
          return this.canPartitionIntoSum(values.map(v => v === 14 ? 1 : v), 1);
        }

        // First check if formations match this specific target value tv
        // If we selected formations, and they don't match tv, we can't use tv
        if (action.formationIds.length > 0) {
          const allFormationsMatchTv = action.formationIds.every(fid => {
             const f = state.board.formations.find(form => form.id === fid);
             return f && f.value === tv;
          });
          if (!allFormationsMatchTv) return false;
        }
        
        return this.canPartitionIntoSum(values, tv);
      });
      
      if (!partitionSuccessful) {
        return { isValid: false, error: ErrorCode.INVALID_ACTION };
      }
    } else {
       // If no board cards, we still need to make sure the formations match ONE of the target values
       const validTv = targetValues.find(tv => {
         return action.formationIds.every(fid => {
            const f = state.board.formations.find(form => form.id === fid);
            return f && f.value === tv;
         });
       });
       
       if (!validTv) {
         return { isValid: false, error: ErrorCode.INVALID_ACTION };
       }
    }

    return { isValid: true };
  }

  private canPartitionIntoSum(numbers: number[], target: number): boolean {
    if (numbers.length === 0) return true;
    const sum = numbers.reduce((a, b) => a + b, 0);
    if (sum % target !== 0) return false;
    
    const used = new Array(numbers.length).fill(false);
    
    const backtrack = (startIndex: number, currentSum: number, groupsFormed: number): boolean => {
      if (groupsFormed === sum / target) return true;
      if (currentSum === target) {
        return backtrack(0, 0, groupsFormed + 1);
      }
      for (let i = startIndex; i < numbers.length; i++) {
        if (!used[i] && currentSum + numbers[i] <= target) {
          used[i] = true;
          if (backtrack(i + 1, currentSum + numbers[i], groupsFormed)) return true;
          used[i] = false;
        }
      }
      return false;
    };
    
    return backtrack(0, 0, 0);
  }

  private validateFormar(state: GameState, action: FormarAction): ValidationResult {
    const player = state.players.find(p => p.id === action.playerId)!;
    const handCard = player.hand.find(c => c.id === action.cardId)!;

    if (action.boardCardIds.length === 0) {
      return { isValid: false, error: ErrorCode.INVALID_ACTION };
    }

    let sum = handCard.value;
    for (const boardCardId of action.boardCardIds) {
      const boardCard = state.board.cards.find(c => c.id === boardCardId);
      if (!boardCard) {
        // Canted cards cannot be used to form
        const isCanted = state.board.cantedCards.some(cc => cc.card.id === boardCardId);
        if (isCanted) {
          return { isValid: false, error: ErrorCode.CARD_PROTECTED };
        }
        return { isValid: false, error: ErrorCode.INVALID_STATE };
      }
      sum += boardCard.value;
    }

    if (sum > 14) {
      return { isValid: false, error: ErrorCode.INVALID_FORMATION_SUM };
    }

    const hasCardToTake = player.hand.some(c => c.id !== action.cardId && (c.value === sum || (c.rank === 'A' && sum === 14)));
    if (!hasCardToTake) {
      return { isValid: false, error: ErrorCode.INVALID_ACTION };
    }

    return { isValid: true };
  }

  private validateFormarPar(state: GameState, action: FormarParAction): ValidationResult {
    const player = state.players.find(p => p.id === action.playerId)!;
    const handCard = player.hand.find(c => c.id === action.cardId)!;

    if (!action.formationId && (!action.boardCardIds || action.boardCardIds.length === 0)) {
      return { isValid: false, error: ErrorCode.INVALID_ACTION };
    }

    let targetValue = 0;

    // Case 1: Forming par with an existing formation
    if (action.formationId) {
      const formation = state.board.formations.find(f => f.id === action.formationId);
      if (!formation) {
        return { isValid: false, error: ErrorCode.FORMATION_NOT_FOUND };
      }
      targetValue = formation.value;
    } 
    // Case 2: Forming par by combining multiple loose cards that sum to handCard's value
    else if (action.boardCardIds && action.boardCardIds.length > 0) {
      const boardCards = action.boardCardIds.map(id => state.board.cards.find(c => c.id === id));
      if (boardCards.some(c => !c)) {
        return { isValid: false, error: ErrorCode.INVALID_STATE };
      }
      targetValue = boardCards.reduce((sum, c) => sum + c!.value, 0);
    }

    if (handCard.value !== targetValue && !(handCard.rank === 'A' && targetValue === 14)) {
      return { isValid: false, error: ErrorCode.INVALID_ACTION };
    }

    // Must have another card in hand to eventually take this par
    const hasCardToTake = player.hand.some(c => c.id !== action.cardId && (c.value === targetValue || (c.rank === 'A' && targetValue === 14)));
    if (!hasCardToTake) {
      return { isValid: false, error: ErrorCode.INVALID_ACTION };
    }

    return { isValid: true };
  }

  private validateAumentarFormacion(state: GameState, action: AumentarFormacionAction): ValidationResult {
    const player = state.players.find(p => p.id === action.playerId)!;
    const handCard = player.hand.find(c => c.id === action.cardId)!;

    const formation = state.board.formations.find(f => f.id === action.formationId);
    if (!formation) {
      return { isValid: false, error: ErrorCode.FORMATION_NOT_FOUND };
    }

    if (formation.createdBy === action.playerId) {
      // Player cannot increase their own formation (usually not allowed, or if allowed, must have a card)
      // Standard casino rules say you can increase opponent's formation, but some say you can increase yours too.
      // We will allow it as long as they have the new sum.
    }

    const newSum = formation.value + handCard.value;
    if (newSum > 14) {
      return { isValid: false, error: ErrorCode.INVALID_FORMATION_SUM };
    }

    const hasCardToTake = player.hand.some(c => c.id !== action.cardId && (c.value === newSum || (c.rank === 'A' && newSum === 14)));
    if (!hasCardToTake) {
      return { isValid: false, error: ErrorCode.INVALID_ACTION };
    }

    return { isValid: true };
  }

  private validateCantar(state: GameState, action: CantarAction): ValidationResult {
    const player = state.players.find(p => p.id === action.playerId)!;
    const handCard = player.hand.find(c => c.id === action.cardId);
    
    if (!handCard) {
      return { isValid: false, error: ErrorCode.CARD_NOT_IN_HAND };
    }

    if (handCard.rank !== 'A') {
      return { isValid: false, error: ErrorCode.INVALID_ACTION };
    }

    const acesInHand = player.hand.filter(c => c.rank === 'A').length;
    // To sing an Ace, you must have at least 2 Aces in hand OR 
    // it's the last card and you want to just put it down? 
    // Actually, rule usually says: to sing you must have another one to pick it up later.
    if (acesInHand < 2) {
      return { isValid: false, error: ErrorCode.INVALID_ACTION };
    }

    return { isValid: true };
  }

  private validateColocar(state: GameState, action: ColocarAction): ValidationResult {
    const player = state.players.find(p => p.id === action.playerId)!;

    // Check if player has a pending formation they created
    const hasPendingFormation = state.board.formations.some(f => f.createdBy === player.id);
    if (hasPendingFormation) {
      // If they have a pending formation, they MUST take it or form again. They cannot 'colocar'.
      return { isValid: false, error: ErrorCode.INVALID_ACTION };
    }

    // Check if player has a canted card they created
    // Rule: if they canted an Ace and no one took it, they MUST take it.
    const hasPendingCanted = state.board.cantedCards.some(c => c.cantedBy === player.id);
    if (hasPendingCanted) {
      // Must take it or do something with it, cannot just 'colocar' a different card.
      // (Unless they are placing a card but still have an Ace to take it later? The rule usually says "in their next turn they must take it").
      // For strict enforcement, we prevent 'colocar' if they have a canted card.
      return { isValid: false, error: ErrorCode.INVALID_ACTION };
    }

    return { isValid: true };
  }

  getValidActions(state: GameState, playerId: string): Action[] {
    const player = state.players.find(p => p.id === playerId);
    if (!player || state.players[state.currentTurnPlayerIndex].id !== playerId) {
      return [];
    }

    const validActions: Action[] = [];

    // Colocar
    for (const card of player.hand) {
      validActions.push({
        type: 'colocar',
        playerId,
        cardId: card.id
      });
    }

    // Aumentar Formacion
    for (const card of player.hand) {
      for (const formation of state.board.formations) {
        const newSum = formation.value + card.value;
        if (newSum <= 14 && player.hand.some(c => c.id !== card.id && (c.value === newSum || (c.rank === 'A' && newSum === 14)))) {
          validActions.push({
            type: 'aumentarFormacion',
            playerId,
            cardId: card.id,
            formationId: formation.id
          });
        }
      }
    }

    // Llevar
    for (const card of player.hand) {
      const targetValues = card.rank === 'A' ? [1, 14] : [card.value];
      
      const matchingBoardCards = state.board.cards.filter(c => targetValues.includes(c.value));
      const matchingCantedCards = card.rank === 'A'
        ? state.board.cantedCards.filter(cc => targetValues.includes(cc.card.value) || cc.card.rank === 'A').map(cc => cc.card)
        : [];
      const allMatchingCards = [...matchingBoardCards, ...matchingCantedCards];

      const matchingFormations = state.board.formations.filter(f => targetValues.includes(f.value));

      if (allMatchingCards.length > 0 || matchingFormations.length > 0) {
        // Can take all matching cards and formations at once
        validActions.push({
          type: 'llevar',
          playerId,
          cardId: card.id,
          boardCardIds: allMatchingCards.map(c => c.id),
          formationIds: matchingFormations.map(f => f.id)
        });
      }
    }

    // Formar (Simple combinations)
    // For simplicity in suggestion, we can just suggest pairs that sum to the card
    for (const card of player.hand) {
      // Find all subsets of board cards that sum to card.value
      // This could be expensive, so we just do pairs for getValidActions MVP
      for (let i = 0; i < state.board.cards.length; i++) {
        for (let j = i + 1; j < state.board.cards.length; j++) {
          const c1 = state.board.cards[i];
          const c2 = state.board.cards[j];
          
          const canted1 = state.board.cantedCards.find(cc => cc.card.id === c1.id);
          const canted2 = state.board.cantedCards.find(cc => cc.card.id === c2.id);
          
          const protected1 = canted1 && canted1.cantedBy !== playerId && state.turnCount < canted1.protectedUntilTurn;
          const protected2 = canted2 && canted2.cantedBy !== playerId && state.turnCount < canted2.protectedUntilTurn;
          
          if (!protected1 && !protected2 && c1.value + c2.value === card.value) {
            validActions.push({
              type: 'formar',
              playerId,
              cardId: card.id,
              boardCardIds: [c1.id, c2.id]
            });
          }
        }
      }
    }

    // Formar Par (with another formation)
    for (const card of player.hand) {
      for (const formation of state.board.formations) {
        if (card.value === formation.value || (card.rank === 'A' && formation.value === 14)) {
          if (player.hand.some(c => c.id !== card.id && (c.value === formation.value || (c.rank === 'A' && formation.value === 14)))) {
            validActions.push({
              type: 'formarPar',
              playerId,
              cardId: card.id,
              formationId: formation.id
            });
          }
        }
      }
    }

    // Formar Par (with loose cards)
    for (const card of player.hand) {
      const targetValues = card.rank === 'A' ? [1, 14] : [card.value];
      for (const tv of targetValues) {
        // Find if any combination of board cards sums to this target value
        // We only consider the simplest case: a subset of board cards that exactly sums to tv
        // This is a simplified check for validActions generation to keep it performant
        // For accurate UI, the user selects the cards and we validate it.
        const values = state.board.cards.map(c => c.value);
        if (this.canPartitionIntoSum(values, tv)) {
          if (player.hand.some(c => c.id !== card.id && (c.value === tv || (c.rank === 'A' && tv === 14)))) {
            // We push a generic formarPar, though the specific boardCardIds would be chosen by user
            validActions.push({
              type: 'formarPar',
              playerId,
              cardId: card.id,
              boardCardIds: state.board.cards.map(c => c.id) // Just a placeholder for UI suggestion
            });
          }
        }
      }
    }

    // Cantar
    const aces = player.hand.filter(c => c.rank === 'A');
    if (aces.length >= 2) {
      for (const ace of aces) {
        validActions.push({
          type: 'cantar',
          playerId,
          cardId: ace.id
        });
      }
    }

    return validActions;
  }
}
