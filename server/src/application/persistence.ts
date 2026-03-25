import { GameState, validateGameState } from '../domain/game-state';

export interface SerializedGameState {
  version: number;
  state: GameState;
}

export const CURRENT_VERSION = 1;

export function serializeGameState(state: GameState): string {
  const serialized: SerializedGameState = {
    version: CURRENT_VERSION,
    state
  };
  return JSON.stringify(serialized, null, 2);
}

export function deserializeGameState(json: string): GameState {
  try {
    const serialized = JSON.parse(json) as SerializedGameState;
    
    if (serialized.version !== CURRENT_VERSION) {
      throw new Error(`Unsupported save version: ${serialized.version}`);
    }

    const state = serialized.state;
    
    // Validar integridad del estado cargado
    validateGameState(state);
    
    return state;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
}
