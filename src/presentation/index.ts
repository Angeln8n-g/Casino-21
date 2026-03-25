import { DefaultGameEngine } from '../application/game-engine';
import { runGameLoop } from './cli';
import { askQuestion, closeCLI } from './utils';
import * as fs from 'fs';
import * as path from 'path';

async function startMenu() {
  console.log('================================');
  console.log('      CASINO 21 CARD GAME       ');
  console.log('================================\n');

  while (true) {
    console.log('1. Nueva partida 1v1');
    console.log('2. Nueva partida 2v2');
    console.log('3. Cargar partida');
    console.log('4. Salir');
    
    const choice = await askQuestion('\nSelecciona una opción: ');
    
    const engine = new DefaultGameEngine();

    if (choice === '1') {
      const p1 = await askQuestion('Nombre Jugador 1: ');
      const p2 = await askQuestion('Nombre Jugador 2: ');
      const result = engine.startNewGame('1v1', [p1 || 'P1', p2 || 'P2']);
      if (result.success) {
        await runGameLoop(engine);
      }
      break;
    } else if (choice === '2') {
      const p1 = await askQuestion('Nombre Equipo 1 - Jugador 1: ');
      const p2 = await askQuestion('Nombre Equipo 2 - Jugador 1: ');
      const p3 = await askQuestion('Nombre Equipo 1 - Jugador 2: ');
      const p4 = await askQuestion('Nombre Equipo 2 - Jugador 2: ');
      const result = engine.startNewGame('2v2', [p1 || 'E1P1', p2 || 'E2P1', p3 || 'E1P2', p4 || 'E2P2']);
      if (result.success) {
        await runGameLoop(engine);
      }
      break;
    } else if (choice === '3') {
      const fileName = await askQuestion('Nombre del archivo (sin .json): ');
      const filePath = path.join(process.cwd(), `${fileName}.json`);
      if (fs.existsSync(filePath)) {
        try {
          const json = fs.readFileSync(filePath, 'utf8');
          const result = engine.loadGame(json);
          if (result.success) {
            console.log('Partida cargada exitosamente.');
            await runGameLoop(engine);
            break;
          } else {
            console.log(`Error al cargar la partida: ${result.error}`);
          }
        } catch (e) {
          console.log('Error leyendo el archivo.');
        }
      } else {
        console.log('Archivo no encontrado.');
      }
    } else if (choice === '4') {
      console.log('¡Hasta luego!');
      break;
    } else {
      console.log('Opción inválida.\n');
    }
  }

  closeCLI();
}

// Start the app
startMenu().catch(console.error);
