/**
 * Bot Player Module — Multi-Difficulty AI
 * 
 * Three difficulty levels with increasingly sophisticated strategies:
 * 
 * EASY:   Uses `getTimeoutAction()` — takes own formations, drops lowest card.
 * MEDIUM: Evaluates all valid actions with weighted heuristics.
 *         Prioritizes llevar > formar > formarPar > aumentar > cantar > colocar.
 *         Considers card values, board state, and basic opponent awareness.
 * HARD:   Full strategic evaluation — scores every action considering:
 *         formation blocking, virado potential (clearing the board),
 *         card collection for majorities, high-value card targeting (10♦, 2♠, Aces),
 *         and opponent board awareness.
 */

import type { GameState } from '../domain/game-state';
import type { Action, LlevarAction } from '../application/action-validator';
import type { DefaultGameEngine } from '../application/game-engine';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

/** Unique identifier for the bot player (never collides with real Supabase UUIDs) */
export const BOT_USER_ID = 'bot-easy';

/** Display names per difficulty */
export const BOT_NAMES: Record<BotDifficulty, string> = {
  easy:   'Bot Fácil 🤖',
  medium: 'Bot Medio 🧠',
  hard:   'Bot Difícil 👑',
};

/** Legacy export for backward compatibility */
export const BOT_NAME = BOT_NAMES.easy;

/** Delay in ms before the bot plays its card (simulates thinking) */
export const BOT_THINK_DELAY_MS = 1500;

// ─────────────────────────────────────────────
// Strategy functions
// ─────────────────────────────────────────────

/**
 * Returns the best action for the given difficulty.
 * Falls back to getTimeoutAction if something goes wrong.
 */
export function getBotAction(
  engine: DefaultGameEngine,
  state: GameState,
  playerId: string,
  difficulty: BotDifficulty
): Action {
  try {
    switch (difficulty) {
      case 'easy':
        return engine.getTimeoutAction(state, playerId);

      case 'medium':
        return getMediumAction(engine, state, playerId);

      case 'hard':
        return getHardAction(engine, state, playerId);

      default:
        return engine.getTimeoutAction(state, playerId);
    }
  } catch (err) {
    console.error(`Bot (${difficulty}) error, falling back to timeout action:`, err);
    return engine.getTimeoutAction(state, playerId);
  }
}

// ─────────────────────────────────────────────
// MEDIUM difficulty
// ─────────────────────────────────────────────

