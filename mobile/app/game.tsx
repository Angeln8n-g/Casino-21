import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Smile, MessageSquare } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../hooks/useAuth';
import { useAudio } from '../hooks/useAudio';
import { useGameTheme } from '../hooks/useGameTheme';
import { useGameMusic } from '../hooks/useGameMusic';
import { MatchPointHUD } from '../components/MatchPointHUD';
import { BoardView, DropTargetRect } from '../components/BoardView';
import { ActionPanel, ActionPayload } from '../components/ActionPanel';
import { HandView } from '../components/HandView';
import { RoundSummaryModal } from '../components/game/RoundSummaryModal';
import { MatchCompletedModal } from '../components/game/MatchCompletedModal';
import { AbandonConfirmModal } from '../components/game/AbandonConfirmModal';
import { MatchAbandonedModal } from '../components/game/MatchAbandonedModal';
import { GameChatModal } from '../components/game/GameChatModal';
import { triggerHaptic } from '../utils/haptics';
import { Action } from 'application/action-validator';
import { GameState } from 'domain/game-state';
import { Card } from 'domain/card';

const DEFAULT_EMOTES = ['😀', '😮', '🔥', '👏', '💀', '🎉', '💩', '😎'];
const TURN_TIME_LIMIT_MS = 30000;

const resolveAvatarUrl = (rawUrl?: string | null): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/storage/v1/object/public/')) {
    const supaUrl = (
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      ''
    ).replace(/\/$/, '');
    return supaUrl ? `${supaUrl}${trimmed}` : trimmed;
  }
  if (trimmed.startsWith('/')) {
    const baseUrl = (
      process.env.EXPO_PUBLIC_SOCKET_URL ||
      process.env.VITE_SOCKET_URL ||
      'https://kasino21.com'
    ).replace(/\/$/, '');
    return `${baseUrl}${trimmed}`;
  }
  return trimmed;
};

const getTotalVirados = (state: GameState) =>
  (state.players || []).reduce((sum, p) => sum + (p.virados || 0), 0) +
  (state.teams || []).reduce((sum, t) => sum + (t.virados || 0), 0);

const didLocalPlayerWin = (state: GameState, playerId: string | null) => {
  if (!state.winnerId || !playerId) return false;
  if (state.mode === '2v2') {
    const localPlayer = state.players.find((p) => p.id === playerId);
    return localPlayer ? localPlayer.teamId === state.winnerId : false;
  }
  return state.winnerId === playerId;
};

