import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { socketService } from '../services/socket';
import { useAuth } from '../hooks/useAuth';
import { useAudio } from '../hooks/useAudio';
import { MatchPointHUD } from '../components/MatchPointHUD';
import { BoardView } from '../components/BoardView';
import { EmoteBar } from '../components/EmoteBar';
import { HandView } from '../components/HandView';
import { ActionPanel, ActionPayload } from '../components/ActionPanel';
import { GameState } from 'domain/game-state';
import { Trophy, Frown, Home } from 'lucide-react-native';

export default function GameScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { playSfx } = useAudio();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [selectedBoardCardIds, setSelectedBoardCardIds] = useState<Set<string>>(new Set());
  const [selectedFormationIds, setSelectedFormationIds] = useState<Set<string>>(new Set());

  const [timeRemaining, setTimeRemaining] = useState(30);
  const [activeEmoteNotification, setActiveEmoteNotification] = useState<{ senderName: string; emoji: string } | null>(null);

  useEffect(() => {
    let socket: any;

    const initSocket = async () => {
      try {
        socket = await socketService.connect();
        
        socket.on('game_state_update', (state: GameState) => {
          setGameState(state);
          if (state.phase === 'completed') {
            const isWinner = state.winnerId === user?.id;
            playSfx(isWinner ? 'victory' : 'defeat');
          }
        });

        socket.on('timer_update', ({ remaining }: { remaining: number }) => {
          setTimeRemaining(Math.ceil(remaining / 1000));
        });

        socket.on('chat_message', (msg: { senderName: string; text: string }) => {
          setActiveEmoteNotification({ senderName: msg.senderName, emoji: msg.text });
          setTimeout(() => setActiveEmoteNotification(null), 3000);
        });
      } catch (err) {
        console.error("Error conectando socket en GameScreen:", err);
      }
    };

    initSocket();

    return () => {
      if (socket) {
        socket.off('game_state_update');
        socket.off('timer_update');
        socket.off('chat_message');
      }
    };
  }, [user?.id]);

  const handleSelectHandCard = (index: number) => {
    if (selectedCardIndex === index) {
      setSelectedCardIndex(null);
    } else {
      setSelectedCardIndex(index);
      playSfx('cardPlay');
    }
  };

  const handleToggleBoardCard = (cardId: string) => {
    const nextSet = new Set(selectedBoardCardIds);
    if (nextSet.has(cardId)) {
      nextSet.delete(cardId);
    } else {
      nextSet.add(cardId);
    }
    setSelectedBoardCardIds(nextSet);
    playSfx('cardPlay');
  };

  const handleToggleFormation = (formationId: string) => {
    const nextSet = new Set(selectedFormationIds);
    if (nextSet.has(formationId)) {
      nextSet.delete(formationId);
    } else {
      nextSet.add(formationId);
    }
    setSelectedFormationIds(nextSet);
    playSfx('cardPlay');
  };

  const handleClearSelection = () => {
    setSelectedCardIndex(null);
    setSelectedBoardCardIds(new Set());
    setSelectedFormationIds(new Set());
  };

  const localPlayer = gameState?.players.find(p => p.id === user?.id) || gameState?.players[0];
  const opponent = gameState?.players.find(p => p.id !== user?.id) || gameState?.players[1];
  
  const isCurrentTurn = gameState ? gameState.players[gameState.currentTurnPlayerIndex]?.id === localPlayer?.id : true;
  const isGameOver = gameState?.phase === 'completed';
  const isWinner = gameState?.winnerId === localPlayer?.id;

  const handlePlayAction = (actionPayload: ActionPayload) => {
    if (selectedCardIndex === null || !localPlayer) return;

    const handCard = localPlayer.hand[selectedCardIndex];
    if (!handCard) return;

    try {
      const socket = socketService.getSocket();
      
      const fullAction = {
        ...actionPayload,
        playerId: localPlayer.id,
        cardId: handCard.id,
      };

      socket.emit('play_card', fullAction);
      handleClearSelection();
      playSfx('cardDeal');
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la jugada al servidor.');
    }
  };

  return (
    <View className="flex-1 bg-slate-950 px-3 pt-10 pb-4 justify-between">
      {/* Notificación Flotante de Emotes */}
      {activeEmoteNotification && (
        <View className="absolute top-12 left-6 right-6 z-50 bg-slate-900/95 border border-amber-400/60 p-2.5 rounded-full items-center flex-row justify-center shadow-2xl">
          <Text className="text-white font-bold text-xs mr-2">{activeEmoteNotification.senderName}:</Text>
          <Text className="text-xl">{activeEmoteNotification.emoji}</Text>
        </View>
      )}

      {/* 1. Header & Panel VS (MatchPointHUD) */}
      <MatchPointHUD
        localPlayer={localPlayer}
        opponent={opponent}
        isCurrentTurn={isCurrentTurn}
        timeRemaining={timeRemaining}
        roundCount={gameState?.roundCount || 0}
        onLeaveMatch={() => router.back()}
      />

      {/* 2. Zona Central: Tapete con Cartas Sueltas & Formaciones (BoardView) */}
      <BoardView
        board={gameState?.board}
        selectedBoardCardIds={selectedBoardCardIds}
        selectedFormationIds={selectedFormationIds}
        onToggleBoardCard={handleToggleBoardCard}
        onToggleFormation={handleToggleFormation}
      />

      {/* 3. ActionPanel (Botones dinámicos Formar, Llevar, Agrupar, Aumentar, Colocar) */}
      <ActionPanel
        selectedHandCardId={selectedCardIndex !== null ? localPlayer?.hand[selectedCardIndex]?.id || null : null}
        selectedBoardCardIds={selectedBoardCardIds}
        selectedFormationIds={selectedFormationIds}
        onPlayAction={handlePlayAction}
        onClearSelection={handleClearSelection}
      />

      {/* 4. EmoteBar (Reacciones Rápidas) */}
      <EmoteBar
        onSendEmote={(emoji) => {
          try {
            const socket = socketService.getSocket();
            socket.emit('send_chat_message', { roomId: gameState?.id || '', text: emoji });
          } catch (e) {}
        }}
      />

      {/* 5. Zona Jugador (HandView) */}
      <HandView
        localPlayer={localPlayer}
        isCurrentTurn={isCurrentTurn}
        selectedCardIndex={selectedCardIndex}
        onSelectCard={handleSelectHandCard}
        onDropOnFormation={(_, cardIdx) => {
          setSelectedCardIndex(cardIdx);
        }}
      />

      {/* Modal Fin de Partida (Victoria / Derrota) */}
      <Modal visible={isGameOver} transparent animationType="slide">
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full items-center">
            {isWinner ? (
              <View className="bg-amber-500/20 p-4 rounded-full mb-3 border border-amber-500/40">
                <Trophy color="#fbbf24" size={48} />
              </View>
            ) : (
              <View className="bg-red-500/20 p-4 rounded-full mb-3 border border-red-500/40">
                <Frown color="#ef4444" size={48} />
              </View>
            )}

            <Text className="text-white font-bold text-2xl mb-1">
              {isWinner ? '¡VICTORIA!' : 'DERROTA'}
            </Text>
            <Text className="text-slate-400 text-sm mb-6 text-center">
              {isWinner ? 'Has ganado la partida K21' : 'Buen intento, sigue practicando'}
            </Text>

            <Pressable
              onPress={() => router.replace('/(tabs)')}
              className="bg-amber-500 active:bg-amber-600 px-6 py-3 rounded-xl flex-row items-center w-full justify-center"
            >
              <Home color="#020617" size={20} className="mr-2" />
              <Text className="text-slate-950 font-bold text-base">Volver al Lobby</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
