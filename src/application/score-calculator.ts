import { GameState } from '../domain/game-state';
import { Card } from '../domain/card';
import { ScoreBreakdown, Points } from '../domain/types';

export interface ScoreResult {
  breakdowns: ScoreBreakdown[];
  newState: GameState;
}

export interface ScoreCalculator {
  calculateRoundScore(state: GameState): ScoreResult;
  checkEarlyWin(state: GameState): { isWin: boolean, winnerId?: string, reason?: string };
}

export class DefaultScoreCalculator implements ScoreCalculator {
  checkEarlyWin(state: GameState): { isWin: boolean, winnerId?: string, reason?: string } {
    const is2v2 = state.mode === '2v2';
    const entities = is2v2 ? state.teams : state.players;

    for (const entity of entities) {
      let collectedCards: Card[] = [];
      let virados = 0;
      let currentScore = entity.score;

      if (is2v2) {
        const teamPlayers = state.players.filter(p => p.teamId === entity.id);
        teamPlayers.forEach(p => {
          collectedCards = collectedCards.concat(p.collectedCards);
          virados += p.virados;
        });
        collectedCards = collectedCards.concat(entity.collectedCards);
        virados += entity.virados;
      } else {
        collectedCards = [...entity.collectedCards];
        virados = entity.virados;
      }

      let guaranteedPoints = 0;

      // Check guaranteed cards majority (27+)
      const hasCardMajority = collectedCards.length >= 27;
      if (hasCardMajority) {
        guaranteedPoints += 3;
      }

      // Check guaranteed spades majority (7+)
      const spadesCount = collectedCards.filter(c => c.suit === 'spades').length;
      const hasSpadesMajority = spadesCount >= 7;
      if (hasSpadesMajority) {
        guaranteedPoints += 1;
      }

      // Virados are already counted in real-time or end of round, but let's ensure we only count them if they are NOT already in entity.score.
      // Wait, in game-engine.ts virados might not be added to entity.score until the end of the round.
      // Actually, if we want to be safe, virados earned IN THIS ROUND are strictly added here:
      const totalAssuredScore = currentScore + guaranteedPoints + virados;

      if (totalAssuredScore >= 21) {
        let reason = 'Ganó por asegurar ';
        if (hasCardMajority && hasSpadesMajority) reason += 'Mayoría de Cartas y Mayoría de Picas';
        else if (hasCardMajority) reason += 'Mayoría de Cartas';
        else if (hasSpadesMajority) reason += 'Mayoría de Picas';
        else if (virados > 0) reason += 'Virados suficientes';
        else reason += 'puntos asegurados';

        return { isWin: true, winnerId: entity.id, reason };
      }
    }

    return { isWin: false };
  }

  calculateRoundScore(state: GameState): ScoreResult {
    const is2v2 = state.mode === '2v2';
    const entities = is2v2 ? state.teams : state.players;

    // Collect all cards for each entity to calculate majorities
    const entityCollections = entities.map(entity => {
      let collectedCards: Card[] = [];
      let virados = 0;
      let currentScore = entity.score;

      if (is2v2) {
        const teamPlayers = state.players.filter(p => p.teamId === entity.id);
        teamPlayers.forEach(p => {
          collectedCards = collectedCards.concat(p.collectedCards);
          virados += p.virados;
        });
        // Team might also have collected cards directly in some implementations, but usually it's on players
        collectedCards = collectedCards.concat(entity.collectedCards);
        virados += entity.virados;
      } else {
        collectedCards = [...entity.collectedCards];
        virados = entity.virados;
      }

      return {
        id: entity.id,
        currentScore,
        cards: collectedCards,
        virados
      };
    });

    // Determine majorities
    let maxCards = -1;
    let entitiesWithMaxCards: string[] = [];
    
    let maxSpades = -1;
    let entitiesWithMaxSpades: string[] = [];

    entityCollections.forEach(ec => {
      const cardCount = ec.cards.length;
      if (cardCount > maxCards) {
        maxCards = cardCount;
        entitiesWithMaxCards = [ec.id];
      } else if (cardCount === maxCards) {
        entitiesWithMaxCards.push(ec.id);
      }

      const spadesCount = ec.cards.filter(c => c.suit === 'spades').length;
      if (spadesCount > maxSpades) {
        maxSpades = spadesCount;
        entitiesWithMaxSpades = [ec.id];
      } else if (spadesCount === maxSpades) {
        entitiesWithMaxSpades.push(ec.id);
      }
    });

    const breakdowns: ScoreBreakdown[] = entityCollections.map(ec => {
      let points: Points = {
        cards: 0,
        spades: 0,
        tenOfDiamonds: 0,
        twoOfSpades: 0,
        aces: 0,
        virados: 0,
        total: 0
      };

      // Base points calculation
      if (entitiesWithMaxCards.length === 1 && entitiesWithMaxCards[0] === ec.id) {
        points.cards = 3;
      }
      if (entitiesWithMaxSpades.length === 1 && entitiesWithMaxSpades[0] === ec.id) {
        points.spades = 1;
      }

      const has10Diamonds = ec.cards.some(c => c.suit === 'diamonds' && c.rank === '10');
      if (has10Diamonds) points.tenOfDiamonds = 2;

      const has2Spades = ec.cards.some(c => c.suit === 'spades' && c.rank === '2');
      if (has2Spades) points.twoOfSpades = 1;

      const acesCount = ec.cards.filter(c => c.rank === 'A').length;
      points.aces = acesCount;

      points.virados = ec.virados;

      // Apply special rules based on current score
      if (ec.currentScore === 17) {
        points.tenOfDiamonds = 0;
        points.twoOfSpades = 0;
        points.aces = 0;
        points.virados = 0;
      } else if (ec.currentScore === 18 || ec.currentScore === 19) {
        points.spades = 0;
        points.tenOfDiamonds = 0;
        points.twoOfSpades = 0;
        points.aces = 0;
        points.virados = 0;
      } else if (ec.currentScore === 20) {
        points.cards = 0;
        points.tenOfDiamonds = 0;
        points.twoOfSpades = 0;
        points.aces = 0;
        points.virados = 0;
      }

      points.total = points.cards + points.spades + points.tenOfDiamonds + points.twoOfSpades + points.aces + points.virados;

      return {
        id: ec.id,
        points
      };
    });

    // Apply points to state
    let newPlayers = [...state.players];
    let newTeams = [...state.teams];

    if (is2v2) {
      newTeams = state.teams.map(team => {
        const breakdown = breakdowns.find(b => b.id === team.id);
        return {
          ...team,
          score: team.score + (breakdown?.points.total || 0),
          virados: 0, // Reset virados for next round
          collectedCards: [] // Reset collected cards
        };
      });
      // Also reset players in teams
      newPlayers = state.players.map(player => ({
        ...player,
        virados: 0,
        collectedCards: []
      }));
    } else {
      newPlayers = state.players.map(player => {
        const breakdown = breakdowns.find(b => b.id === player.id);
        return {
          ...player,
          score: player.score + (breakdown?.points.total || 0),
          virados: 0, // Reset virados for next round
          collectedCards: [] // Reset collected cards
        };
      });
    }

    const newState: GameState = {
      ...state,
      players: newPlayers,
      teams: newTeams
    };

    return { breakdowns, newState };
  }
}