function getMediumAction(engine: DefaultGameEngine, state: GameState, playerId: string): Action {
  const validActions = engine.getValidActions(state, playerId);
  if (validActions.length === 0) return engine.getTimeoutAction(state, playerId);

  const player = state.players.find(p => p.id === playerId);
  if (!player) return engine.getTimeoutAction(state, playerId);

  let bestAction: Action = validActions[0];
  let bestScore = -Infinity;

  for (const action of validActions) {
    const score = scoreMediumAction(action, state, playerId);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
}

function scoreMediumAction(action: Action, state: GameState, playerId: string): number {
  switch (action.type) {
    case 'llevar': {
      const la = action as LlevarAction;
      let score = 100; // Base: taking cards is always preferred

      // Count how many cards we'd collect
      const boardCardCount = la.boardCardIds.length;
      const formationCardCount = la.formationIds.reduce((sum, fid) => {
        const f = state.board.formations.find(fo => fo.id === fid);
        return sum + (f ? f.cards.length : 0);
      }, 0);
      score += (boardCardCount + formationCardCount) * 5;

      // Bonus for taking own formations (mandatory but prioritized)
      const ownFormations = la.formationIds.filter(fid =>
        state.board.formations.find(f => f.id === fid && f.createdBy === playerId)
      );
      score += ownFormations.length * 20;

      // Bonus for high-value individual cards (Aces, 10♦, 2♠)
      const boardCards = la.boardCardIds.map(id => {
        let card = state.board.cards.find(c => c.id === id);
        if (!card) {
          const canted = state.board.cantedCards.find(cc => cc.card.id === id);
          if (canted) card = canted.card;
        }
        return card;
      }).filter(Boolean);

      for (const card of boardCards) {
        if (!card) continue;
        if (card.rank === 'A') score += 15;
        if (card.suit === 'diamonds' && card.rank === '10') score += 25;
        if (card.suit === 'spades' && card.rank === '2') score += 12;
        if (card.suit === 'spades') score += 3;
      }

      // Bonus if this would clear the board (virado!)
      const remainingBoardCards = state.board.cards.length - boardCardCount;
      const remainingFormations = state.board.formations.length - la.formationIds.length;
      const remainingCanted = state.board.cantedCards.length;
      if (remainingBoardCards <= 0 && remainingFormations <= 0 && remainingCanted <= 0) {
        score += 40;
      }

      return score;
    }

    case 'formar': {
      let score = 60; // Forming is good but less than taking
      // Prefer forming with higher target values
      const handCard = state.players.find(p => p.id === playerId)?.hand.find(c => c.id === action.cardId);
      if (handCard) score += handCard.value * 2;
      return score;
    }

    case 'formarPar': {
      let score = 55;
      // Grouping formations is strategically strong
      if (action.formationId) {
        const f = state.board.formations.find(fo => fo.id === action.formationId);
        if (f) score += f.cards.length * 3;
      }
      return score;
    }

    case 'aumentarFormacion': {
      let score = 50;
      // Increasing an opponent's formation to take it later
      const f = state.board.formations.find(fo => fo.id === action.formationId);
      if (f && f.createdBy !== playerId) {
        score += 10; // Taking control from opponent
      }
      return score;
    }

    case 'cantar': {
      // Singing an Ace is moderately valuable — protects the card
      return 45;
    }

    case 'colocar':
    case 'botar': {
      let score = 0; // Dropping is worst case
      const player = state.players.find(p => p.id === playerId);
      const card = player?.hand.find(c => c.id === action.cardId);
      if (card) {
        // Prefer dropping low-value non-Ace cards
        if (card.rank === 'A') {
          score -= 20; // Avoid dropping Aces
        } else {
          score -= card.value; // Lower cards are cheaper to drop
        }
        // Avoid dropping scoring cards
        if (card.suit === 'diamonds' && card.rank === '10') score -= 30;
        if (card.suit === 'spades' && card.rank === '2') score -= 15;
      }
      return score;
    }

    default:
      return -100;
  }
}

// ─────────────────────────────────────────────
// HARD difficulty
// ─────────────────────────────────────────────

function getHardAction(engine: DefaultGameEngine, state: GameState, playerId: string): Action {
  const validActions = engine.getValidActions(state, playerId);
  if (validActions.length === 0) return engine.getTimeoutAction(state, playerId);

  const player = state.players.find(p => p.id === playerId);
  if (!player) return engine.getTimeoutAction(state, playerId);

  const opponent = state.players.find(p => p.id !== playerId);

  let bestAction: Action = validActions[0];
  let bestScore = -Infinity;

  for (const action of validActions) {
    const score = scoreHardAction(action, state, playerId, opponent?.id);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
}

function scoreHardAction(action: Action, state: GameState, playerId: string, opponentId?: string): number {
  const player = state.players.find(p => p.id === playerId)!;
  const opponent = opponentId ? state.players.find(p => p.id === opponentId) : undefined;

  switch (action.type) {
    case 'llevar': {
      const la = action as LlevarAction;
      let score = 200; // Taking is king

      // Card count advantage (for majority scoring: 3 points)
      const boardCardCount = la.boardCardIds.length;
      const formationCardCount = la.formationIds.reduce((sum, fid) => {
        const f = state.board.formations.find(fo => fo.id === fid);
        return sum + (f ? f.cards.length : 0);
      }, 0);
      const totalCards = boardCardCount + formationCardCount + 1; // +1 for the hand card used
      score += totalCards * 8;

      // High-value scoring cards
      const allCardsToCollect = la.boardCardIds.map(id => {
        let card = state.board.cards.find(c => c.id === id);
        if (!card) {
          const canted = state.board.cantedCards.find(cc => cc.card.id === id);
          if (canted) card = canted.card;
        }
        return card;
      }).filter(Boolean);

      // Add cards from formations
      for (const fid of la.formationIds) {
        const f = state.board.formations.find(fo => fo.id === fid);
        if (f) allCardsToCollect.push(...f.cards);
      }

      let spadesCollected = 0;
      for (const card of allCardsToCollect) {
        if (!card) continue;
        if (card.rank === 'A') score += 20;       // Each Ace = 1 point
        if (card.suit === 'diamonds' && card.rank === '10') score += 35; // 10♦ = 2 points
        if (card.suit === 'spades' && card.rank === '2') score += 18;    // 2♠ = 1 point
        if (card.suit === 'spades') { spadesCollected++; score += 4; }    // Spades majority = 1 point
      }

      // Extra bonus if we're close to spades majority
      const currentSpades = player.collectedCards.filter(c => c.suit === 'spades').length;
      const opponentSpades = opponent?.collectedCards.filter(c => c.suit === 'spades').length || 0;
      if (currentSpades + spadesCollected > opponentSpades) score += 15;

      // Card count majority awareness
      const currentCardCount = player.collectedCards.length;
      const opponentCardCount = opponent?.collectedCards.length || 0;
      if (currentCardCount + totalCards > opponentCardCount) score += 20;

      // Bonus for taking own formations
      const ownFormations = la.formationIds.filter(fid =>
        state.board.formations.find(f => f.id === fid && f.createdBy === playerId)
      );
      score += ownFormations.length * 30;

      // Bonus for taking OPPONENT formations (blocking them!)
      if (opponentId) {
        const opponentFormations = la.formationIds.filter(fid =>
          state.board.formations.find(f => f.id === fid && f.createdBy === opponentId)
        );
        score += opponentFormations.length * 25;
      }

      // VIRADO detection: clearing the board gives a virado point
      const remainingBoardCards = state.board.cards.length - boardCardCount;
      const remainingFormations = state.board.formations.length - la.formationIds.length;
      const cantedTaken = la.boardCardIds.filter(id =>
        state.board.cantedCards.some(cc => cc.card.id === id)
      ).length;
      const remainingCanted = state.board.cantedCards.length - cantedTaken;
      if (remainingBoardCards <= 0 && remainingFormations <= 0 && remainingCanted <= 0) {
        score += 60; // Virado is very valuable

        // Even more valuable if opponent has virados to cancel
        if (opponent && opponent.virados > 0) score += 20;
      }

      // Score-gate awareness: if at 17/18/19/20, certain points are blocked
      // Prioritize card majority (always counts) over special cards when near the cap
      if (player.score >= 17) {
        // At 17+, aces/10♦/2♠/virados don't count, but card majority (3pts) still does at 17
        score += totalCards * 5; // Extra weight on raw card count
      }
      if (player.score >= 20) {
        // At 20, only spades majority counts
        score += spadesCollected * 10;
      }

      return score;
    }

    case 'formar': {
      let score = 80;
      const handCard = player.hand.find(c => c.id === action.cardId);
      if (handCard) {
        score += handCard.value * 3;
        // Prefer forming with high-value targets for bigger payoff later
        if (handCard.value >= 10) score += 15;
      }

      // Check if this blocks opponent from taking the same cards
      const boardCards = action.boardCardIds?.map(id => state.board.cards.find(c => c.id === id)).filter(Boolean) || [];
      const hasHighValueCards = boardCards.some(c => c && (c.rank === 'A' || (c.suit === 'diamonds' && c.rank === '10')));
      if (hasHighValueCards) score += 20; // Protecting high-value cards from opponent

      return score;
    }

    case 'formarPar': {
      let score = 75;
      if (action.formationId) {
        const f = state.board.formations.find(fo => fo.id === action.formationId);
        if (f) {
          score += f.cards.length * 5;
          // If we're grouping with an opponent's formation, we're blocking them
          if (f.createdBy === opponentId) score += 25;
        }
      }
      return score;
    }

    case 'aumentarFormacion': {
      let score = 65;
      const f = state.board.formations.find(fo => fo.id === action.formationId);
      if (f) {
        // Increasing opponent's formation to take control
        if (f.createdBy === opponentId) score += 20;
        // Higher resulting value = more strategic
        const handCard = player.hand.find(c => c.id === action.cardId);
        if (handCard) score += (f.value + handCard.value) * 2;
      }
      return score;
    }

    case 'cantar': {
      let score = 55;
      // Singing is protective — consider if opponent could take the Ace
      const aceCount = player.hand.filter(c => c.rank === 'A').length;
      if (aceCount >= 3) score += 15; // Multiple Aces = safe to sing
      // Extra value if board has loose Aces we could collect later
      const boardAces = state.board.cards.filter(c => c.rank === 'A').length;
      if (boardAces > 0) score += 10;
      return score;
    }

    case 'colocar':
    case 'botar': {
      let score = -10; // Dropping is the last resort
      const card = player.hand.find(c => c.id === action.cardId);
      if (card) {
        // Strongly avoid dropping high-scoring cards
        if (card.rank === 'A') score -= 40;
        if (card.suit === 'diamonds' && card.rank === '10') score -= 50;
        if (card.suit === 'spades' && card.rank === '2') score -= 25;
        if (card.suit === 'spades') score -= 5;

        // Prefer dropping low-value cards
        score -= card.value * 2;

        // STRATEGIC: Avoid dropping cards that help the opponent form
        // If dropping a card that matches an opponent formation value, penalize
        if (opponentId) {
          const opponentFormations = state.board.formations.filter(f => f.createdBy === opponentId);
          const matchesOpponent = opponentFormations.some(f => f.value === card.value);
          if (matchesOpponent) score -= 15;
        }
      }
      return score;
    }

    default:
      return -200;
  }
}