export default function GameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { playSfx, muted, toggleMuted } = useAudio();
  const localTheme = useGameTheme();

  const {
    roomId,
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

  // Música reactiva de fondo en partida
  useGameMusic(gameState);

  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [selectedBoardCardIds, setSelectedBoardCardIds] = useState<Set<string>>(new Set());
  const [selectedFormationIds, setSelectedFormationIds] = useState<Set<string>>(new Set());
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  // Avatares de jugadores desde Supabase
  const [playerAvatarUrls, setPlayerAvatarUrls] = useState<Record<string, string | null>>({});

  // Reacciones / Emotes Popover
  const [showEmotes, setShowEmotes] = useState(false);
  const [emoteCooldownTime, setEmoteCooldownTime] = useState(0);
  const lastEmoteTimeRef = useRef<number>(0);

  // Modales
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [viradoBanner, setViradoBanner] = useState<{ id: number; playerName: string | null } | null>(null);
  const [emoteNotification, setEmoteNotification] = useState<{ senderName: string; text: string } | null>(null);

  const previousGameStateRef = useRef<GameState | null>(null);
  const optimisticSfxPlayedRef = useRef<boolean>(false);
  const prevChatCountRef = useRef<number>(0);
  const dropTargetsRef = useRef<DropTargetRect[]>([]);
  const measureBoardFnRef = useRef<(() => void) | null>(null);

  // Clave de turno para sincronizar HUD y animaciones sin re-renderizar GameScreen a 10fps
  const turnKey = gameState
    ? `${gameState.roundCount}-${gameState.turnCount}-${gameState.currentTurnPlayerIndex}`
    : '';

  // Temporizador de enfriamiento de emotes (5s igual que Web)
  useEffect(() => {
    if (emoteCooldownTime <= 0) return;
    const timer = setInterval(() => {
      setEmoteCooldownTime((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [emoteCooldownTime]);

  // Cargar avatares reales de los jugadores de la partida (por UUID id y por username como respaldo)
  useEffect(() => {
    if (!gameState?.players?.length) return;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const ids = Array.from(
      new Set(gameState.players.map((p) => p.id).filter((id) => id && UUID_RE.test(id)))
    );
    const names = Array.from(
      new Set(
        gameState.players
          .map((p) => p.name?.trim())
          .filter((n): n is string => Boolean(n && !n.toLowerCase().includes('bot')))
      )
    );

    if (ids.length === 0 && names.length === 0) return;

    let cancelled = false;

    const loadAvatars = async () => {
      try {
        const queries = [];
        if (ids.length > 0) {
          queries.push(
            supabase
              .from('profiles')
              .select('id, username, avatar_url, equipped_avatar')
              .in('id', ids)
          );
        }
        if (names.length > 0) {
          queries.push(
            supabase
              .from('profiles')
              .select('id, username, avatar_url, equipped_avatar')
              .in('username', names)
          );
        }

        const results = await Promise.all(queries);
        if (cancelled) return;

        const next: Record<string, string | null> = {};
        for (const res of results) {
          if (res.error || !res.data) continue;
          for (const row of res.data as any[]) {
            const rawAvatar = row.equipped_avatar || row.avatar_url || null;
            const resolved = resolveAvatarUrl(rawAvatar);
            if (row.id) next[row.id] = resolved;
            if (row.username) {
              next[row.username] = resolved;
              next[String(row.username).toLowerCase()] = resolved;
            }
          }
        }

        setPlayerAvatarUrls((prev) => ({ ...prev, ...next }));
      } catch {}
    };

    loadAvatars();

    return () => {
      cancelled = true;
    };
  }, [gameState?.players]);

  // Sonido de reparto (inicio de ronda o reparto intermedio)
  const totalCardsInHands = gameState?.players.reduce((sum, p) => sum + p.hand.length, 0) || 0;
  useEffect(() => {
    const isNewRoundOrGame = gameState?.turnCount === 0 && gameState?.phase === 'playing';
    const maxCards = gameState?.mode === '1v1' ? 8 : 16;
    const isMidRoundDeal =
      totalCardsInHands === maxCards &&
      gameState?.turnCount !== 0 &&
      gameState?.phase === 'playing';

    if (isNewRoundOrGame || isMidRoundDeal) {
      playSfx('cardDeal', { volumeMultiplier: isMidRoundDeal ? 0.85 : 1 });
    }
  }, [
    gameState?.turnCount,
    gameState?.phase,
    gameState?.roundCount,
    totalCardsInHands,
    gameState?.mode,
    playSfx,
  ]);

  // Sonido y vibración de error
  useEffect(() => {
    if (error) {
      triggerHaptic('error');
      playSfx('error');
    }
  }, [error, playSfx]);

  // Sincronización de efectos de sonido y vibración háptica por jugadas, cambio de turno, virados y fin de partida
  useEffect(() => {
    if (!gameState) return;
    const previousState = previousGameStateRef.current;

    if (previousState) {
      if (
        gameState.currentTurnPlayerIndex !== previousState.currentTurnPlayerIndex &&
        gameState.phase === 'playing'
      ) {
        playSfx('turnChange');
      }

      const currentVirados = gameState.phase === 'playing' ? getTotalVirados(gameState) : 0;
      const prevVirados = gameState.phase === 'playing' ? getTotalVirados(previousState) : 0;
      const viradoDelta = currentVirados - prevVirados;

      if (gameState.turnCount > previousState.turnCount && gameState.phase === 'playing') {
        if (optimisticSfxPlayedRef.current) {
          optimisticSfxPlayedRef.current = false;
        } else {
          switch (gameState.lastAction) {
            case 'colocar':
              if (viradoDelta === 0) triggerHaptic('card_move');
              playSfx('cardPlay', { volumeMultiplier: 0.75, playbackRate: 1.05 });
              break;
            case 'llevar':
              if (viradoDelta === 0) triggerHaptic('card_move');
              playSfx('cardPlay', { volumeMultiplier: 0.95, playbackRate: 0.92 });
              break;
            case 'formar':
            case 'agrupar':
            case 'formarPar':
              if (viradoDelta === 0) triggerHaptic('formation');
              playSfx('cardPlay', { volumeMultiplier: 0.9, playbackRate: 0.88 });
              break;
            case 'aumentarFormacion':
              if (viradoDelta === 0) triggerHaptic('formation');
              playSfx('cardPlay', { volumeMultiplier: 1, playbackRate: 0.82 });
              break;
            case 'cantar':
              if (viradoDelta === 0) triggerHaptic('card_move');
              playSfx('chipsClink', { volumeMultiplier: 0.8, playbackRate: 1.08 });
              break;
          }
        }
      }

      if (gameState.phase === 'playing') {
        if (viradoDelta > 0) {
          setViradoBanner({
            id: Date.now(),
            playerName:
              previousState.players[previousState.currentTurnPlayerIndex]?.name ?? null,
          });
          triggerHaptic('virado');
          playSfx('virado');
        } else if (viradoDelta < 0) {
          triggerHaptic('virado_out');
          playSfx('viradoOut');
        }
      }

      if (previousState.phase !== 'completed' && gameState.phase === 'completed') {
        const won = didLocalPlayerWin(gameState, user?.id || localPlayerId);
        triggerHaptic(won ? 'success' : 'error');
        playSfx(won ? 'victory' : 'defeat');
      }
    }

    previousGameStateRef.current = gameState;
  }, [gameState, localPlayerId, user?.id, playSfx]);

  useEffect(() => {
    if (!viradoBanner) return;
    const timer = setTimeout(() => setViradoBanner(null), 2200);
    return () => clearTimeout(timer);
  }, [viradoBanner]);

  // Recepción de emotes y mensajes en vivo
  useEffect(() => {
    if (chatMessages.length > prevChatCountRef.current) {
      const added = chatMessages.length - prevChatCountRef.current;
      const latest = chatMessages[chatMessages.length - 1];
      if (!showChatModal) {
        setUnreadChatCount((prev) => prev + added);
      }
      if (latest) {
        setEmoteNotification({ senderName: latest.senderName, text: latest.text });
        if (latest.senderId !== (user?.id || localPlayerId)) {
          playSfx('emoteIn');
        } else {
          playSfx('emoteOut', { volumeMultiplier: 0.55 });
        }
        setTimeout(() => setEmoteNotification(null), 3500);
      }
    }
    prevChatCountRef.current = chatMessages.length;
  }, [chatMessages, showChatModal, localPlayerId, user?.id, playSfx]);

  // Si no hay partida activa, regresar a tabs
  useEffect(() => {
    if (!gameState && !matchAbandonedData) {
      const timeout = setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [gameState, matchAbandonedData, router]);

  const currentUserId = user?.id || localPlayerId;
  const localPlayer =
    gameState?.players.find((p) => p.id === currentUserId) || gameState?.players[0];
  const opponent =
    gameState?.players.find((p) => p.id !== localPlayer?.id) || gameState?.players[1];

  const isCurrentTurn = gameState
    ? gameState.players[gameState.currentTurnPlayerIndex]?.id === localPlayer?.id
    : false;

  const selectedHandCard: Card | null =
    localPlayer?.hand.find((c) => c.id === selectedHandCardId) || null;

  const handleClearSelection = useCallback(() => {
    setSelectedHandCardId(null);
    setSelectedBoardCardIds(new Set());
    setSelectedFormationIds(new Set());
    setHoveredTargetId(null);
    clearError();
  }, [clearError]);

  const handleSelectHandCard = (cardId: string) => {
    if (!isCurrentTurn) return;

    if (selectedHandCardId === cardId) {
      triggerHaptic('light');
      handleClearSelection();
    } else {
      triggerHaptic('card_tap');
      playSfx('cardPlay', { volumeMultiplier: 0.35, playbackRate: 1.18 });
      // Si el usuario ya tenía otra carta de mano seleccionada, limpiamos la selección de mesa igual que en Web;
      // si seleccionó primero cartas de mesa y ahora toca su carta de mano, las conservamos para mostrar Llevar/Formar/Agrupar.
      if (selectedHandCardId !== null) {
        setSelectedBoardCardIds(new Set());
        setSelectedFormationIds(new Set());
      }
      setSelectedHandCardId(cardId);
      clearError();
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
    clearError();
    playSfx('cardPlay', { volumeMultiplier: 0.28, playbackRate: 1.2 });
  };

  const handleToggleFormation = (formationId: string) => {
    const next = new Set(selectedFormationIds);
    if (next.has(formationId)) {
      next.delete(formationId);
    } else {
      next.add(formationId);
    }
    setSelectedFormationIds(next);
    clearError();
    triggerHaptic('formation');
    playSfx('cardPlay', { volumeMultiplier: 0.3, playbackRate: 1.08 });
  };

  const handlePlayAction = (actionPayload: ActionPayload, cardToUse?: Card) => {
    const card = cardToUse || selectedHandCard;
    if (!card || !localPlayer) return;

    if (gameState?.players[gameState.currentTurnPlayerIndex]?.id !== localPlayer.id) {
      return;
    }

    // Reproducir efecto de sonido de inmediato (0ms latencia de red) al pulsar la jugada
    optimisticSfxPlayedRef.current = true;
    switch (actionPayload.type) {
      case 'colocar':
        playSfx('cardPlay', { volumeMultiplier: 0.75, playbackRate: 1.05 });
        break;
      case 'llevar':
        playSfx('cardPlay', { volumeMultiplier: 0.95, playbackRate: 0.92 });
        break;
      case 'formar':
      case 'formarPar':
        playSfx('cardPlay', { volumeMultiplier: 0.9, playbackRate: 0.88 });
        break;
      case 'aumentarFormacion':
        playSfx('cardPlay', { volumeMultiplier: 1, playbackRate: 0.82 });
        break;
      case 'cantar':
        playSfx('chipsClink', { volumeMultiplier: 0.8, playbackRate: 1.08 });
        break;
    }

    const fullAction: Action = {
      ...actionPayload,
      playerId: localPlayer.id,
      cardId: card.id,
    } as Action;

    playCard(fullAction);
    handleClearSelection();
  };

  // ── Hit-Testing de Drag & Drop (idéntico al flujo de DndContext en Web) ──
  const findDropTargetAt = useCallback(
    (absX: number, absY: number): DropTargetRect | null => {
      const targets = dropTargetsRef.current;
      const pad = 12; // Tolerancia táctil alrededor de cartas y formaciones

      // 1. Priorizar cartas individuales en mesa y formaciones
      for (const t of targets) {
        if (t.type === 'boardCard' || t.type === 'formation') {
          if (
            absX >= t.x - pad &&
            absX <= t.x + t.width + pad &&
            absY >= t.y - pad &&
            absY <= t.y + t.height + pad
          ) {
            return t;
          }
        }
      }

      // 2. Verificar el área general del tablero
      for (const t of targets) {
        if (t.type === 'board') {
          if (
            absX >= t.x &&
            absX <= t.x + t.width &&
            absY >= t.y &&
            absY <= t.y + t.height
          ) {
            return t;
          }
        }
      }

      return null;
    },
    []
  );

  const handleDragStart = useCallback(
    (_card: Card) => {
      if (!isCurrentTurn) return;
      measureBoardFnRef.current?.();
      playSfx('cardPlay', { volumeMultiplier: 0.4, playbackRate: 1.12 });
    },
    [isCurrentTurn, playSfx]
  );

  const handleDragMove = useCallback(
    (absX: number, absY: number) => {
      if (!isCurrentTurn) return;
      const target = findDropTargetAt(absX, absY);
      const nextId = target ? target.id : null;
      setHoveredTargetId((prev) => {
        if (prev === nextId) return prev;
        if (nextId && target && (target.type === 'boardCard' || target.type === 'formation')) {
          triggerHaptic('card_tap');
        }
        return nextId;
      });
    },
    [isCurrentTurn, findDropTargetAt]
  );

  const handleDragRelease = useCallback(
    (card: Card, absX: number, absY: number, _tx: number, ty: number) => {
      setHoveredTargetId(null);

      if (!isCurrentTurn || !gameState || !localPlayer) {
        triggerHaptic('error');
        playSfx('error', { volumeMultiplier: 0.45 });
        return;
      }

      const target = findDropTargetAt(absX, absY);

      // Si no cayó en el tablero ni se arrastró hacia arriba suficientemente, cancelar
      if (!target && ty > -55) {
        return;
      }

      triggerHaptic(target?.type === 'formation' ? 'formation' : 'card_move');
      playSfx('cardPlay', { volumeMultiplier: 0.5, playbackRate: 1.1 });
      clearError();

      // Seleccionar automáticamente la carta de la mano para activar el ActionPanel inferior (idéntico a Web GameScreen.tsx)
      setSelectedHandCardId(card.id);

      if (target?.type === 'boardCard' && target.targetId) {
        setSelectedBoardCardIds((prev) => new Set([...prev, target.targetId!]));
      } else if (target?.type === 'formation' && target.targetId) {
        setSelectedFormationIds(new Set([target.targetId]));
      } else {
        // Soltado en espacio libre del tablero: mantiene la carta seleccionada para que el usuario elija Colocar o Cantar As (o Llevar/Formar si ya había cartas marcadas)
      }
    },
    [isCurrentTurn, gameState, localPlayer, findDropTargetAt, playSfx, clearError]
  );

  const handleQuickEmoji = (emoji: string) => {
    const now = Date.now();
    if (now - lastEmoteTimeRef.current < 5000) {
      triggerHaptic('light');
      playSfx('error', { volumeMultiplier: 0.3 });
      return;
    }
    lastEmoteTimeRef.current = now;
    setEmoteCooldownTime(5);
    setShowEmotes(false);
    sendMessage(roomId || '', emoji);
  };

  const handleConfirmAbandon = () => {
    setShowAbandonConfirm(false);
    abandonMatch();
    resetMatch();
    router.replace('/(tabs)');
  };

  const handleBackToLobby = () => {
    resetMatch();
    router.replace('/(tabs)');
  };

  const isScoringPhase = gameState?.phase === 'scoring';
  const isCompletedPhase = gameState?.phase === 'completed';

  const playerEmotes =
    profile?.equipped_emotics && profile.equipped_emotics.filter(Boolean).length > 0
      ? profile.equipped_emotics.filter(Boolean)
      : DEFAULT_EMOTES;

  const resolvedLocalAvatarUrl = resolveAvatarUrl(
    (localPlayer &&
      (playerAvatarUrls[localPlayer.id] ||
        (localPlayer.name ? playerAvatarUrls[localPlayer.name] : null) ||
        (localPlayer.name ? playerAvatarUrls[localPlayer.name.toLowerCase()] : null))) ||
      profile?.equipped_avatar ||
      profile?.avatar_url ||
      (user?.user_metadata?.avatar_url as string | undefined) ||
      null
  );

  const resolvedOpponentAvatarUrl = resolveAvatarUrl(
    (opponent &&
      (playerAvatarUrls[opponent.id] ||
        (opponent.name ? playerAvatarUrls[opponent.name] : null) ||
        (opponent.name ? playerAvatarUrls[opponent.name.toLowerCase()] : null))) ||
      null
  );

  const androidStatusBar = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 32) : 0;
  const safeTop = Math.max(insets.top, androidStatusBar, 36) + 6;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#020617',
        paddingTop: safeTop,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingHorizontal: 10,
        justifyContent: 'space-between',
      }}
    >
      {/* Banner Notificación de Emote en Vivo */}
      {emoteNotification && (
        <View
          style={{ top: safeTop + 56 }}
          className="absolute left-6 right-6 z-50 bg-black/85 border border-white/15 px-3 py-1.5 rounded-full items-center flex-row justify-center shadow-2xl self-center"
        >
          <Text className="text-amber-300 font-bold text-xs mr-2">{emoteNotification.senderName}:</Text>
          {typeof emoteNotification.text === 'string' &&
          (emoteNotification.text.startsWith('http') ||
            emoteNotification.text.includes('/storage/v1/object/public/')) ? (
            <Image
              source={{ uri: emoteNotification.text }}
              style={{ width: 28, height: 28 }}
              contentFit="contain"
            />
          ) : (
            <Text className="text-white font-bold text-sm">{emoteNotification.text}</Text>
          )}
        </View>
      )}

      {/* Banner de Virado (idéntico a Web) */}
      {viradoBanner && (
        <View
          style={{ top: safeTop + 70 }}
          className="absolute left-8 right-8 z-50 rounded-full border border-yellow-400/60 bg-black/90 px-6 py-3 items-center shadow-2xl"
        >
          <Text className="text-[10px] uppercase tracking-widest font-black text-yellow-300 text-center">
            Virado
          </Text>
          <Text className="text-lg font-black text-white text-center mt-0.5">
            {viradoBanner.playerName ? `${viradoBanner.playerName} limpió la mesa` : 'Mesa vacía'}
          </Text>
        </View>
      )}

      {/* 1. Header & Panel VS (MatchPointHUD) */}
      <MatchPointHUD
        localPlayer={localPlayer}
        opponent={opponent}
        isCurrentTurn={isCurrentTurn}
        turnKey={turnKey}
        phase={gameState?.phase}
        timeRemaining={timeRemaining}
        roundCount={gameState?.roundCount || 1}
        mode={gameState?.mode || '1v1'}
        muted={muted}
        localAvatarUrl={resolvedLocalAvatarUrl}
        opponentAvatarUrl={resolvedOpponentAvatarUrl}
        onToggleSound={toggleMuted}
        onLeaveMatch={() => setShowAbandonConfirm(true)}
      />

      {/* Banner de Error o Desconexión */}
      {disconnectionMessage && (
        <View className="bg-red-950/90 border border-red-500/40 px-3 py-2 rounded-xl mb-1 flex-row items-center justify-between">
          <Text className="text-red-100 text-xs font-bold flex-1 mr-2">{disconnectionMessage}</Text>
          <Pressable
            onPress={handleBackToLobby}
            className="bg-red-600 px-3 py-1 rounded-lg"
          >
            <Text className="text-white font-bold text-xs">Salir</Text>
          </Pressable>
        </View>
      )}

      {error && (
        <Pressable
          onPress={clearError}
          className="bg-red-500/20 border border-red-500 px-3 py-2 rounded-xl mb-1 flex-row justify-between items-center"
        >
          <Text className="text-red-100 text-xs font-semibold text-center flex-1">{error}</Text>
          <Text className="text-red-300 font-bold text-xs ml-2">✕</Text>
        </Pressable>
      )}

      {/* 2. Zona Central: Tablero y Formaciones (BoardView) */}
      <BoardView
        board={gameState?.board}
        selectedBoardCardIds={selectedBoardCardIds}
        selectedFormationIds={selectedFormationIds}
        hoveredTargetId={hoveredTargetId}
        theme={localTheme.cardTheme}
        fontKey={localTheme.cardTheme.fontKey}
        boardTheme={localTheme.boardTheme}
        onToggleBoardCard={handleToggleBoardCard}
        onToggleFormation={handleToggleFormation}
        onRegisterMeasureFn={(fn) => {
          measureBoardFnRef.current = fn;
        }}
        onTargetsMeasured={(targets) => {
          dropTargetsRef.current = targets;
        }}
      />

      {/* 3. ActionPanel (Se muestra cuando hay una carta de la mano seleccionada, idéntico a Web) */}
      <ActionPanel
        gameState={gameState}
        handCard={selectedHandCard}
        selectedHandCardId={selectedHandCardId}
        selectedBoardCardIds={selectedBoardCardIds}
        selectedFormationIds={selectedFormationIds}
        onPlayAction={(payload) => handlePlayAction(payload)}
        onClearSelection={handleClearSelection}
      />

      {/* 4. Zona Jugador (HandView) con Reacciones integradas y Drag & Drop */}
      <HandView
        localPlayer={localPlayer}
        isCurrentTurn={isCurrentTurn}
        selectedCardId={selectedHandCardId}
        theme={localTheme.cardTheme}
        fontKey={localTheme.cardTheme.fontKey}
        onSelectCard={handleSelectHandCard}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragRelease={handleDragRelease}
        headerAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative' }}>
            {/* Popover flotante de Emotes igual que en Web */}
            {showEmotes && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 36,
                  right: 0,
                  backgroundColor: 'rgba(3, 7, 18, 0.96)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 14,
                  padding: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  zIndex: 999999,
                  elevation: 30,
                }}
              >
                {playerEmotes.slice(0, 8).map((emoji: string, idx: number) => {
                  const isUrl =
                    typeof emoji === 'string' &&
                    (emoji.startsWith('http') || emoji.includes('/storage/v1/object/public/'));
                  return (
                    <Pressable
                      key={`${emoji}-${idx}`}
                      disabled={emoteCooldownTime > 0}
                      onPress={() => handleQuickEmoji(emoji)}
                      className="w-8 h-8 rounded-lg bg-white/5 active:bg-white/15 border border-white/10 items-center justify-center"
                    >
                      {isUrl ? (
                        <Image
                          source={{ uri: emoji }}
                          style={{ width: 22, height: 22 }}
                          contentFit="contain"
                        />
                      ) : (
                        <Text className="text-sm">{emoji}</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              disabled={emoteCooldownTime > 0}
              onPress={() => {
                triggerHaptic('light');
                setShowEmotes((prev) => !prev);
              }}
              className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                showEmotes
                  ? 'bg-amber-500/20 border-amber-500/40'
                  : 'bg-white/5 border-white/10'
              } ${emoteCooldownTime > 0 ? 'opacity-50' : ''}`}
            >
              <Smile color="#fcd34d" size={13} />
              <Text
                className={`text-[11px] font-semibold ${
                  showEmotes ? 'text-amber-300' : 'text-gray-200'
                }`}
              >
                Reaccionar
              </Text>
              {emoteCooldownTime > 0 && (
                <Text className="text-amber-400 font-mono text-[10px]">
                  ({emoteCooldownTime}s)
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setUnreadChatCount(0);
                setShowChatModal(true);
              }}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 items-center justify-center relative"
            >
              <MessageSquare color="#fbbf24" size={13} />
              {unreadChatCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    backgroundColor: '#ef4444',
                    borderRadius: 999,
                    minWidth: 15,
                    height: 15,
                    paddingHorizontal: 3,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 8, fontWeight: '900' }}>
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        }
      />

      {/* Modales de Ciclo de Partida */}
      <RoundSummaryModal
        visible={isScoringPhase}
        gameState={gameState}
        localPlayerId={localPlayer?.id || null}
        scoringTimeoutReady={scoringTimeoutReady}
        onContinue={continueToNextRound}
        onClaimVictory={() => {
          claimRoundVictory();
        }}
      />

      <MatchCompletedModal
        visible={isCompletedPhase}
        gameState={gameState}
        localPlayerId={localPlayer?.id || null}
        statsData={statsData}
        rematchStatus={rematchStatus}
        onRequestRematch={() => {
          requestRematch();
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
        localPlayerId={localPlayer?.id || user?.id || localPlayerId}
        quickEmotes={playerEmotes}
        onSendMessage={(text) => {
          sendMessage(roomId || '', text);
        }}
        onClose={() => setShowChatModal(false)}
      />
    </View>
  );
}
