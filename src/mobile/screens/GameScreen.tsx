// Feature: react-native-game-migration
// Requirements: 3.7, 5.7, 7.4, 7.5, 11.4, 11.5, 13.4
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useGame } from '../store/GameContext';
import { socketService } from '../services/socketService';
import { Action } from '../../application/action-validator';
import { Card } from '../../domain/card';
import { ErrorCode, ScoreBreakdown } from '../../domain/types';
import { RootStackParamList } from '../navigation/types';

import BoardView from '../components/BoardView';
import HandView from '../components/HandView';
import ActionModal from '../components/ActionModal';
import Timer from '../components/Timer';
import { DefaultActionValidator } from '../../application/action-validator';
import { hapticsService } from '../services/hapticsService';

// ─── Error messages in Spanish ───────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  [ErrorCode.NOT_YOUR_TURN]: 'No es tu turno',
  [ErrorCode.CARD_NOT_IN_HAND]: 'Carta no disponible',
  [ErrorCode.INVALID_ACTION]: 'Jugada no válida',
  [ErrorCode.CARD_PROTECTED]: 'Esa carta está protegida',
  [ErrorCode.INVALID_FORMATION_SUM]: 'La suma de la formación no es válida',
  [ErrorCode.FORMATION_NOT_FOUND]: 'Formación no encontrada',
  [ErrorCode.INVALID_STATE]: 'Estado de juego inválido',
  [ErrorCode.INVALID_CARD]: 'Carta inválida',
  [ErrorCode.DECK_EMPTY]: 'El mazo está vacío',
};

function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? 'Error desconocido';
}

// ─── Validator instance ───────────────────────────────────────────────────────

const actionValidator = new DefaultActionValidator();

// ─── GameScreen ───────────────────────────────────────────────────────────────

type GameScreenNavProp = NativeStackNavigationProp<RootStackParamList, 'Game'>;

