import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from 'domain/game-state';
import { Action } from 'application/action-validator';
import { supabase } from '../services/supabase';
import { socketService } from '../services/socket';
import { appEvents } from '../utils/events';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSpectator: boolean;
  isSystem?: boolean;
}

export interface StatsData {
  playerId?: string;
  eloChange: number;
  coinsEarned: number;
  xpGained: number;
  isWinner: boolean;
}

interface GameContextType {
  roomId: string | null;
  gameState: GameState | null;
  setGameState: (state: GameState | null) => void;
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
  abandonMatch: (roomId?: string) => void;
  matchAbandonedData: { winnerId: string; coinsEarned: number; eloEarned: number } | null;
  statsData: StatsData | null;
  scoringTimeoutReady: string[];
  claimRoundVictory: (roomId?: string) => void;
  rematchStatus: { acceptedPlayers: string[]; maxPlayers: number } | null;
  requestRematch: (roomId?: string) => void;
  resetMatch: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerIdState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(30000);
  const [disconnectionMessage, setDisconnectionMessage] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [matchAbandonedData, setMatchAbandonedData] = useState<{ winnerId: string; coinsEarned: number; eloEarned: number } | null>(null);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [scoringTimeoutReady, setScoringTimeoutReady] = useState<string[]>([]);
  const [rematchStatus, setRematchStatus] = useState<{ acceptedPlayers: string[]; maxPlayers: number } | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setLocalPlayerId = useCallback((id: string) => {
    setLocalPlayerIdState(id);
    AsyncStorage.setItem('casino21_playerId', id).catch(() => {});
  }, []);

  // Escuchar eventos de socket y enlazar ciclo de juego
  useEffect(() => {
    let mounted = true;
    let currentSocket: any = null;
    let retryTimer: any = null;

    AsyncStorage.getItem('casino21_playerId').then((id) => {
      if (id && mounted) setLocalPlayerIdState(id);
    });

    AsyncStorage.getItem('casino21_roomId').then((rId) => {
      if (rId && mounted) setRoomId(rId);
    });

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
      socket.off('match_abandoned');
      socket.off('stats_updated');
      socket.off('scoring_timeout');
      socket.off('rematch_status');
      socket.off('rematch_started');
      socket.off('connect');

      socket.on('connect', () => {
        AsyncStorage.getItem('casino21_roomId')
          .then((activeRoomId) => {
            const targetRoom = activeRoomId || socketService.currentRoomId;
            if (targetRoom) {
              socket.emit('request_game_state', { roomId: targetRoom });
            }
          })
          .catch(() => {});
      });

      socket.on('action_error', (msg: string) => {
        setError(msg);
      });

      socket.on('timer_update', ({ remaining }: { remaining: number }) => {
        setTimeRemaining(remaining);
      });

      socket.on('player_disconnected', ({ message }: { message: string }) => {
        setDisconnectionMessage(message);
        if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = setTimeout(() => {
          setDisconnectionMessage(null);
        }, 30000);
      });

      socket.on('player_reconnected', () => {
        setDisconnectionMessage(null);
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
      });

      socket.on('room_joined', ({ playerId, roomId: joinedRoomId }: { playerId: string; roomId?: string }) => {
        if (playerId) setLocalPlayerId(playerId);
        if (joinedRoomId) {
          socketService.currentRoomId = joinedRoomId;
          setRoomId((prev) => {
            if (prev && prev !== joinedRoomId) setChatMessages([]);
            return joinedRoomId;
          });
          AsyncStorage.setItem('casino21_roomId', joinedRoomId).catch(() => {});
          appEvents.emit('room_joined_event');
        }
      });

      socket.on('room_created', ({ playerId, roomId: createdRoomId }: { playerId: string; roomId?: string }) => {
        if (playerId) setLocalPlayerId(playerId);
        if (createdRoomId) {
          socketService.currentRoomId = createdRoomId;
          setRoomId((prev) => {
            if (prev && prev !== createdRoomId) setChatMessages([]);
            return createdRoomId;
          });
          AsyncStorage.setItem('casino21_roomId', createdRoomId).catch(() => {});
          appEvents.emit('room_joined_event');
        }
      });

      socket.on('game_state_update', (state: GameState) => {
        setGameState(state);
        AsyncStorage.getItem('casino21_playerId').then((savedId) => {
          if (savedId && state.players.some((p) => p.id === savedId)) {
            setLocalPlayerIdState(savedId);
          }
        });
        if (state.phase !== 'completed') {
          setStatsData(null);
          setRematchStatus(null);
        }
        if (state.phase === 'playing' || state.phase === 'completed') {
          setScoringTimeoutReady([]);
        }
      });

      socket.on('receive_message', (msg: ChatMessage) => {
        setChatMessages((prev) => {
          if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });

      socket.on('chat_history', (history: ChatMessage[]) => {
        setChatMessages(history || []);
      });

      socket.on('match_abandoned', (data: any) => {
        setMatchAbandonedData(data);
      });

      socket.on('stats_updated', (data: StatsData) => {
        setStatsData(data);
        appEvents.emit('profile_updated');
        appEvents.emit('coins_updated');
        appEvents.emit('elo_updated');
      });

      socket.on('scoring_timeout', ({ readyPlayers }: { readyPlayers: string[] }) => {
        setScoringTimeoutReady(readyPlayers);
      });

      socket.on('rematch_status', (status: { acceptedPlayers: string[]; maxPlayers: number }) => {
        setRematchStatus(status);
      });

      socket.on('rematch_started', ({ roomId: newRoomId }: { roomId: string }) => {
        AsyncStorage.setItem('casino21_roomId', newRoomId).catch(() => {});
        setRematchStatus(null);
        setMatchAbandonedData(null);
        setStatsData(null);
      });
    };

    const setupSocket = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.access_token) {
          return;
        }
        currentSocket = await socketService.connect();
        if (mounted && currentSocket) {
          bindSocketEvents(currentSocket);
        }
      } catch (err) {
        if (mounted) {
          retryTimer = setTimeout(setupSocket, 2000);
        }
      }
    };

