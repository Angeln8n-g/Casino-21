import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, TouchSensor, MouseSensor } from '@dnd-kit/core';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../hooks/useAuth';
import { useAudio } from '../hooks/useAudio';
import { useGameTheme } from '../hooks/useGameTheme';
import { supabase } from '../services/supabase';
import { BoardView } from './BoardView';
import { HandView } from './HandView';
import { ActionPanel, ActionPayload } from './ActionPanel';
import { Action, DefaultActionValidator } from '../../application/action-validator';
import { Card } from '../../domain/card';
import { CardView } from './CardView';
import { AudioControlButton } from './AudioControlButton';
import { CelebrationConfetti } from './CelebrationConfetti';
import { GameState } from '../../domain/game-state';
import brand21Icon from '../../Public/Icon (2).png';
import { MatchPointHUD } from './MatchPointHUD';
import {
  RoundSummaryScreen,
  MatchCompletedScreen,
  MatchAbandonedScreen,
  AbandonConfirmModal,
  DragActionModal,
} from './game';
import type { DragModalData } from './game';
import { getTheme, BoardTheme } from '../themes/themeRegistry';
import { triggerHaptic } from '../utils/haptics';

const getTotalVirados = (state: GameState) =>
  state.players.reduce((sum, player) => sum + player.virados, 0) +
  state.teams.reduce((sum, team) => sum + team.virados, 0);

const TURN_TIME_LIMIT_MS = 30000;

const didLocalPlayerWin = (state: GameState, localPlayerId: string | null) => {
  if (!localPlayerId || !state.winnerId) {
    return false;
  }

  const localPlayer = state.players.find((player) => player.id === localPlayerId);
  if (!localPlayer) {
    return false;
  }

  return state.mode === '2v2' ? localPlayer.teamId === state.winnerId : localPlayer.id === state.winnerId;
};

