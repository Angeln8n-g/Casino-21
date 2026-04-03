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
  pendingInvitationRoom: string | null;
  clearPendingInvitationRoom: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(30000);
  const [disconnectionMessage, setDisconnectionMessage] = useState<string | null>(null);
  const [pendingInvitationRoom, setPendingInvitationRoom] = useState<string | null>(null);

  // Escuchar eventos del servidor
  React.useEffect(() => {
    let currentSocket: any = null;
    let retryTimer: any = null;

    const bindSocketEvents = (socket: any) => {
      socket.off('action_error');
      socket.off('timer_update');
      socket.off('player_disconnected');
      socket.off('player_reconnected');
      socket.off('room_joined');
      socket.off('room_created');
      socket.off('game_state_update');
      socket.off('game_invitation_accepted');

      socket.on('action_error', (msg: string) => {
        setError(msg);
      });
      
      socket.on('timer_update', ({ remaining }: { remaining: number }) => {
        setTimeRemaining(remaining);
      });

      socket.on('player_disconnected', ({ message }: { message: string }) => {
        setDisconnectionMessage(message);
      });
      socket.on('player_reconnected', () => {
        setDisconnectionMessage(null);
      });

      socket.on('room_joined', ({ playerId }: { playerId: string }) => {
        setLocalPlayerId(playerId);
      });

      socket.on('room_created', ({ playerId }: { playerId: string }) => {
        setLocalPlayerId(playerId);
      });

      socket.on('game_state_update', (state: GameState) => {
        setGameState(state);
      });

      // Cuando el sender recibe que su invitación fue aceptada, se une a la sala creada
      socket.on('game_invitation_accepted', ({ roomId }: { roomId: string }) => {
        setPendingInvitationRoom(roomId);
      });
    };

    const setupSocket = async (signal: AbortSignal) => {
      try {
        currentSocket = await socketService.connect(signal);
        if (!signal.aborted && currentSocket) {
          bindSocketEvents(currentSocket);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        retryTimer = setTimeout(() => setupSocket(signal), 1500);
      }
    };

    const controller = new AbortController();
    setupSocket(controller.signal);

    return () => {
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
      if (currentSocket) {
        currentSocket.off('action_error');
        currentSocket.off('timer_update');
        currentSocket.off('player_disconnected');
        currentSocket.off('player_reconnected');
        currentSocket.off('room_joined');
        currentSocket.off('room_created');
        currentSocket.off('game_state_update');
        currentSocket.off('game_invitation_accepted');
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

  const clearPendingInvitationRoom = useCallback(() => {
    setPendingInvitationRoom(null);
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
        disconnectionMessage,
        pendingInvitationRoom,
        clearPendingInvitationRoom,
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
