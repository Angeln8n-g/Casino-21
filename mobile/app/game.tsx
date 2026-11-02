import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../hooks/useAuth';
import { useAudio } from '../hooks/useAudio';
import { useGameTheme } from '../hooks/useGameTheme';
import { MatchPointHUD } from '../components/MatchPointHUD';
import { BoardView } from '../components/BoardView';
import { ActionPanel, ActionPayload } from '../components/ActionPanel';
import { EmoteBar } from '../components/EmoteBar';
import { HandView } from '../components/HandView';
import { RoundSummaryModal } from '../components/game/RoundSummaryModal';
import { MatchCompletedModal } from '../components/game/MatchCompletedModal';
import { AbandonConfirmModal } from '../components/game/AbandonConfirmModal';
import { MatchAbandonedModal } from '../components/game/MatchAbandonedModal';
import { GameChatModal } from '../components/game/GameChatModal';
import { Action } from 'application/action-validator';
import { GameState } from 'domain/game-state';
import { Card } from 'domain/card';

const getTotalVirados = (state: GameState) =>
  (state.players || []).reduce((sum, p) => sum + (p.virados || 0), 0) +
  (state.teams || []).reduce((sum, t) => sum + (t.virados || 0), 0);

export default function GameScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { playSfx, muted, toggleMuted } = useAudio();
  const localTheme = useGameTheme();

  const {
    gameState,
    localPlayerId,
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
  } = useGame();

  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [selectedBoardCardIds, setSelectedBoardCardIds] = useState<Set<string>>(new Set());
  const [selectedFormationIds, setSelectedFormationIds] = useState<Set<string>>(new Set());

  // Modales
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [viradoBanner, setViradoBanner] = useState<string | null>(null);
  const [emoteNotification, setEmoteNotification] = useState<{ senderName: string; text: string } | null>(null);

  const prevViradosRef = useRef<number>(0);
  const prevChatCountRef = useRef<number>(0);

  // Detección de Virado y Emotes
  useEffect(() => {
    if (!gameState) return;
    const currentVirados = getTotalVirados(gameState);
    if (prevViradosRef.current > 0 && currentVirados > prevViradosRef.current) {
      playSfx('virado');
      setViradoBanner('¡VIRADO!');
      setTimeout(() => setViradoBanner(null), 2500);
    }
    prevViradosRef.current = currentVirados;
  }, [gameState, playSfx]);

  useEffect(() => {
    if (chatMessages.length > prevChatCountRef.current) {
      const latest = chatMessages[chatMessages.length - 1];
      if (latest && latest.senderId !== localPlayerId) {
        setEmoteNotification({ senderName: latest.senderName, text: latest.text });
        playSfx('emoteIn');
        setTimeout(() => setEmoteNotification(null), 3000);
      }
    }
    prevChatCountRef.current = chatMessages.length;
  }, [chatMessages, localPlayerId, playSfx]);

  // Si no hay partida activa, regresar a tabs
  useEffect(() => {
    if (!gameState && !matchAbandonedData) {
      // Si la partida se cerró
      const timeout = setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [gameState, matchAbandonedData, router]);

  const currentUserId = user?.id || localPlayerId;
  const localPlayer = gameState?.players.find((p) => p.id === currentUserId) || gameState?.players[0];
  const opponent = gameState?.players.find((p) => p.id !== localPlayer?.id) || gameState?.players[1];

  const isCurrentTurn = gameState
    ? gameState.players[gameState.currentTurnPlayerIndex]?.id === localPlayer?.id
    : false;

  const selectedHandCard: Card | null =
    localPlayer?.hand.find((c) => c.id === selectedHandCardId) || null;

  const handleSelectHandCard = (cardId: string) => {
    if (selectedHandCardId === cardId) {
      setSelectedHandCardId(null);
    } else {
      setSelectedHandCardId(cardId);
      playSfx('cardPlay');
    }
  };

  const handleToggleBoardCard = (cardId: string) => {
    const next = new Set(selectedBoardCardIds);
    if (next.has(cardId)) {
      next.delete(cardId);
    } else {
      next.add(cardId);
    }
    setSelectedBoardCardIds(next);
    playSfx('cardPlay');
  };

  const handleToggleFormation = (formationId: string) => {
    const next = new Set(selectedFormationIds);
    if (next.has(formationId)) {
      next.delete(formationId);
    } else {
      next.add(formationId);
    }
    setSelectedFormationIds(next);
    playSfx('cardPlay');
  };

  const handleClearSelection = () => {
    setSelectedHandCardId(null);
    setSelectedBoardCardIds(new Set());
    setSelectedFormationIds(new Set());
  };

  const handlePlayAction = (actionPayload: ActionPayload) => {
    if (!selectedHandCard || !localPlayer) return;

    const fullAction: Action = {
      ...actionPayload,
      playerId: localPlayer.id,
      cardId: selectedHandCard.id,
    } as Action;

    playCard(fullAction);
    handleClearSelection();
    playSfx('cardDeal');
  };

  const handleConfirmAbandon = () => {
    setShowAbandonConfirm(false);
    if (gameState?.id) {
      abandonMatch(gameState.id);
    }
    resetMatch();
    router.replace('/(tabs)');
  };

  const handleBackToLobby = () => {
    resetMatch();
    router.replace('/(tabs)');
  };

  const isScoringPhase = gameState?.phase === 'scoring';
  const isCompletedPhase = gameState?.phase === 'completed';

  return (
    <View className="flex-1 bg-slate-950 px-3 pt-10 pb-3 justify-between">
      {/* Banner Notificación de Emote en Vivo */}
      {emoteNotification && (
        <View className="absolute top-12 left-6 right-6 z-50 bg-slate-900/95 border border-amber-400 p-2.5 rounded-full items-center flex-row justify-center shadow-2xl">
          <Text className="text-white font-bold text-xs mr-2">{emoteNotification.senderName}:</Text>
          <Text className="text-xl">{emoteNotification.text}</Text>
        </View>
      )}

      {/* Banner de Virado */}
      {viradoBanner && (
        <View className="absolute top-24 left-10 right-10 z-50 bg-amber-500 p-3 rounded-2xl items-center shadow-2xl">
          <Text className="text-slate-950 font-black text-xl tracking-widest uppercase">
            ⚡ {viradoBanner} ⚡
          </Text>
        </View>
      )}

      {/* Banner de Error o Desconexión */}
      {error && (
        <View className="bg-red-500/20 border border-red-500/50 p-2 rounded-xl mb-1 flex-row justify-between items-center">
          <Text className="text-red-400 text-xs font-bold flex-1">{error}</Text>
          <Pressable onPress={clearError} className="p-1">
            <Text className="text-red-400 font-bold text-xs">✕</Text>
          </Pressable>
        </View>
      )}

      {disconnectionMessage && (
        <View className="bg-amber-500/20 border border-amber-500/50 p-2 rounded-xl mb-1">
          <Text className="text-amber-400 text-xs font-bold text-center">{disconnectionMessage}</Text>
        </View>
      )}

      {/* 1. Header & Panel VS (MatchPointHUD) */}
      <MatchPointHUD
        localPlayer={localPlayer}
        opponent={opponent}
        isCurrentTurn={isCurrentTurn}
        timeRemaining={Math.ceil(timeRemaining / 1000)}
        roundCount={gameState?.roundCount || 1}
        mode={gameState?.mode || '1v1'}
        muted={muted}
        onToggleSound={toggleMuted}
        onLeaveMatch={() => setShowAbandonConfirm(true)}
      />

      {/* 2. Zona Central: Tablero y Formaciones (BoardView) */}
      <BoardView
        board={gameState?.board}
        selectedBoardCardIds={selectedBoardCardIds}
        selectedFormationIds={selectedFormationIds}
        theme={localTheme.cardTheme}
        onToggleBoardCard={handleToggleBoardCard}
        onToggleFormation={handleToggleFormation}
      />

      {/* 3. ActionPanel (Botones de jugadas) */}
      <ActionPanel
        gameState={gameState}
        handCard={selectedHandCard}
        selectedBoardCardIds={selectedBoardCardIds}
        selectedFormationIds={selectedFormationIds}
        onPlayAction={handlePlayAction}
        onClearSelection={handleClearSelection}
      />

      {/* 4. EmoteBar (Reacciones rápidas + Chat) */}
      <EmoteBar
        onSendEmote={(emoji) => {
          if (gameState?.id) {
            sendMessage(gameState.id, emoji);
          }
        }}
        onOpenChat={() => setShowChatModal(true)}
      />

      {/* 5. Zona Jugador (HandView) */}
      <HandView
        localPlayer={localPlayer}
        isCurrentTurn={isCurrentTurn}
        selectedCardId={selectedHandCardId}
        theme={localTheme.cardTheme}
        fontKey={localTheme.cardTheme.fontKey}
        onSelectCard={handleSelectHandCard}
        onDropOnFormation={(_, cardId) => {
          setSelectedHandCardId(cardId);
        }}
      />

      {/* Modales de Ciclo de Partida */}
      <RoundSummaryModal
        visible={isScoringPhase}
        gameState={gameState}
        localPlayerId={localPlayer?.id || null}
        scoringTimeoutReady={scoringTimeoutReady}
        onContinue={continueToNextRound}
        onClaimVictory={() => {
          if (gameState?.id) claimRoundVictory(gameState.id);
        }}
      />

      <MatchCompletedModal
        visible={isCompletedPhase}
        gameState={gameState}
        localPlayerId={localPlayer?.id || null}
        statsData={statsData}
        rematchStatus={rematchStatus}
        onRequestRematch={() => {
          if (gameState?.id) requestRematch(gameState.id);
        }}
        onBackToMenu={handleBackToLobby}
      />

      <AbandonConfirmModal
        visible={showAbandonConfirm}
        onConfirm={handleConfirmAbandon}
        onCancel={() => setShowAbandonConfirm(false)}
      />

      <MatchAbandonedModal
        visible={matchAbandonedData !== null}
        data={matchAbandonedData}
        localPlayerId={localPlayer?.id || null}
        onBackToMenu={handleBackToLobby}
      />

      <GameChatModal
        visible={showChatModal}
        messages={chatMessages}
        onSendMessage={(text) => {
          if (gameState?.id) sendMessage(gameState.id, text);
        }}
        onClose={() => setShowChatModal(false)}
      />
    </View>
  );
}