export function GameScreen(): React.JSX.Element {
  const navigation = useNavigation<GameScreenNavProp>();
  const { state, dispatch } = useGame();
  const { gameState, localPlayerId, error, timeRemaining, disconnectionMessage } = state;

  // Local UI state
  const [selectedHandCard, setSelectedHandCard] = useState<Card | null>(null);
  const [selectedBoardCards, setSelectedBoardCards] = useState<Card[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);

  // ── Derived values ──────────────────────────────────────────────────────────

  const localPlayerIndex = useMemo(() => {
    if (!gameState || !localPlayerId) return -1;
    return gameState.players.findIndex((p) => p.id === localPlayerId);
  }, [gameState, localPlayerId]);

  const localPlayer = useMemo(() => {
    if (localPlayerIndex < 0 || !gameState) return null;
    return gameState.players[localPlayerIndex];
  }, [gameState, localPlayerIndex]);

  const isMyTurn = useMemo(() => {
    if (!gameState) return false;
    return gameState.currentTurnPlayerIndex === localPlayerIndex;
  }, [gameState, localPlayerIndex]);

  const validActions = useMemo<Action[]>(() => {
    if (!gameState || !localPlayerId || !isMyTurn) return [];
    try {
      return actionValidator.getValidActions(gameState, localPlayerId);
    } catch {
      return [];
    }
  }, [gameState, localPlayerId, isMyTurn]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCardSelect = useCallback((card: Card) => {
    setSelectedHandCard(card);
  }, []);

  const handleCardDrop = useCallback(
    (_cardId: string, _targetId: string) => {
      // Haptic feedback on card drop (Req 11.4)
      hapticsService.impactLight();
      // Show action modal when a card is dropped onto a target
      setShowActionModal(true);
    },
    [],
  );

  const handleBoardCardPress = useCallback((card: Card) => {
    setSelectedBoardCards((prev) => {
      const alreadySelected = prev.some((c) => c.id === card.id);
      if (alreadySelected) {
        return prev.filter((c) => c.id !== card.id);
      }
      return [...prev, card];
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedHandCard(null);
    setSelectedBoardCards([]);
  }, []);

  const handleActionSelect = useCallback(
    (action: Action) => {
      // Capture board card count before the action to detect virado
      const boardCardsBefore = gameState?.board
        ? Object.values(gameState.board).reduce((sum, pile) => sum + (pile?.length ?? 0), 0)
        : 0;

      try {
        socketService.emit('play_action', action);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al enviar jugada';
        dispatch({ type: 'SET_ERROR', payload: getErrorMessage(msg) });
      }

      // If the action captured all board cards (virado), trigger success haptic (Req 11.5)
      if (boardCardsBefore > 0 && selectedBoardCards.length === boardCardsBefore) {
        hapticsService.notificationSuccess();
      }

      setSelectedHandCard(null);
      setSelectedBoardCards([]);
      setShowActionModal(false);
    },
    [dispatch, gameState, selectedBoardCards],
  );

  const handleCloseModal = useCallback(() => {
    setShowActionModal(false);
  }, []);

  const handleDismissError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, [dispatch]);

  const handleReturnToMenu = useCallback(() => {
    dispatch({ type: 'SET_GAME_STATE', payload: null });
    navigation.navigate('MainMenu');
  }, [dispatch, navigation]);

  // ── Phase: scoring ──────────────────────────────────────────────────────────

  if (gameState?.phase === 'scoring') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScoringOverlay
          scoreBreakdown={gameState.lastScoreBreakdown ?? []}
          players={gameState.players as unknown as { id: string; name: string }[]}
        />
      </SafeAreaView>
    );
  }

  // ── Phase: completed ────────────────────────────────────────────────────────

  if (gameState?.phase === 'completed') {
    const winner = gameState.players.find((p) => p.id === gameState.winnerId);
    return (
      <SafeAreaView style={styles.safeArea}>
        <GameOverOverlay
          winnerName={winner?.name ?? 'Desconocido'}
          isLocalWinner={gameState.winnerId === localPlayerId}
          onReturnToMenu={handleReturnToMenu}
        />
      </SafeAreaView>
    );
  }

  // ── Loading state ───────────────────────────────────────────────────────────

  if (!gameState || !localPlayer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.loadingText}>Cargando partida…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main game UI ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Timer */}
      <View style={styles.timerContainer}>
        <Timer timeRemaining={timeRemaining} maxTime={30} />
      </View>

      {/* Turn indicator */}
      <View style={styles.turnBanner}>
        <Text style={styles.turnText}>
          {isMyTurn ? 'Tu turno' : `Turno de ${gameState.players[gameState.currentTurnPlayerIndex]?.name ?? '…'}`}
        </Text>
      </View>

      {/* Disconnection banner */}
      {disconnectionMessage ? (
        <View style={styles.disconnectionBanner}>
          <Text style={styles.disconnectionText}>{disconnectionMessage}</Text>
        </View>
      ) : null}

      {/* Error banner */}
      {error ? (
        <Pressable style={styles.errorBanner} onPress={handleDismissError}>
          <Text style={styles.errorText}>{getErrorMessage(error)}</Text>
          <Text style={styles.errorDismiss}>✕</Text>
        </Pressable>
      ) : null}

      {/* Board */}
      <View style={styles.boardContainer}>
        <BoardView
          board={gameState.board}
          selectedCardIds={selectedBoardCards.map((c) => c.id)}
          onCardPress={handleBoardCardPress}
          onClearSelection={handleClearSelection}
          isMyTurn={isMyTurn}
        />
      </View>

      {/* Hand */}
      <View style={styles.handContainer}>
        <HandView
          cards={localPlayer.hand as Card[]}
          selectedCardId={selectedHandCard?.id ?? null}
          onCardSelect={handleCardSelect}
          onCardDrop={handleCardDrop}
          disabled={!isMyTurn}
        />
      </View>

      {/* Action Modal */}
      <ActionModal
        visible={showActionModal}
        validActions={validActions}
        selectedHandCard={selectedHandCard}
        selectedBoardCards={selectedBoardCards}
        onActionSelect={handleActionSelect}
        onClose={handleCloseModal}
      />
    </SafeAreaView>
  );
}

// ─── Scoring Overlay ──────────────────────────────────────────────────────────

interface ScoringOverlayProps {
  scoreBreakdown: readonly ScoreBreakdown[];
  players: { id: string; name: string }[];
}