export function GameScreen({ isSpectator = false }: { isSpectator?: boolean }) {
  const { gameState, playCard, continueToNextRound, error, clearError, localPlayerId, timeRemaining, disconnectionMessage, sendMessage, chatMessages, abandonMatch, matchAbandonedData } = useGame();
  const { profile, user } = useAuth();
  // Local player's card theme (personal)
  const localCardTheme = useGameTheme();
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const { playSfx } = useAudio();
  
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [selectedBoardCardIds, setSelectedBoardCardIds] = useState<Set<string>>(new Set());
  const [selectedFormationIds, setSelectedFormationIds] = useState<Set<string>>(new Set());
  const [isDealing, setIsDealing] = useState(false);
  const [viradoBanner, setViradoBanner] = useState<{ id: number; playerName: string | null } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationSeed, setCelebrationSeed] = useState(0);
  const [boardThemeUrl, setBoardThemeUrl] = useState<string | null>(null);
  const [hostBoardTheme, setHostBoardTheme] = useState<BoardTheme | null>(null);
  const [playerAvatarUrls, setPlayerAvatarUrls] = useState<Record<string, string | null>>({});
  const [activeReactions, setActiveReactions] = useState<Record<string, { emoji: string; nonce: number }>>({});
  const previousGameStateRef = useRef<GameState | null>(null);
  const quickEmojis = useRef(['😀', '😮', '🔥', '👏', '💀', '🎉']).current;
  const roomId = localStorage.getItem('casino21_roomId') || localStorage.getItem('casino21_spectatorRoomId') || '';
  const chatIndexRef = useRef(0);
  const reactionTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  
  // Custom Emotes from player profile
  const playerEmotes = profile?.equipped_emotics || quickEmojis;

  // DnD State
  const [activeDragCard, setActiveDragCard] = useState<Card | null>(null);
  const [dragModalData, setDragModalData] = useState<DragModalData | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 70,
        tolerance: 6,
      },
    })
  );

  // Prevent accidental browser zoom on mobile (pinch-to-zoom / double-tap)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existingMeta = document.querySelector('meta[name="viewport"]');
    const content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

    if (existingMeta) {
      const prev = existingMeta.getAttribute('content') || '';
      existingMeta.setAttribute('content', content);
      return () => { existingMeta.setAttribute('content', prev); };
    } else {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = content;
      document.head.appendChild(meta);
      return () => { document.head.removeChild(meta); };
    }
  }, []);

  // Detect mobile for layout decisions
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // Track total number of turns specifically to detect mid-round deals
  // The sum of all hands goes up when a new deal happens
  const totalCardsInHands = gameState?.players.reduce((sum, p) => sum + p.hand.length, 0) || 0;

  // Trigger deal animation when turnCount is 0 (new round/game started)
  // OR when hands are replenished (mid-round deal, detected by total cards jumping to 8 or 16 depending on mode)
  useEffect(() => {
    const isNewRoundOrGame = gameState?.turnCount === 0 && gameState?.phase === 'playing';
    
    // In 1v1 we deal 4 cards to 2 players (8 total). In 2v2 we deal 4 cards to 4 players (16 total).
    const maxCards = gameState?.mode === '1v1' ? 8 : 16;
    const isMidRoundDeal = totalCardsInHands === maxCards && gameState?.turnCount !== 0 && gameState?.phase === 'playing';

    if (isNewRoundOrGame || isMidRoundDeal) {
      playSfx('cardDeal', { volumeMultiplier: isMidRoundDeal ? 0.85 : 1 });
      setIsDealing(true);
      const timer = setTimeout(() => setIsDealing(false), 1000); // Wait for animations to finish
      return () => clearTimeout(timer);
    }
  }, [gameState?.turnCount, gameState?.phase, gameState?.roundCount, totalCardsInHands, gameState?.mode, playSfx]);

  useEffect(() => {
    if (error) {
      playSfx('error');
    }
  }, [error, playSfx]);

  useEffect(() => {
    if (!gameState) {
      return;
    }

    const previousState = previousGameStateRef.current;

    if (previousState) {
      // Play sound when turn changes
      if (gameState.currentTurnPlayerIndex !== previousState.currentTurnPlayerIndex && gameState.phase === 'playing') {
        playSfx('turnChange');
      }

      if (gameState.turnCount > previousState.turnCount && gameState.phase === 'playing') {
        switch (gameState.lastAction) {
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
      }

      if (gameState.phase === 'playing') {
        const currentVirados = getTotalVirados(gameState);
        const prevVirados = getTotalVirados(previousState);

        if (currentVirados > prevVirados) {
          setViradoBanner({
            id: Date.now(),
            playerName: previousState.players[previousState.currentTurnPlayerIndex]?.name ?? null,
          });
          playSfx('virado');
        } else if (currentVirados < prevVirados) {
          playSfx('viradoOut');
        }
      }

      if (previousState.phase !== 'completed' && gameState.phase === 'completed') {
        const shouldCelebrate = isSpectator || didLocalPlayerWin(gameState, localPlayerId);
        playSfx(shouldCelebrate ? 'victory' : 'defeat');

        if (shouldCelebrate) {
          setCelebrationSeed(Date.now());
          setShowCelebration(true);
        }

        // Disparar eventos para refrescar el perfil después de completar la partida
        // Esto notifica a useAuth que debe recargar las estadísticas actualizadas
        if (!isSpectator) {
          window.dispatchEvent(new CustomEvent('profile_updated'));
          window.dispatchEvent(new CustomEvent('coins_updated'));
          window.dispatchEvent(new CustomEvent('elo_updated'));
        }
      }
    }

    previousGameStateRef.current = gameState;
  }, [gameState, isSpectator, localPlayerId, playSfx]);

  useEffect(() => {
    if (!viradoBanner) {
      return;
    }

    const timer = setTimeout(() => setViradoBanner(null), 2200);
    return () => clearTimeout(timer);
  }, [viradoBanner]);

  useEffect(() => {
    if (!showCelebration) {
      return;
    }

    const timer = setTimeout(() => setShowCelebration(false), 4200);
    return () => clearTimeout(timer);
  }, [showCelebration]);

  useEffect(() => {
    return () => {
      Object.values(reactionTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const resolveBoardTheme = async () => {
      const activeRoomId = roomId.toUpperCase();

      try {
        // ── 1. Tournament theme (highest priority) ──
        if (activeRoomId) {
          const { data: tMatch } = await supabase
            .from('tournament_matches')
            .select('event_id')
            .eq('game_room_id', activeRoomId)
            .maybeSingle();

          if (tMatch?.event_id) {
            const { data: eventData } = await supabase
              .from('events')
              .select('board_theme_url')
              .eq('id', tMatch.event_id)
              .maybeSingle();

            if (eventData?.board_theme_url) {
              if (isMounted) { setBoardThemeUrl(eventData.board_theme_url); setHostBoardTheme(null); }
              return;
            }
          }
        }

        // ── 2. Daily quest theme ──
        if (user?.id) {
          const today = new Date().toISOString().split('T')[0];
          const { data: questThemes } = await supabase
            .from('player_daily_quests')
            .select('catalog:quest_catalog(board_theme_url)')
            .eq('player_id', user.id)
            .eq('assigned_date', today);

          const missionTheme = (questThemes || [])
            .map((q: any) => (Array.isArray(q.catalog) ? q.catalog[0] : q.catalog))
            .find((c: any) => c?.board_theme_url)?.board_theme_url;

          if (missionTheme) {
            if (isMounted) { setBoardThemeUrl(missionTheme); setHostBoardTheme(null); }
            return;
          }
        }

        // ── 3. Host's equipped store theme ──
        // The host is always players[0] — the room creator.
        // We read directly from gameState instead of querying game_rooms
        // (rooms live only in server memory and are never persisted to Supabase).
        const hostId = gameState?.players?.[0]?.id;
        if (hostId) {
          const { data: hostProfile } = await supabase
            .from('profiles')
            .select('equipped_theme')
            .eq('id', hostId)
            .maybeSingle();

          if (hostProfile?.equipped_theme) {
            const theme = getTheme(hostProfile.equipped_theme);
            if (isMounted) { setBoardThemeUrl(null); setHostBoardTheme(theme.boardTheme); }
            return;
          }
        }

        if (isMounted) { setBoardThemeUrl(null); setHostBoardTheme(null); }
      } catch (themeError) {
        console.error('Error resolving board theme:', themeError);
        if (isMounted) { setBoardThemeUrl(null); setHostBoardTheme(null); }
      }
    };

    resolveBoardTheme();
    return () => {
      isMounted = false;
    };
    // Re-run when gameState becomes available (first render may fire before game starts)
  }, [roomId, user?.id, gameState?.players?.[0]?.id]);

  useEffect(() => {
    if (!gameState?.players?.length) return;

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const ids = Array.from(new Set(gameState.players.map((p) => p.id).filter((id) => id && UUID_RE.test(id))));
    if (ids.length === 0) return;

    let cancelled = false;

    const run = async () => {
      const { data, error: profilesError } = await supabase
        .from('profiles')
        .select('id, avatar_url, equipped_avatar')
        .in('id', ids);

      if (profilesError || !data || cancelled) return;

      const next: Record<string, string | null> = {};
      for (const row of data as any[]) {
        const url = row.equipped_avatar || row.avatar_url;
        next[row.id] = url || null;
      }
      setPlayerAvatarUrls(next);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [gameState?.players]);

  useEffect(() => {
    if (!chatMessages || chatMessages.length === 0) return;

    const start = chatIndexRef.current;
    if (chatMessages.length <= start) return;

    const newMessages = chatMessages.slice(start);
    chatIndexRef.current = chatMessages.length;

    for (const msg of newMessages) {
      const text = (msg.text || '').trim();
      const isUrl = text.startsWith('http') || text.includes('/storage/v1/object/public/');
      if (!quickEmojis.includes(text) && !isUrl) continue;
      if (!gameState?.players?.some((p) => p.id === msg.senderId)) continue;

      setActiveReactions((prev) => ({
        ...prev,
        [msg.senderId]: { emoji: text, nonce: Date.now() },
      }));
      
      playSfx('emoteIn');

      const prevTimer = reactionTimersRef.current[msg.senderId];
      if (prevTimer) clearTimeout(prevTimer);

      reactionTimersRef.current[msg.senderId] = setTimeout(() => {
        playSfx('emoteOut');
        setActiveReactions((prev) => {
          if (!prev[msg.senderId]) return prev;
          const next = { ...prev };
          delete next[msg.senderId];
          return next;
        });
      }, 3000);
    }
  }, [chatMessages, gameState?.players, quickEmojis, playSfx]);

  if (!gameState) return null;

  // En multijugador, queremos mostrar al jugador local en la parte inferior (footer)
  // independientemente de de quién sea el turno.
  // Si somos espectadores, forzamos al player 0 a estar abajo
  const localPlayer = isSpectator ? gameState.players[0] : (gameState.players.find(p => p.id === localPlayerId) || gameState.players[0]);
  const isCurrentTurn = !isSpectator && gameState.players[gameState.currentTurnPlayerIndex]?.id === localPlayer?.id;
  const currentPlayer = localPlayer;

  const handleBoardCardClick = (card: Card) => {
    if (isSpectator) return;
    const newSet = new Set(selectedBoardCardIds);
    if (newSet.has(card.id)) {
      newSet.delete(card.id);
    } else {
      newSet.add(card.id);
    }
    setSelectedBoardCardIds(newSet);
    clearError();
    playSfx('cardPlay', { volumeMultiplier: 0.28, playbackRate: 1.2 });
  };

  const handleFormationClick = (formationId: string) => {
    if (isSpectator) return;
    const newSet = new Set(selectedFormationIds);
    if (newSet.has(formationId)) {
      newSet.delete(formationId);
    } else {
      newSet.add(formationId);
    }
    setSelectedFormationIds(newSet);
    clearError();
    playSfx('cardPlay', { volumeMultiplier: 0.3, playbackRate: 1.08 });
  };

  const handlePlayAction = (actionPartial: ActionPayload) => {
    if (!selectedHandCardId || !localPlayerId) {
      return;
    }
    
    // Validar que sea el turno del jugador
    if (gameState?.players[gameState.currentTurnPlayerIndex]?.id !== localPlayerId) {
      return;
    }

    const fullAction: Action = {
      ...actionPartial,
      playerId: localPlayerId,
      cardId: selectedHandCardId,
    } as Action;

    playCard(fullAction);
    handleClearSelection();
  };

  const handleCardClick = (card: Card) => {
    if (!isCurrentTurn) return;
    
    if (selectedHandCardId === card.id) {
      handleClearSelection();
    } else {
      playSfx('cardPlay', { volumeMultiplier: 0.35, playbackRate: 1.18 });
      setSelectedHandCardId(card.id);
      setSelectedBoardCardIds(new Set());
      setSelectedFormationIds(new Set());
    }
  };

  const handleClearSelection = () => {
    setSelectedHandCardId(null);
    setSelectedBoardCardIds(new Set());
    setSelectedFormationIds(new Set());
    setDragModalData(null);
    clearError();
  };

  const handleDragStart = useCallback((event: any) => {
    // Si no es el turno, cancelar el drag
    if (!isCurrentTurn) {
      return;
    }
    if (event.active.data.current?.type === 'handCard') {
      // Haptic feedback on mobile if available
      triggerHaptic('card_tap');
      playSfx('cardPlay', { volumeMultiplier: 0.4, playbackRate: 1.12 });
      setActiveDragCard(event.active.data.current.card);
    }
  }, [isCurrentTurn, playSfx]);

  const handleDragEnd = (event: any) => {
    setActiveDragCard(null);
    
    // Si no es el turno, ignorar el drop
    if (!isCurrentTurn) {
      playSfx('error', { volumeMultiplier: 0.45 });
      return;
    }

    const { active, over } = event;

    if (!over || !gameState || !localPlayerId) {
      playSfx('error', { volumeMultiplier: 0.45 });
      return;
    }
    
    // Validar que sea el turno del jugador antes de permitir soltar la carta
    // (Ya validado arriba, pero por seguridad)
    if (gameState.players[gameState.currentTurnPlayerIndex]?.id !== localPlayerId) {
      playSfx('error', { volumeMultiplier: 0.45 });
      return;
    }

    const handCard = active.data.current?.card as Card;
    if (!handCard) return;

    const targetType = over.data.current?.type;
    const targetId = over.id.toString().replace('board-card-', '').replace('formation-', '');

    const validator = new DefaultActionValidator();
    const possibleActions: ActionPayload[] = [];
    const playerId = localPlayerId;

    const testAction = (actionPayload: ActionPayload) => {
      const fullAction = { ...actionPayload, playerId, cardId: handCard.id } as Action;
      const result = validator.validate(gameState, fullAction);
      if (result.isValid) {
        possibleActions.push(actionPayload);
      }
    };

    // Auto-include currently selected cards/formations on the board
    const boardCardIds = Array.from(selectedBoardCardIds);
    const formationIds = Array.from(selectedFormationIds);

    if (targetType === 'boardCard') {
      const finalBoardCardIds = Array.from(new Set([...boardCardIds, targetId]));
      testAction({ type: 'llevar', boardCardIds: finalBoardCardIds, formationIds });
      testAction({ type: 'formar', boardCardIds: finalBoardCardIds });
      testAction({ type: 'formarPar', boardCardIds: finalBoardCardIds });
      // Also test if it's just a cantar action over a card (unlikely, but we have action panel for cantar)
    } else if (targetType === 'formation') {
      const finalFormationIds = Array.from(new Set([...formationIds, targetId]));
      testAction({ type: 'llevar', boardCardIds, formationIds: finalFormationIds });
      testAction({ type: 'formarPar', formationId: targetId });
      testAction({ type: 'aumentarFormacion', formationId: targetId });
    } else if (targetType === 'board') {
      testAction({ type: 'colocar' });
      testAction({ type: 'cantar' }); // Allow cantar by dropping on the board
    }

    if (possibleActions.length > 0) {
      setDragModalData({
        handCard,
        targetId,
        targetType,
        validActions: possibleActions
      });
    } else {
      playSfx('error', { volumeMultiplier: 0.5 });
    }
  };

  const getEntities = () => gameState.mode === '1v1' ? gameState.players : gameState.teams;

  if (gameState.phase === 'scoring') {
    return <RoundSummaryScreen gameState={gameState} localPlayerId={localPlayerId} onContinue={continueToNextRound} />;
  }

  if (matchAbandonedData && !isSpectator) {
    return (
      <MatchAbandonedScreen
        data={matchAbandonedData}
        localPlayerId={localPlayerId}
        celebrationSeed={celebrationSeed}
      />
    );
  }

  if (gameState.phase === 'completed') {
    return (
      <MatchCompletedScreen
        gameState={gameState}
        showCelebration={showCelebration}
        celebrationSeed={celebrationSeed}
        localPlayerId={localPlayerId}
      />
    );
  }





  // Si es tu turno pero no tienes cartas y el tiempo sigue corriendo, el servidor debería botar por ti
  // o avanzar, pero el UI no debe mostrar tus cartas si no hay.
  
  const handleLeaveSpectator = () => {
    localStorage.removeItem('casino21_spectatorRoomId');
    window.location.reload();
  };

  const handleQuickEmoji = (emoji: string) => {
    if (!roomId) return;
    sendMessage(roomId, emoji);
  };

  const getAvatarForPlayer = (playerId: string) => playerAvatarUrls[playerId] || null;

  const renderTurnPlayer = (p: any, index: number) => {
    const isTurn = index === gameState.currentTurnPlayerIndex;
    const progress = isTurn ? Math.max(0, Math.min(1, timeRemaining / TURN_TIME_LIMIT_MS)) : 1;
    
    // Colores de equipo
    let isMyTeam = false;
    if (gameState.mode === '2v2' && localPlayerId) {
      const myTeamId = gameState.players.find(player => player.id === localPlayerId)?.teamId;
      isMyTeam = p.teamId === myTeamId;
    }
    
    const teamBaseColor = gameState.mode === '2v2' ? (isMyTeam ? '#06b6d4' : '#f43f5e') : '#ef4444'; // Cyan o Rosa/Rojo
    const teamBgClass = gameState.mode === '2v2' ? (isMyTeam ? 'bg-cyan-900/30 border-cyan-500/30' : 'bg-rose-900/30 border-rose-500/30') : 'bg-black/35 border-white/10';
    const teamTurnBgClass = gameState.mode === '2v2' ? (isMyTeam ? 'bg-cyan-900/60 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.3)]' : 'bg-rose-900/60 border-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.3)]') : 'bg-white/10 border-white/20 shadow-[0_0_18px_rgba(34,211,238,0.15)]';
    const teamTextColor = gameState.mode === '2v2' ? (isMyTeam ? 'text-cyan-200' : 'text-rose-200') : 'text-cyan-200';

    const ringColor = isTurn ? (timeRemaining < 10000 ? '#ef4444' : teamBaseColor) : '#334155';
    const ringStyle: React.CSSProperties = {
      background: `conic-gradient(${ringColor} ${progress * 360}deg, rgba(255,255,255,0.14) 0deg)`,
    };

    const avatarUrl = getAvatarForPlayer(p.id);

    return (
      <div className={`flex items-center gap-3 px-3 py-2 rounded-2xl border ${isTurn ? teamTurnBgClass : teamBgClass}`}>
        <div className="relative shrink-0">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full p-[3px]" style={ringStyle}>
            <div className="w-full h-full rounded-full bg-black/50 border border-white/15 overflow-hidden flex items-center justify-center text-lg md:text-xl font-black text-casino-gold">
              {avatarUrl ? (
                <img src={avatarUrl} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                (p.name?.charAt(0)?.toUpperCase() || '?')
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-black text-white truncate max-w-[120px]" title={p.name}>
              {p.name}
            </span>
            {p.id === localPlayerId && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 font-bold uppercase tracking-wider">
                Tu
              </span>
            )}
          </div>
          <div className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${isTurn ? teamTextColor : 'text-gray-400'}`}>
            {isTurn ? 'Turno' : 'Espera'}
          </div>
          <div className="text-[10px] md:text-xs text-yellow-300/90 font-bold">
            Recogidas: {p.collectedCards.length}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <style>{`
        @keyframes slideInLeft {
          0% { transform: translateX(-150%) scale(0.5); opacity: 0; }
          60% { transform: translateX(10%) scale(1.1); opacity: 1; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes slideInRight {
          0% { transform: translateX(150%) scale(0.5); opacity: 0; }
          60% { transform: translateX(-10%) scale(1.1); opacity: 1; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes shimmerEffect {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
        .animate-emote-left {
          animation: slideInLeft 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-emote-right {
          animation: slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .shimmer-overlay::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.2) 50%,
            rgba(255,255,255,0) 100%
          );
          animation: shimmerEffect 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          pointer-events: none;
        }
      `}</style>
      <div className="absolute inset-0 w-screen h-screen overflow-hidden pointer-events-none">
        {/* ── Full-screen theme background ── */}
        {boardThemeUrl && (
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${boardThemeUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.05,
            }}
          />
        )}
        <CelebrationConfetti active={showCelebration} seed={celebrationSeed} />
        
        {/* Spectator Banner & Leave Button */}
        {isSpectator && (
          <div className="absolute top-0 left-0 w-full bg-blue-500/80 text-white text-xs font-bold text-center py-1 z-50 flex justify-between px-4 items-center shadow-[0_0_15px_rgba(59,130,246,0.6)] backdrop-blur-sm pointer-events-auto">
            <span className="w-16"></span>
            <span className="uppercase tracking-widest flex items-center gap-2">
              <span className="animate-pulse">👁️</span> MODO ESPECTADOR
            </span>
            <button 
              onClick={handleLeaveSpectator}
              className="text-[10px] bg-black/30 hover:bg-black/50 px-3 py-1 rounded border border-white/20 transition-colors uppercase tracking-widest"
            >
              Salir
            </button>
          </div>
        )}

        {/* Main game layout — uses flex column with sticky footer on mobile */}
        <div
          className="flex flex-col h-full max-w-6xl mx-auto p-2 md:p-4 gap-2 md:gap-4 relative z-10 pointer-events-auto"
          style={{
            /* Account for safe area on top (notch) */
            paddingTop: isMobile ? 'env(safe-area-inset-top, 0.5rem)' : undefined,
          }}
        >
          {/* Global Notifications Layer */}
          {viradoBanner && (
            <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
              <div className="animate-virado-banner rounded-full border border-yellow-400/60 bg-black/85 px-10 py-4 shadow-[0_0_50px_rgba(251,191,36,0.5)] backdrop-blur-xl">
                <p className="text-xs md:text-sm uppercase tracking-[0.4em] font-black text-yellow-300 text-center drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]">Virado</p>
                <p className="text-2xl md:text-3xl font-black text-white text-center mt-1">
                  {viradoBanner.playerName ? `${viradoBanner.playerName} limpió la mesa` : 'Mesa vacía'}
                </p>
              </div>
            </div>
          )}

          {/* Top Header */}
        <header className="flex flex-col gap-3 md:gap-4 bg-black/30 backdrop-blur-md p-3 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl relative">
          
          {/* Disconnection Warning */}
          {disconnectionMessage && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white p-4 md:p-6 rounded-2xl shadow-2xl border border-red-500/50 z-50 flex flex-col items-center gap-3 md:gap-4 animate-in slide-in-from-top-4 w-[90%] max-w-sm text-center">
              <div className="flex items-center gap-2 text-red-400 font-bold text-base md:text-lg">
                <span className="animate-pulse">⚠️</span>
                {disconnectionMessage}
              </div>
              <div className="text-xs md:text-sm text-gray-400">
                Sala: <span className="font-mono text-yellow-400 font-bold bg-black/50 px-2 py-1 rounded">{localStorage.getItem('casino21_roomId') || 'Desconocido'}</span>
              </div>
              <button 
                onClick={() => {
                  localStorage.removeItem('casino21_roomId');
                  window.location.reload();
                }}
                className="mt-2 bg-red-600 hover:bg-red-500 text-white px-4 md:px-6 py-2 rounded-xl font-bold transition-colors w-full text-sm md:text-base"
              >
                Salir
              </button>
            </div>
          )}

          <div className="flex flex-wrap justify-between items-center gap-2 md:gap-0">
            <div className="flex items-center justify-between w-full md:w-auto md:block">
              <div>
                <div className="flex items-center gap-2">
                  <img src={brand21Icon} alt="Kasino21 icono" className="w-7 h-7 md:w-10 md:h-10 rounded-lg object-cover border border-yellow-400/30" />
                  <h1 className="text-xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 drop-shadow-sm leading-none">Kasino21</h1>
                </div>
                <p className="text-xs md:text-sm text-gray-300 mt-0.5 md:mt-1 font-medium">Ronda: {gameState.roundCount}</p>
              </div>
              <div className="flex gap-2 items-center md:hidden">
                <AudioControlButton compact />
                <button 
                  onClick={() => setShowAbandonConfirm(true)}
                  className="text-[10px] bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-1.5 rounded border border-red-500/30 transition cursor-pointer"
                >
                  Salir
                </button>
              </div>
            </div>
            
            <div className="w-full md:w-auto flex justify-center mt-2 md:mt-0 order-3 md:order-none">
              {gameState.mode === '1v1' && gameState.players.length === 2 ? (
                <div className="w-full flex items-center justify-between gap-3 md:gap-6">
                  <div className="flex-1 min-w-0">{renderTurnPlayer(gameState.players[0], 0)}</div>
                  <div className="shrink-0 text-yellow-300/90 font-black tracking-widest text-lg md:text-2xl drop-shadow-sm">
                    VS
                  </div>
                  <div className="flex-1 min-w-0 flex justify-end">{renderTurnPlayer(gameState.players[1], 1)}</div>
                </div>
              ) : (
                <div className="w-full relative flex items-center justify-center min-h-[140px] md:min-h-[180px]">
                  {/* Equipo 1 vs Equipo 2 Layout en Cruz */}
                  {(() => {
                    // Identificar compañeros y oponentes
                    const isLocalP1 = localPlayerId === gameState.players[0]?.id;
                    const isLocalP2 = localPlayerId === gameState.players[1]?.id;
                    const isLocalP3 = localPlayerId === gameState.players[2]?.id;
                    const isLocalP4 = localPlayerId === gameState.players[3]?.id;

                    // Equipo 1: players[0] y players[2]
                    // Equipo 2: players[1] y players[3]
                    
                    // Lógica para saber quién va en cada posición (Arriba: compañero, Izquierda/Derecha: oponentes)
                    let partnerIndex = -1;
                    let leftOpponentIndex = -1;
                    let rightOpponentIndex = -1;

                    if (isSpectator) {
                      // Vista de espectador estándar
                      partnerIndex = 2; // Compañero del host
                      leftOpponentIndex = 1;
                      rightOpponentIndex = 3;
                    } else if (isLocalP1) {
                      partnerIndex = 2; leftOpponentIndex = 1; rightOpponentIndex = 3;
                    } else if (isLocalP3) {
                      partnerIndex = 0; leftOpponentIndex = 3; rightOpponentIndex = 1;
                    } else if (isLocalP2) {
                      partnerIndex = 3; leftOpponentIndex = 0; rightOpponentIndex = 2;
                    } else if (isLocalP4) {
                      partnerIndex = 1; leftOpponentIndex = 2; rightOpponentIndex = 0;
                    } else {
                      // Fallback por si acaso
                      partnerIndex = 2; leftOpponentIndex = 1; rightOpponentIndex = 3;
                    }

                    return (
                      <>
                        {/* Compañero (Arriba Centro) */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                          {gameState.players[partnerIndex] && renderTurnPlayer(gameState.players[partnerIndex], partnerIndex)}
                        </div>
                        
                        {/* Oponente Izquierda */}
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 md:left-4 z-10 scale-90 md:scale-100 origin-left">
                          {gameState.players[leftOpponentIndex] && renderTurnPlayer(gameState.players[leftOpponentIndex], leftOpponentIndex)}
                        </div>

                        {/* VS Central */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shrink-0 text-yellow-300/50 font-black tracking-widest text-lg md:text-2xl drop-shadow-sm z-0">
                          VS
                        </div>

                        {/* Oponente Derecha */}
                        <div className="absolute top-1/2 -translate-y-1/2 right-0 md:right-4 z-10 scale-90 md:scale-100 origin-right">
                          {gameState.players[rightOpponentIndex] && renderTurnPlayer(gameState.players[rightOpponentIndex], rightOpponentIndex)}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <AudioControlButton compact />
            </div>
            
            <button 
              onClick={() => setShowAbandonConfirm(true)}
              className="hidden md:block text-xs bg-red-900/50 hover:bg-red-800 text-red-200 px-3 py-1 rounded border border-red-500/30 transition cursor-pointer order-last"
            >
              Abandonar Partida
            </button>
          </div>

          {/* Progress Bars */}
          <div className="flex gap-2 md:gap-4 w-full">
            {getEntities().map(entity => {
              const progress = Math.min((entity.score / 21) * 100, 100);
              
              // Lógica de nombres de equipos en 2v2
              let entityName = (entity as any).name || `Equipo ${entity.id}`;
              let isMyTeam = false;
              let teamColorClass = "bg-green-500";
              let teamBgClass = "bg-gray-700";
              let teamBorderClass = "";

              if (gameState.mode === '2v2') {
                const teamPlayers = gameState.players.filter(p => p.teamId === entity.id);
                if (teamPlayers.length === 2) {
                  isMyTeam = teamPlayers.some(p => p.id === localPlayerId);
                  
                  if (isMyTeam) {
                    const me = teamPlayers.find(p => p.id === localPlayerId);
                    const partner = teamPlayers.find(p => p.id !== localPlayerId);
                    entityName = `Tú & ${partner?.name}`;
                    teamColorClass = "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"; // Cyan para tu equipo
                    teamBgClass = "bg-cyan-950/50";
                    teamBorderClass = "border border-cyan-500/30";
                  } else {
                    entityName = `${teamPlayers[0].name} & ${teamPlayers[1].name}`;
                    teamColorClass = "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"; // Rojo/Rosa para oponentes
                    teamBgClass = "bg-rose-950/50";
                    teamBorderClass = "border border-rose-500/30";
                  }
                }
              }

              return (
                <div key={entity.id} className={`flex-1 p-1.5 md:p-2 rounded-lg ${teamBorderClass} bg-black/20`}>
                  <div className="flex justify-between text-[9px] md:text-xs mb-0.5 md:mb-1">
                    <span className={`truncate pr-1 font-bold ${isMyTeam ? 'text-cyan-300' : (gameState.mode === '2v2' ? 'text-rose-300' : 'text-gray-200')}`}>
                      {entityName}
                    </span>
                    <span className="shrink-0 text-white font-mono">{entity.score} / 21</span>
                  </div>
                  <div className={`w-full ${teamBgClass} rounded-full h-1.5 md:h-3 overflow-hidden`}>
                    <div 
                      className={`${teamColorClass} h-1.5 md:h-3 transition-all duration-1000 ease-in-out`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg text-center animate-bounce">
            {error}
          </div>
        )}

        {/* ===== ZONA CENTRAL — Tablero de juego ===== */}
        <main
          className={`
            flex-grow flex flex-col items-center justify-center relative
            bg-cover bg-center bg-no-repeat transition-all duration-1000
            ${isMobile ? 'min-h-0 overflow-y-auto' : ''}
          `}
          style={!boardThemeUrl && profile?.equipped_board ? { backgroundImage: `url(${profile.equipped_board})` } : {}}
        >
          {/* Reacciones Centrales (Emotes) */}
          <div className="absolute inset-0 pointer-events-none z-[100] flex flex-col justify-center overflow-hidden">
            {Object.entries(activeReactions).map(([playerId, reaction], index) => {
              const p = gameState.players.find((player) => player.id === playerId);
              if (!p) return null;
              
              const isEven = index % 2 === 0;
              const animationClass = isEven ? 'animate-emote-left' : 'animate-emote-right';
              
              return (
                <div 
                  key={reaction.nonce} 
                  className={`absolute w-full flex ${isEven ? 'justify-start pl-4 md:pl-16' : 'justify-end pr-4 md:pr-16'}`}
                  style={{ top: `${35 + (index * 15)}%` }}
                >
                  <div className={`flex items-center gap-3 bg-black/50 backdrop-blur-md pl-2 pr-4 py-2 rounded-full border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden shimmer-overlay ${animationClass}`}>
                    {/* Avatar */}
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/50 border border-white/15 overflow-hidden flex items-center justify-center text-sm font-black text-casino-gold shrink-0">
                      {getAvatarForPlayer(p.id) ? (
                        <img src={getAvatarForPlayer(p.id)!} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        (p.name?.charAt(0)?.toUpperCase() || '?')
                      )}
                    </div>
                    {/* Name */}
                    <span className="text-white font-bold text-xs md:text-sm max-w-[80px] md:max-w-[120px] truncate">
                      {p.name}
                    </span>
                    
                    {/* Emote */}
                    <div className="w-14 h-14 md:w-20 md:h-20 flex items-center justify-center -ml-1">
                      {reaction.emoji.startsWith('http') || reaction.emoji.includes('/storage/v1/object/public/') ? (
                        <img 
                          src={reaction.emoji} 
                          alt="emote" 
                          className="w-full h-full object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.6)] animate-pulse" 
                        />
                      ) : (
                        <span className="text-4xl md:text-5xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] animate-pulse">
                          {reaction.emoji}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Indicador visual de turno grande */}
          {!isCurrentTurn && (
            <div className={`absolute ${isMobile ? 'top-2 px-4 py-1.5 text-xs' : 'top-4 px-6 py-2 text-base'} bg-black/60 rounded-full border border-white/10 text-gray-300 font-bold tracking-widest z-0 pointer-events-none animate-pulse`}>
              ESPERANDO AL OPONENTE...
            </div>
          )}

          <BoardView 
            board={gameState.board}
            selectedCardIds={selectedBoardCardIds}
            selectedFormationIds={selectedFormationIds}
            onCardClick={handleBoardCardClick}
            onFormationClick={handleFormationClick}
            boardThemeUrl={boardThemeUrl}
            boardTheme={hostBoardTheme}
          />

          {!isSpectator && currentPlayer && (
            <MatchPointHUD score={currentPlayer.score} />
          )}
        </main>

        {/* ===== Separador visual zona central / zona jugador ===== */}
        {isMobile && (
          <div className="w-full flex items-center gap-2 px-4 opacity-40">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
            <span className="text-[8px] text-yellow-300/50 font-bold tracking-[0.3em] uppercase shrink-0">Tu zona</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
          </div>
        )}

        {/* Action Panel */}
        {!isSpectator && (
          <div>
            <ActionPanel 
              gameState={gameState}
              selectedHandCardId={selectedHandCardId}
              selectedBoardCardIds={selectedBoardCardIds}
              selectedFormationIds={selectedFormationIds}
              onPlayAction={handlePlayAction}
              onClearSelection={handleClearSelection}
            />
          </div>
        )}

        {/* ===== ZONA JUGADOR — Mano del jugador (sticky bottom en móvil) ===== */}
        <footer
          className={`
            bg-black/60 backdrop-blur-xl rounded-2xl md:rounded-3xl border
            ${isCurrentTurn ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(250,204,21,0.15),inset_0_0_15px_rgba(0,0,0,0.5)]' : 'border-white/10 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]'}
            flex flex-col items-center gap-2 md:gap-6 relative overflow-hidden
            transition-all duration-300 w-full
            ${isMobile
              ? 'mt-auto p-2 sticky bottom-0 z-30'
              : 'mt-auto p-6'
            }
          `}
          style={isMobile ? {
            paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
          } : {}}
        >
          {isSpectator && (
            <div className="absolute inset-0 bg-blue-900/40 z-20 flex items-center justify-center backdrop-blur-sm border-t border-blue-500/50">
              <span className="text-blue-300 font-black tracking-widest text-sm md:text-xl drop-shadow-md">MODO ESPECTADOR</span>
            </div>
          )}
          {!isCurrentTurn && !isSpectator && (
            <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm">
              <span className="text-gray-300 font-black tracking-widest text-sm md:text-lg animate-pulse">ESPERANDO TURNO...</span>
            </div>
          )}
          {!isSpectator && (
            <div className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-white/10 bg-black/25">
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                {(playerEmotes || []).filter(Boolean).map((emoji: string) => {
                  const isUrl = typeof emoji === 'string' && (emoji.startsWith('http') || emoji.includes('/storage/v1/object/public/'));
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleQuickEmoji(emoji)}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition-all text-lg shrink-0 flex items-center justify-center overflow-hidden"
                      title={isUrl ? "Enviar Emote" : `Enviar ${emoji}`}
                    >
                      {isUrl ? (
                        <img src={emoji} alt="emote" className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-md" />
                      ) : (
                        <span>{emoji}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-300">
                <span className="text-gray-500">🙂</span>
                Emoticonos
              </div>
            </div>
          )}
          <HandView 
            player={currentPlayer}
            isCurrentTurn={isCurrentTurn}
            selectedCardId={selectedHandCardId}
            onCardClick={handleCardClick}
            isDealing={isDealing}
            cardTheme={localCardTheme.cardTheme}
          />
        </footer>

        {/* Abandon Confirm Modal */}
        {showAbandonConfirm && (
          <AbandonConfirmModal
            roomId={roomId}
            onConfirm={abandonMatch}
            onCancel={() => setShowAbandonConfirm(false)}
          />
        )}

        {/* Drag Overlay */}
        {!isSpectator && (
          <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            {activeDragCard ? (
              <div className={`${isMobile ? 'rotate-2 scale-110' : 'rotate-6 scale-110'} shadow-2xl z-[9999] pointer-events-none drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] opacity-95`}>
                <CardView card={activeDragCard} theme={localCardTheme.cardTheme} />
              </div>
            ) : null}
          </DragOverlay>
        )}

        {/* Drag Action Modal */}
        {dragModalData && (
          <DragActionModal
            data={dragModalData}
            playerId={currentPlayer.id}
            onSelect={(action) => {
              playCard(action);
              setDragModalData(null);
              setSelectedBoardCardIds(new Set());
              setSelectedFormationIds(new Set());
            }}
            onCancel={() => setDragModalData(null)}
          />
        )}
        </div>
      </div>
    </DndContext>
  );
}
