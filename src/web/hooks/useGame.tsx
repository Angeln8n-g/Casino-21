import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { GameState } from '../../domain/game-state';
import { GameMode } from '../../domain/types';
import { Action } from '../../application/action-validator';
import { socketService } from '../services/socket';

interface GameContextType {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  localPlayerId: string | null;
  setLocalPlayerId: (id: string) => void;
  playCard: (action: Action) => void;
  error: string | null;
  clearError: () => void;
  continueToNextRound: () => void;
  timeRemaining: number;
  disconnectionMessage: string | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(30000);
  const [disconnectionMessage, setDisconnectionMessage] = useState<string | null>(null);

  // Escuchar eventos del servidor
  React.useEffect(() => {
    let mounted = true;
    let currentSocket: any = null;

    const setupSocket = async () => {
      try {
        currentSocket = await socketService.connect();
        if (mounted && currentSocket) {
          currentSocket.on('action_error', (msg: string) => {
            setError(msg);
          });
          
          currentSocket.on('timer_update', ({ remaining }: { remaining: number }) => {
            setTimeRemaining(remaining);
          });

          currentSocket.on('player_disconnected', ({ message }: { message: string }) => {
            setDisconnectionMessage(message);
          });
          currentSocket.on('player_reconnected', () => {
            setDisconnectionMessage(null); // Limpiar mensaje de desconexión si vuelve
          });

          currentSocket.on('room_joined', ({ playerId }: { playerId: string }) => {
            setLocalPlayerId(playerId);
          });

          currentSocket.on('game_state_update', (state: GameState) => {
            setGameState(state);
          });
        }
      } catch (err) {
        console.error("Error setting up socket in useGame:", err);
      }
    };

    setupSocket();

    return () => {
      mounted = false;
      if (currentSocket) {
        currentSocket.off('action_error');
        currentSocket.off('timer_update');
        currentSocket.off('player_disconnected');
        currentSocket.off('player_reconnected');
        currentSocket.off('room_joined');
        currentSocket.off('game_state_update');
      }
    };
  }, []);

  const playCard = useCallback((action: Action) => {
    setError(null);
    // Ya no mutamos localmente, enviamos al servidor
    // Para simplificar, asumimos que el roomId se puede deducir o guardar globalmente
    // idealmente lo guardamos en el contexto o usamos una lógica de sesión.
    // Aquí mandaremos el evento simple y confiaremos en que el servidor lo asocia por el socket.id
    const socket = socketService.getSocket();
    
    // Como el servidor espera un roomId, por ahora asumiremos que el servidor 
    // lo busca por el socket.id o lo pasamos explícitamente. 
    // Haremos que el cliente no necesite enviar el roomId explícitamente en cada acción
    // si ajustamos el servidor, o lo buscamos en el servidor.
    socket.emit('play_action', action);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const continueToNextRound = useCallback(() => {
    const socket = socketService.getSocket();
    socket.emit('continue_round');
  }, []);

  return (
    <GameContext.Provider 
      value={{ 
        gameState, 
        setGameState,
        localPlayerId,
        setLocalPlayerId,
        playCard, 
        error, 
        clearError, 
        continueToNextRound,
        timeRemaining,
        disconnectionMessage
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
