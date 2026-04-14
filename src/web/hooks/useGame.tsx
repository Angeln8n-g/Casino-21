import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { GameState } from '../../domain/game-state';
import { GameMode } from '../../domain/types';
import { Action } from '../../application/action-validator';
import { socketService } from '../services/socket';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSpectator: boolean;
  isSystem?: boolean;
}

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
  chatMessages: ChatMessage[];
  sendMessage: (roomId: string, text: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(30000);
  const [disconnectionMessage, setDisconnectionMessage] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Escuchar eventos del servidor
  React.useEffect(() => {
    let mounted = true;
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
      socket.off('receive_message');
      socket.off('chat_history');

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

      socket.on('receive_message', (msg: ChatMessage) => {
        setChatMessages(prev => [...prev, msg]);
      });

      socket.on('chat_history', (history: ChatMessage[]) => {
        setChatMessages(history || []);
      });
    };

    const setupSocket = async () => {
      try {
        currentSocket = await socketService.connect();
        if (mounted && currentSocket) {
          bindSocketEvents(currentSocket);
        }
      } catch (err) {
        if (mounted) {
          retryTimer = setTimeout(setupSocket, 1500);
        }
      }
    };

    setupSocket();

    return () => {
      mounted = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      if (currentSocket) {
        currentSocket.off('action_error');
        currentSocket.off('timer_update');
        currentSocket.off('player_disconnected');
        currentSocket.off('player_reconnected');
        currentSocket.off('room_joined');
        currentSocket.off('room_created');
        currentSocket.off('game_state_update');
        currentSocket.off('receive_message');
        currentSocket.off('chat_history');
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

  const sendMessage = useCallback((roomId: string, text: string) => {
    if (!text.trim()) return;
    const socket = socketService.getSocket();
    socket.emit('send_message', { roomId, text });
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
        chatMessages,
        sendMessage
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
