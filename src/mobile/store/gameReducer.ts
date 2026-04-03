import { GameState } from '../../domain/game-state';

// Feature: react-native-game-migration
// Requirements: 8.1, 8.2, 8.4

export interface MobileGameState {
  gameState: GameState | null;
  localPlayerId: string | null;
  error: string | null;
  timeRemaining: number;
  disconnectionMessage: string | null;
}

export type GameAction =
  | { type: 'SET_GAME_STATE'; payload: GameState | null }
  | { type: 'SET_LOCAL_PLAYER_ID'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_TIME_REMAINING'; payload: number }
  | { type: 'SET_DISCONNECTION_MESSAGE'; payload: string | null };

export const initialGameState: MobileGameState = {
  gameState: null,
  localPlayerId: null,
  error: null,
  timeRemaining: 0,
  disconnectionMessage: null,
};

/**
 * Pure reducer for mobile game state.
 * gameState is only updated when SET_GAME_STATE is dispatched (i.e., on server game_state_update).
 * No optimistic local mutations.
 */
export function gameReducer(state: MobileGameState, action: GameAction): MobileGameState {
  switch (action.type) {
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.payload };

    case 'SET_LOCAL_PLAYER_ID':
      return { ...state, localPlayerId: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_TIME_REMAINING':
      return { ...state, timeRemaining: action.payload };

    case 'SET_DISCONNECTION_MESSAGE':
      return { ...state, disconnectionMessage: action.payload };

    default:
      return state;
  }
}
