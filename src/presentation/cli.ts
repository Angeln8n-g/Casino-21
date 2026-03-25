import { GameState } from '../domain/game-state';
import { Card } from '../domain/card';
import { Action } from '../application/action-validator';
import { Formation, CantedCard } from '../domain/board';
import { GameEngine, DefaultGameEngine } from '../application/game-engine';
import { askQuestion, closeCLI } from './utils';
import * as fs from 'fs';
import * as path from 'path';

function formatCard(card: Card): string {
  const suitSymbol = {
    spades: '♠',
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣'
  }[card.suit];
  return `[${card.rank}${suitSymbol}]`;
}

function formatCards(cards: readonly Card[]): string {
  return cards.map(formatCard).join(' ');
}

function formatFormation(formation: Formation): string {
  return `{Valor: ${formation.value}, Cartas: ${formatCards(formation.cards)}}`;
}

function formatCanted(canted: CantedCard): string {
  return `${formatCard(canted.card)} (cantada por ${canted.cantedBy})`;
}

export function displayGameState(state: GameState) {
  console.log('\n======================================');
  console.log(`Ronda: ${state.roundCount} | Turno: ${state.turnCount}`);
  
  // Display Board
  console.log('\n--- TABLERO ---');
  if (state.board.cards.length > 0) {
    console.log(`Cartas sueltas: ${formatCards(state.board.cards)}`);
  } else {
    console.log('Cartas sueltas: (Ninguna)');
  }
  
  if (state.board.formations.length > 0) {
    console.log('Formaciones:');
    state.board.formations.forEach((f, i) => console.log(`  ${i + 1}. ${formatFormation(f)}`));
  }
  
  if (state.board.cantedCards.length > 0) {
    console.log('Cartas cantadas:');
    state.board.cantedCards.forEach((c, i) => console.log(`  ${i + 1}. ${formatCanted(c)}`));
  }
  console.log('----------------');

  // Display Players Scores
  console.log('\n--- PUNTUACIONES ---');
  if (state.mode === '1v1') {
    state.players.forEach(p => {
      console.log(`${p.name}: ${p.score} pts (Virados: ${p.virados}, Cartas recogidas: ${p.collectedCards.length})`);
    });
  } else {
    state.teams.forEach((t, i) => {
      const pNames = t.playerIds.map(id => state.players.find(p => p.id === id)?.name).join(' y ');
      console.log(`Equipo ${i + 1} (${pNames}): ${t.score} pts (Virados: ${t.virados}, Cartas: ${t.collectedCards.length})`);
    });
  }

  // Display Current Player
  const currentPlayer = state.players[state.currentTurnPlayerIndex];
  console.log(`\nEs el turno de: **${currentPlayer.name}**`);
  console.log(`Tu mano: ${formatCards(currentPlayer.hand)}`);
  console.log('======================================\n');
}

export async function promptAction(engine: GameEngine, state: GameState): Promise<Action | null> {
  const currentPlayer = state.players[state.currentTurnPlayerIndex];
  const validActions = engine.getValidActions(state, currentPlayer.id);

  if (validActions.length === 0) {
    console.log('No tienes acciones válidas.');
    return null;
  }

  console.log('Acciones disponibles:');
  validActions.forEach((action, index) => {
    let desc = '';
    switch (action.type) {
      case 'colocar':
        desc = `Colocar carta ${formatCard(currentPlayer.hand.find(c => c.id === action.cardId)!)}`;
        break;
      case 'llevar':
        const boardCards = action.boardCardIds ? action.boardCardIds.map(id => state.board.cards.find(c => c.id === id)!) : [];
        const fIds = action.formationIds ? action.formationIds : [];
        desc = `Llevar con ${formatCard(currentPlayer.hand.find(c => c.id === action.cardId)!)}`;
        if (boardCards.length > 0) desc += ` las cartas ${formatCards(boardCards)}`;
        if (fIds.length > 0) desc += ` y ${fIds.length} formaciones`;
        break;
      case 'formar':
        desc = `Crear formación con la carta ${formatCard(currentPlayer.hand.find(c => c.id === action.cardId)!)}`;
        break;
      case 'formarPar':
        desc = `Añadir carta ${formatCard(currentPlayer.hand.find(c => c.id === action.cardId)!)} a formación`;
        break;
      case 'cantar':
        desc = `Cantar carta ${formatCard(currentPlayer.hand.find(c => c.id === action.cardId)!)}`;
        break;
    }
    console.log(`${index + 1}. ${desc}`);
  });

  while (true) {
    const choice = await askQuestion('Elige una acción (número), o escribe "s" para guardar partida: ');
    if (choice.toLowerCase() === 's') {
      return null; // Return null to indicate save request
    }
    const num = parseInt(choice);
    if (!isNaN(num) && num > 0 && num <= validActions.length) {
      return validActions[num - 1];
    }
    console.log('Opción inválida. Intenta de nuevo.');
  }
}

export async function runGameLoop(engine: GameEngine) {
  let state = engine.getCurrentState();
  if (!state) return;

  while (state.phase !== 'completed') {
    displayGameState(state);
    const action = await promptAction(engine, state);

    if (action === null) {
      // Guardar partida
      const saveName = await askQuestion('Nombre del archivo para guardar (ej. partida1): ');
      if (saveName) {
        const json = engine.saveGame(state);
        fs.writeFileSync(path.join(process.cwd(), `${saveName}.json`), json);
        console.log(`Partida guardada exitosamente en ${saveName}.json`);
      }
      continue;
    }

    const result = engine.playCard(state, action);
    if (result.success) {
      state = result.value;
      console.log('¡Acción realizada con éxito!');
    } else {
      const errorMessages: Record<string, string> = {
        'INVALID_CARD': 'Carta inválida.',
        'DECK_EMPTY': 'El mazo está vacío.',
        'INVALID_ACTION': 'Acción inválida para el estado actual.',
        'NOT_YOUR_TURN': 'No es tu turno.',
        'CARD_NOT_IN_HAND': 'La carta seleccionada no está en tu mano.',
        'INVALID_FORMATION_SUM': 'La suma de las cartas no coincide para crear la formación.',
        'FORMATION_NOT_FOUND': 'La formación seleccionada no existe en el tablero.',
        'CARD_PROTECTED': 'La carta seleccionada está protegida (cantada) y no puede ser llevada todavía.',
        'INVALID_STATE': 'Estado de juego inválido.'
      };
      const errorMsg = errorMessages[result.error] || result.error;
      console.log(`\n❌ Error: ${errorMsg}`);
      await askQuestion('Presiona Enter para continuar...');
    }
  }

  console.log('\n🎉 ¡JUEGO TERMINADO! 🎉');
  displayGameState(state);
  
  if (state.winnerId) {
    let winnerName = state.winnerId;
    if (state.mode === '1v1') {
      const p = state.players.find(p => p.id === state.winnerId);
      if (p) winnerName = p.name;
    } else {
      winnerName = `Equipo ${state.winnerId}`;
    }
    console.log(`\n🏆 EL GANADOR ES: ${winnerName} 🏆\n`);
  }
}