function ScoringOverlay({ scoreBreakdown, players }: ScoringOverlayProps): React.JSX.Element {
  return (
    <View style={styles.overlayContainer}>
      <Text style={styles.overlayTitle}>Puntuación de la ronda</Text>
      <ScrollView style={styles.overlayScroll} contentContainerStyle={styles.overlayScrollContent}>
        {scoreBreakdown.map((breakdown) => {
          const player = players.find((p) => p.id === breakdown.id);
          const name = player?.name ?? breakdown.id;
          return (
            <View key={breakdown.id} style={styles.scoreRow}>
              <Text style={styles.scorePlayerName}>{name}</Text>
              <View style={styles.scoreDetails}>
                <ScoreItem label="Cartas" value={breakdown.points.cards} />
                <ScoreItem label="Picas" value={breakdown.points.spades} />
                <ScoreItem label="10♦" value={breakdown.points.tenOfDiamonds} />
                <ScoreItem label="2♠" value={breakdown.points.twoOfSpades} />
                <ScoreItem label="Ases" value={breakdown.points.aces} />
                <ScoreItem label="Virados" value={breakdown.points.virados} />
              </View>
              <Text style={styles.scoreTotalLabel}>
                Total: <Text style={styles.scoreTotalValue}>{breakdown.points.total}</Text>
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <Text style={styles.overlayWaiting}>Esperando siguiente ronda…</Text>
    </View>
  );
}

function ScoreItem({ label, value }: { label: string; value: number }): React.JSX.Element | null {
  if (value === 0) return null;
  return (
    <View style={styles.scoreItem}>
      <Text style={styles.scoreItemLabel}>{label}</Text>
      <Text style={styles.scoreItemValue}>{value}</Text>
    </View>
  );
}

// ─── Game Over Overlay ────────────────────────────────────────────────────────

interface GameOverOverlayProps {
  winnerName: string;
  isLocalWinner: boolean;
  onReturnToMenu: () => void;
}

function GameOverOverlay({ winnerName, isLocalWinner, onReturnToMenu }: GameOverOverlayProps): React.JSX.Element {
  return (
    <View style={styles.overlayContainer}>
      <Text style={styles.overlayTitle}>
        {isLocalWinner ? '🏆 ¡Ganaste!' : '😔 Fin de la partida'}
      </Text>
      <Text style={styles.gameOverSubtitle}>
        {isLocalWinner ? '¡Felicidades!' : `Ganó ${winnerName}`}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.returnButton, pressed && styles.returnButtonPressed]}
        onPress={onReturnToMenu}
        accessibilityRole="button"
        accessibilityLabel="Volver al menú principal"
      >
        <Text style={styles.returnButtonText}>Volver al Menú</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 12,
  },
  timerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  turnBanner: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  turnText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectionBanner: {
    backgroundColor: '#92400e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  disconnectionText: {
    color: '#fef3c7',
    fontSize: 13,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#fecaca',
    fontSize: 13,
    flex: 1,
  },
  errorDismiss: {
    color: '#fecaca',
    fontSize: 16,
    marginLeft: 8,
  },
  boardContainer: {
    flex: 1,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  handContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  // Overlays
  overlayContainer: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayTitle: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  overlayScroll: {
    width: '100%',
    maxHeight: 400,
  },
  overlayScrollContent: {
    paddingBottom: 12,
  },
  overlayWaiting: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 16,
    fontStyle: 'italic',
  },
  scoreRow: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 12,
  },
  scorePlayerName: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  scoreDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  scoreItem: {
    backgroundColor: '#374151',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    marginRight: 4,
    marginBottom: 4,
  },
  scoreItemLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginRight: 4,
  },
  scoreItemValue: {
    color: '#f9fafb',
    fontSize: 12,
    fontWeight: '600',
  },
  scoreTotalLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  scoreTotalValue: {
    color: '#34d399',
    fontWeight: '700',
  },
  gameOverSubtitle: {
    color: '#9ca3af',
    fontSize: 18,
    marginBottom: 32,
    textAlign: 'center',
  },
  returnButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  returnButtonPressed: {
    opacity: 0.75,
  },
  returnButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GameScreen;