    setupSocket();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token && mounted && !currentSocket?.connected) {
        setupSocket();
      }
    });

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      authListener.subscription.unsubscribe();
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
        currentSocket.off('match_abandoned');
        currentSocket.off('stats_updated');
        currentSocket.off('scoring_timeout');
        currentSocket.off('rematch_status');
        currentSocket.off('rematch_started');
      }
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
    };
  }, [setLocalPlayerId]);

  const playCard = useCallback((action: Action) => {
    setError(null);
    try {
      const socket = socketService.getSocket();
      socket.emit('play_action', action);
    } catch (e: any) {
      setError(e.message || 'No se pudo enviar la jugada al servidor');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const continueToNextRound = useCallback(() => {
    try {
      const socket = socketService.getSocket();
      socket.emit('continue_round');
    } catch {}
  }, []);

  const sendMessage = useCallback(
    async (targetRoomId: string, text: string) => {
      if (!text.trim()) return;
      const activeRoom = targetRoomId || roomId || socketService.currentRoomId;
      if (!activeRoom) return;
      try {
        const socket = await socketService.connect();
        socket.emit('send_message', { roomId: activeRoom, text });
      } catch {}
    },
    [roomId]
  );

  const abandonMatch = useCallback((targetRoomId?: string) => {
    try {
      const activeRoom = targetRoomId || roomId || socketService.currentRoomId;
      if (activeRoom) {
        const socket = socketService.getSocket();
        socket.emit('abandon_match', { roomId: activeRoom });
      }
    } catch {}
  }, [roomId]);

  const claimRoundVictory = useCallback((targetRoomId?: string) => {
    try {
      const activeRoom = targetRoomId || roomId || socketService.currentRoomId;
      if (activeRoom) {
        const socket = socketService.getSocket();
        socket.emit('claim_round_victory', { roomId: activeRoom });
      }
    } catch {}
  }, [roomId]);

  const requestRematch = useCallback((targetRoomId?: string) => {
    try {
      const activeRoom = targetRoomId || roomId || socketService.currentRoomId;
      if (activeRoom) {
        const socket = socketService.getSocket();
        socket.emit('request_rematch', { roomId: activeRoom });
      }
    } catch {}
  }, [roomId]);

  const resetMatch = useCallback(() => {
    setGameState(null);
    setMatchAbandonedData(null);
    setStatsData(null);
    setRematchStatus(null);
    setChatMessages([]);
    setError(null);
    setRoomId(null);
    AsyncStorage.removeItem('casino21_roomId').catch(() => {});
    appEvents.emit('room_left_event');
  }, []);

  return (
    <GameContext.Provider
      value={{
        roomId,
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
        sendMessage,
        abandonMatch,
        matchAbandonedData,
        statsData,
        scoringTimeoutReady,
        claimRoundVictory,
        rematchStatus,
        requestRematch,
        resetMatch,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame debe ser usado dentro de un GameProvider');
  }
  return context;
}
