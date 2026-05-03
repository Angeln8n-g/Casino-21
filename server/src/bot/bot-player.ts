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

export type BotDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** Unique identifier for the bot player (never collides with real Supabase UUIDs) */
export const BOT_USER_ID = 'bot-easy';

/** Display names per difficulty */
export const BOT_NAMES: Record<BotDifficulty, string> = {
  easy:   'Bot Fácil 🤖',
  medium: 'Bot Medio 🧠',
  hard:   'Bot Difícil 👑',
  expert: 'Bot Experto ⚜️',
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

      case 'expert':
        return getExpertAction(engine, state, playerId);

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
      let score = 100; // Forming is strategically important
      const handCard = player.hand.find(c => c.id === action.cardId);
      if (handCard) {
        score += handCard.value * 3;
        // Prefer forming with high-value targets for bigger payoff later
        if (handCard.value >= 10) score += 20;
      }

      // Check if this blocks opponent from taking the same cards
      const boardCards = action.boardCardIds?.map(id => state.board.cards.find(c => c.id === id)).filter(Boolean) || [];
      const hasHighValueCards = boardCards.some(c => c && (c.rank === 'A' || (c.suit === 'diamonds' && c.rank === '10')));
      if (hasHighValueCards) score += 25; // Protecting high-value cards from opponent

      // Prefer formations that lock more cards (more board cards = better)
      score += (boardCards.length) * 8;

      // Bonus: if opponent could take these board cards on their turn, forming protects them
      if (opponentId && opponent) {
        const opponentHand = opponent.hand || [];
        const wouldBeVulnerable = boardCards.some(bc => bc && opponentHand.some(oh => oh.value === bc.value));
        if (wouldBeVulnerable) score += 20; // Prevent opponent from taking these cards
      }

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

// ─────────────────────────────────────────────
// EXPERT difficulty
// ─────────────────────────────────────────────

function getExpertAction(engine: DefaultGameEngine, state: GameState, playerId: string): Action {
  const validActions = engine.getValidActions(state, playerId);
  if (validActions.length === 0) return engine.getTimeoutAction(state, playerId);

  const player = state.players.find(p => p.id === playerId);
  if (!player) return engine.getTimeoutAction(state, playerId);

  const opponent = state.players.find(p => p.id !== playerId);

  let bestAction: Action = validActions[0];
  let bestScore = -Infinity;

  for (const action of validActions) {
    const score = scoreExpertAction(action, state, playerId, opponent?.id);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
}

function scoreExpertAction(action: Action, state: GameState, playerId: string, opponentId?: string): number {
  const player = state.players.find(p => p.id === playerId)!;
  const opponent = opponentId ? state.players.find(p => p.id === opponentId) : undefined;

  // EXPERT FEATURE: Conteo de Cartas (Memoria)
  // Calcula cuántas cartas de un valor específico son conocidas públicamente o en mano del bot
  const getKnownCount = (val: number): number => {
    let count = 0;
    // 1. En la mano del bot
    count += player.hand.filter(c => c.value === val).length;
    // 2. En la mesa (sueltas y cantadas)
    count += state.board.cards.filter(c => c.value === val).length;
    count += state.board.cantedCards.filter(cc => cc.card.value === val).length;
    // 3. Dentro de formaciones
    state.board.formations.forEach(f => {
      count += f.cards.filter(c => c.value === val).length;
    });
    // 4. Cartas recogidas por TODOS los jugadores (basurero público)
    state.players.forEach(p => {
      count += p.collectedCards.filter(c => c.value === val).length;
    });
    return count;
  };

  switch (action.type) {
    case 'llevar': {
      const la = action as LlevarAction;
      let score = 300; // Base score for taking

      // Base card count logic (same as hard)
      const boardCardCount = la.boardCardIds.length;
      const formationCardCount = la.formationIds.reduce((sum, fid) => {
        const f = state.board.formations.find(fo => fo.id === fid);
        return sum + (f ? f.cards.length : 0);
      }, 0);
      const totalCards = boardCardCount + formationCardCount + 1;
      score += totalCards * 10;

      // EXPERT FEATURE: "llevar formaciones de cartas sueltas"
      // If we are taking BOTH formations AND loose cards at the same time, this is highly efficient
      if (la.formationIds.length > 0 && la.boardCardIds.length > 0) {
        score += 50; // Massive bonus for combining formation takes with loose cards
      }

      // EXPERT FEATURE: "llevar combinación de cartas sueltas" (Ej. llevarse un 8 y un 4 con un 12)
      // Si el bot se lleva más de una carta suelta, significa que está sumando sus valores.
      // Premiamos esta jugada porque es muy eficiente para limpiar la mesa y recolectar cartas.
      if (la.boardCardIds.length > 1 && la.formationIds.length === 0) {
        // Se está llevando múltiples cartas sueltas sumadas (ej. 8 + 4 = 12)
        score += la.boardCardIds.length * 35; // +70 por llevarse 2 cartas sueltas, +105 por 3, etc.
      }

      // High-value scoring cards
      const allCardsToCollect = la.boardCardIds.map(id => {
        let card = state.board.cards.find(c => c.id === id);
        if (!card) {
          const canted = state.board.cantedCards.find(cc => cc.card.id === id);
          if (canted) card = canted.card;
        }
        return card;
      }).filter(Boolean);

      for (const fid of la.formationIds) {
        const f = state.board.formations.find(fo => fo.id === fid);
        if (f) allCardsToCollect.push(...f.cards);
      }

      let spadesCollected = 0;
      for (const card of allCardsToCollect) {
        if (!card) continue;
        if (card.rank === 'A') score += 20;
        if (card.suit === 'diamonds' && card.rank === '10') score += 35;
        if (card.suit === 'spades' && card.rank === '2') score += 18;
        if (card.suit === 'spades') { spadesCollected++; score += 5; }
      }

      const currentSpades = player.collectedCards.filter(c => c.suit === 'spades').length;
      const opponentSpades = opponent?.collectedCards.filter(c => c.suit === 'spades').length || 0;
      if (currentSpades + spadesCollected > opponentSpades) score += 15;

      const currentCardCount = player.collectedCards.length;
      const opponentCardCount = opponent?.collectedCards.length || 0;
      if (currentCardCount + totalCards > opponentCardCount) score += 20;

      // Formations logic
      const ownFormations = la.formationIds.filter(fid =>
        state.board.formations.find(f => f.id === fid && f.createdBy === playerId)
      );
      score += ownFormations.length * 35; // Better prioritized

      if (opponentId) {
        const opponentFormations = la.formationIds.filter(fid =>
          state.board.formations.find(f => f.id === fid && f.createdBy === opponentId)
        );
        score += opponentFormations.length * 30; // Better prioritized
      }

      // Virado detection
      const remainingBoardCards = state.board.cards.length - boardCardCount;
      const remainingFormations = state.board.formations.length - la.formationIds.length;
      const cantedTaken = la.boardCardIds.filter(id =>
        state.board.cantedCards.some(cc => cc.card.id === id)
      ).length;
      const remainingCanted = state.board.cantedCards.length - cantedTaken;
      if (remainingBoardCards <= 0 && remainingFormations <= 0 && remainingCanted <= 0) {
        score += 80; // Virado is extremely valuable for Expert
        if (opponent && opponent.virados > 0) score += 30;
      }

      if (player.score >= 17) {
        score += totalCards * 8;
      }
      if (player.score >= 20) {
        score += spadesCollected * 15;
      }

      return score;
    }

    case 'formar': {
      let score = 150; // Expert values forming higher than Hard (was 100)
      const handCard = player.hand.find(c => c.id === action.cardId);
      if (handCard) {
        score += handCard.value * 4;
        if (handCard.value >= 10) score += 25;
      }

      const boardCards = action.boardCardIds?.map(id => state.board.cards.find(c => c.id === id)).filter(Boolean) || [];
      
      // EXPERT FEATURE: "formar con cartas sueltas"
      // If forming with multiple loose cards (e.g. 2 + 3 = 5), highly prioritized
      if (boardCards.length > 1) {
        score += boardCards.length * 20; // 2 cards = +40, 3 cards = +60
      } else {
        score += boardCards.length * 10;
      }

      const hasHighValueCards = boardCards.some(c => c && (c.rank === 'A' || (c.suit === 'diamonds' && c.rank === '10')));
      if (hasHighValueCards) score += 35; // Protect them even more

      // EXPERT FEATURE: Formación Segura con Conteo
      // Si formamos con una carta de nuestra mano, y sabemos que ya no quedan más copias de ese valor para el rival,
      // la formación es "Inrobable" (Unstealable).
      if (handCard) {
        const knownCount = getKnownCount(handCard.value);
        if (knownCount >= 4) {
          score += 120; // Absolutamente seguro formarla, nadie nos la puede robar
        }
      }

      if (opponentId && opponent) {
        const opponentHand = opponent.hand || [];
        const wouldBeVulnerable = boardCards.some(bc => bc && opponentHand.some(oh => oh.value === bc.value));
        if (wouldBeVulnerable) score += 30;
      }

      return score;
    }

    case 'formarPar': {
      let score = 100;
      if (action.formationId) {
        const f = state.board.formations.find(fo => fo.id === action.formationId);
        if (f) {
          score += f.cards.length * 8;
          if (f.createdBy === opponentId) score += 35;
        }
      }
      return score;
    }

    case 'aumentarFormacion': {
      let score = 90;
      const f = state.board.formations.find(fo => fo.id === action.formationId);
      if (f) {
        if (f.createdBy === opponentId) score += 30;
        const handCard = player.hand.find(c => c.id === action.cardId);
        if (handCard) score += (f.value + handCard.value) * 3;
      }
      return score;
    }

    case 'cantar': {
      let score = 70;
      const aceCount = player.hand.filter(c => c.rank === 'A').length;
      if (aceCount >= 3) score += 20;
      const boardAces = state.board.cards.filter(c => c.rank === 'A').length;
      if (boardAces > 0) score += 15;
      return score;
    }

    case 'colocar':
    case 'botar': {
      let score = -20;
      const card = player.hand.find(c => c.id === action.cardId);
      if (card) {
        if (card.rank === 'A') score -= 50;
        if (card.suit === 'diamonds' && card.rank === '10') score -= 60;
        if (card.suit === 'spades' && card.rank === '2') score -= 30;
        if (card.suit === 'spades') score -= 10;

        score -= card.value * 3;

        if (opponentId) {
          const opponentFormations = state.board.formations.filter(f => f.createdBy === opponentId);
          const matchesOpponent = opponentFormations.some(f => f.value === card.value);
          if (matchesOpponent) score -= 25;
        }

        // EXPERT FEATURE: Conteo de Cartas para botar seguro
        const knownCount = getKnownCount(card.value);
        if (knownCount >= 4) {
          score += 100; // 100% seguro botarla, nadie más tiene esta carta.
        } else if (knownCount === 3) {
          score += 40;  // Muy probable que nadie la tenga, bastante seguro.
        }

        // EXPERT FEATURE: Prevención de Virado (Look-ahead preventivo)
        // Si botamos una carta y la mesa queda con esa única carta, es un "Virado regalado"
        const boardItemsCount = state.board.cards.length + state.board.formations.length + state.board.cantedCards.length;
        if (boardItemsCount === 0 && knownCount < 4) {
          // Dejar la mesa con 1 sola carta (la que acabamos de botar) que el oponente AÚN podría tener
          score -= 150; // ¡Pánico! Regalo de Virado.
        }
      }
      return score;
    }

    default:
      return -300;
  }
}
