import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { GameState } from '../../domain/game-state';
import {
  gameReducer,
  initialGameState,
  MobileGameState,
  GameAction,
} from './gameReducer';
import { socketService } from '../services/socketService';

// Feature: react-native-game-migration
// Requirements: 5.7, 7.2, 7.4, 8.3, 8.5

interface GameContextValue {
  state: MobileGameState;
  dispatch: React.Dispatch<GameAction>;
}

export const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  useEffect(() => {
    const handleGameStateUpdate = (data: unknown) => {
      dispatch({ type: 'SET_GAME_STATE', payload: data as GameState });
    };

    const handleTimerUpdate = (data: unknown) => {
      dispatch({ type: 'SET_TIME_REMAINING', payload: data as number });
    };

    const handlePlayerDisconnected = (data: unknown) => {
      dispatch({
        type: 'SET_DISCONNECTION_MESSAGE',
        payload: data as string | null,
      });
    };

    /**
     * Register game event listeners on the socket.
     * Called both immediately (if socket is already connected) and
     * whenever the socket (re)connects — so listeners are always active.
     */
    function registerListeners(): void {
      try {
        socketService.on('game_state_update', handleGameStateUpdate);
        socketService.on('timer_update', handleTimerUpdate);
        socketService.on('player_disconnected', handlePlayerDisconnected);
      } catch {
        // Socket not connected yet — will register on next connect event
      }
    }

    // Register immediately in case socket is already connected
    registerListeners();

    // Also re-register whenever the socket connects (handles late connect)
    try {
      socketService.on('connect', registerListeners);
    } catch {
      // Socket not available yet — connect listener will be added when socket connects
    }

    return () => {
      try {
        socketService.off('game_state_update');
        socketService.off('timer_update');
        socketService.off('player_disconnected');
        socketService.off('connect');
      } catch {
        // Socket may already be disconnected
      }
    };
  }, []);

  // Memoize context value so that object identity only changes when state or
  // dispatch actually change. Without this, every SET_TIME_REMAINING tick
  // (once per second) would create a new context value object and force ALL
  // useGame() consumers to re-render — even components that don't use
  // timeRemaining (BoardView, HandView, ActionPanel, etc.).
  const contextValue = useMemo<GameContextValue>(
    () => ({ state, dispatch }),
    [state, dispatch],
  );

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

/**
 * Hook to access the GameContext from any component.
 * Throws if used outside of GameProvider.
 */
export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
