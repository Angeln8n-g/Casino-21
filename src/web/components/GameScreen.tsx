import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor, MouseSensor } from '@dnd-kit/core';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../hooks/useAuth';
import { useAudio } from '../hooks/useAudio';
import { supabase } from '../services/supabase';
import { BoardView } from './BoardView';
import { HandView } from './HandView';
import { ActionPanel, ActionPayload } from './ActionPanel';
import { Action } from '../../application/action-validator';
import { DefaultActionValidator } from '../../application/action-validator';
import { Card } from '../../domain/card';
import { CardView } from './CardView';
import { AudioControlButton } from './AudioControlButton';
import { CelebrationConfetti } from './CelebrationConfetti';
import { GameState } from '../../domain/game-state';
import brand21Icon from '../../Public/Icon (2).png';
import casinoBackground from '../../Public/background.jpg';
import k21Logo from '../../Public/brand21Icon.png';
import titleImage from '../../Public/Reultados de la ronda.png';
import { MatchPointHUD } from './MatchPointHUD';

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
  const [playerAvatarUrls, setPlayerAvatarUrls] = useState<Record<string, string | null>>({});
  const [activeReactions, setActiveReactions] = useState<Record<string, { emoji: string; nonce: number }>>({});
  const previousGameStateRef = useRef<GameState | null>(null);
  const quickEmojis = useRef(['😀', '😮', '🔥', '👏', '💀', '🎉']).current;
  const roomId = localStorage.getItem('casino21_roomId') || localStorage.getItem('casino21_spectatorRoomId') || '';
  const chatIndexRef = useRef(0);
  const reactionTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // DnD State
  const [activeDragCard, setActiveDragCard] = useState<Card | null>(null);
  const [dragModalData, setDragModalData] = useState<{
    handCard: Card;
    targetId?: string;
    targetType: 'boardCard' | 'formation' | 'board';
    validActions: ActionPayload[];
  } | null>(null);

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

      if (gameState.phase === 'playing' && getTotalVirados(gameState) !== getTotalVirados(previousState)) {
        setViradoBanner({
          id: Date.now(),
          playerName: previousState.players[previousState.currentTurnPlayerIndex]?.name ?? null,
        });
        playSfx('virado');
      }

      if (previousState.phase !== 'completed' && gameState.phase === 'completed') {
        const shouldCelebrate = isSpectator || didLocalPlayerWin(gameState, localPlayerId);
        playSfx(shouldCelebrate ? 'victory' : 'defeat');

        if (shouldCelebrate) {
          setCelebrationSeed(Date.now());
          setShowCelebration(true);
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
      if (!activeRoomId) {
        if (isMounted) setBoardThemeUrl(null);
        return;
      }

      try {
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
            if (isMounted) setBoardThemeUrl(eventData.board_theme_url);
            return;
          }
        }

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
            if (isMounted) setBoardThemeUrl(missionTheme);
            return;
          }
        }

        if (isMounted) setBoardThemeUrl(null);
      } catch (themeError) {
        console.error('Error resolving board theme:', themeError);
        if (isMounted) setBoardThemeUrl(null);
      }
    };

    resolveBoardTheme();
    return () => {
      isMounted = false;
    };
  }, [roomId, user?.id]);

  useEffect(() => {
    if (!gameState?.players?.length) return;

    const ids = Array.from(new Set(gameState.players.map((p) => p.id).filter(Boolean)));
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
        const url = row.equipped_avatar ? `/assets/store/${row.equipped_avatar}` : row.avatar_url;
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
      if (!quickEmojis.includes(text)) continue;
      if (!gameState?.players?.some((p) => p.id === msg.senderId)) continue;

      setActiveReactions((prev) => ({
        ...prev,
        [msg.senderId]: { emoji: text, nonce: Date.now() },
      }));

      const prevTimer = reactionTimersRef.current[msg.senderId];
      if (prevTimer) clearTimeout(prevTimer);

      reactionTimersRef.current[msg.senderId] = setTimeout(() => {
        setActiveReactions((prev) => {
          if (!prev[msg.senderId]) return prev;
          const next = { ...prev };
          delete next[msg.senderId];
          return next;
        });
      }, 1600);
    }
  }, [chatMessages, gameState?.players, quickEmojis]);

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
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
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
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8 relative z-10 w-full"
        style={{
          backgroundImage: `url(${casinoBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-0"></div>
        
        <div className="relative z-10 flex flex-col items-center w-full max-w-4xl bg-[#08111e]/90 border border-yellow-500/40 rounded-[2rem] p-6 md:p-10 shadow-[0_0_60px_rgba(234,179,8,0.15)] backdrop-blur-xl overflow-hidden">
          {/* Inner golden border effect */}
          <div className="absolute inset-2 border-2 border-yellow-600/20 rounded-[1.5rem] pointer-events-none"></div>
          
          <img src={k21Logo} alt="K21 Logo" className="h-20 md:h-28 w-auto mb-2 object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.4)] animate-[pulse_3s_ease-in-out_infinite]" />
          
          <img src={titleImage} alt="Resumen de la Ronda" className="h-8 md:h-10 w-auto mb-8 object-contain drop-shadow-xl" />
          
          {/* Progress Bars in Scoring */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full mb-8">
            {getEntities().map(entity => {
              const progress = Math.min((entity.score / 21) * 100, 100);
              return (
                <div key={entity.id} className="flex-1 bg-black/40 border border-yellow-600/30 p-4 md:p-5 rounded-2xl shadow-inner relative overflow-hidden">
                  <div className="flex justify-between text-sm md:text-base mb-3 font-bold text-white items-center">
                    <span className="text-gray-200">{(entity as any).name || `Equipo ${entity.id}`}</span>
                    <span className="text-yellow-400 font-mono tracking-widest">{entity.score} <span className="text-gray-500 text-xs">/ 21 pts</span></span>
                  </div>
                  <div className="w-full bg-[#111A28] rounded-full h-3 md:h-4 overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border border-white/5">
                    <div 
                      className="bg-gradient-to-r from-green-600 to-green-400 h-full transition-all duration-1000 ease-in-out relative" 
                      style={{ width: `${progress}%`, boxShadow: '0 0 10px rgba(74,222,128,0.5)' }}
                    >
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full mb-10 relative">
            {gameState.lastScoreBreakdown?.map(b => {
              const entity = gameState.players.find(p => p.id === b.id) || gameState.teams.find(t => t.id === b.id);
              return (
                <div key={b.id} className="bg-[#0b1525]/80 p-5 md:p-7 rounded-2xl shadow-2xl border border-yellow-600/30 text-left relative overflow-hidden group hover:border-yellow-500/50 transition-colors duration-300">
                  <h3 className="text-xl md:text-2xl font-bold mb-5 text-center text-white border-b border-yellow-600/20 pb-3 tracking-wide">{(entity as any)?.name || (entity ? `Equipo ${entity.id}` : b.id)}</h3>
                  <ul className="space-y-3 md:space-y-4 text-sm md:text-base text-gray-300">
                    <li className="flex justify-between items-center group/item">
                      <span className="flex items-center gap-3"><span className="text-xl md:text-2xl group-hover/item:animate-bounce transition-all duration-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)] text-yellow-500">👑</span> Mayoría de Cartas:</span> 
                      <span className="text-white font-mono bg-white/5 px-2 py-1 rounded">+{b.points.cards}</span>
                    </li>
                    <li className="flex justify-between items-center group/item">
                      <span className="flex items-center gap-3"><span className="text-xl md:text-2xl text-gray-300 group-hover/item:animate-bounce transition-all duration-300 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">♠️</span> Mayoría de Picas:</span> 
                      <span className="text-white font-mono bg-white/5 px-2 py-1 rounded">+{b.points.spades}</span>
                    </li>
                    <li className="flex justify-between items-center group/item">
                      <span className="flex items-center gap-3"><span className="text-xl md:text-2xl text-red-500 group-hover/item:animate-bounce transition-all duration-300 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">♦️</span> 10 de Diamantes:</span> 
                      <span className="text-white font-mono bg-white/5 px-2 py-1 rounded">+{b.points.tenOfDiamonds}</span>
                    </li>
                    <li className="flex justify-between items-center group/item">
                      <span className="flex items-center gap-3">
                        <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-gray-300 text-black font-black rounded-full text-xs md:text-sm group-hover/item:scale-110 group-hover/item:rotate-12 transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.4)]">2</span> 
                        2 de Picas:
                      </span> 
                      <span className="text-white font-mono bg-white/5 px-2 py-1 rounded">+{b.points.twoOfSpades}</span>
                    </li>
                    <li className="flex justify-between items-center group/item">
                      <span className="flex items-center gap-3">
                        <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center border border-yellow-400 text-yellow-400 font-serif font-black rounded-full text-xs md:text-sm group-hover/item:scale-110 group-hover/item:-rotate-12 transition-all duration-300 shadow-[0_0_5px_rgba(251,191,36,0.4)]">A</span> 
                        Ases:
                      </span> 
                      <span className="text-white font-mono bg-white/5 px-2 py-1 rounded">+{b.points.aces}</span>
                    </li>
                    <li className="flex justify-between items-center group/item">
                      <span className="flex items-center gap-3"><span className="text-xl md:text-2xl text-yellow-200 group-hover/item:animate-[spin_1s_ease-in-out] transition-all duration-300">🔄</span> Virados:</span> 
                      <span className="text-white font-mono bg-white/5 px-2 py-1 rounded">+{b.points.virados}</span>
                    </li>
                    <li className="flex justify-between items-center font-bold text-yellow-400 pt-5 mt-5 border-t border-yellow-600/20 text-lg md:text-xl">
                      <span className="tracking-widest uppercase">Total Ronda:</span> 
                      <span className="text-2xl md:text-3xl drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">+{b.points.total}</span>
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>
          <button 
            onClick={continueToNextRound} 
            className="relative overflow-hidden group bg-transparent border border-yellow-500/50 hover:border-yellow-400 text-yellow-400 hover:text-yellow-300 px-10 py-3 md:px-14 md:py-4 rounded-xl font-bold text-lg md:text-xl tracking-[0.15em] uppercase transition-all duration-300 shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_40px_rgba(234,179,8,0.4)] hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/0 via-yellow-500/10 to-yellow-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
            Siguiente Ronda
            <span className="absolute w-2 h-2 bg-yellow-400 rotate-45 -left-1 top-1/2 -translate-y-1/2"></span>
            <span className="absolute w-2 h-2 bg-yellow-400 rotate-45 -right-1 top-1/2 -translate-y-1/2"></span>
          </button>
        </div>
      </div>
    );
  }

  if (matchAbandonedData && !isSpectator) {
    const isWinner = matchAbandonedData.winnerId === localPlayerId;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-transparent relative z-10">
        <CelebrationConfetti active={isWinner} seed={celebrationSeed} />
        <div className="bg-black/60 backdrop-blur-md p-10 rounded-3xl border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.2)] max-w-3xl w-full">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg uppercase">
            {isWinner ? '¡Tu oponente ha abandonado!' : '¡Alguien abandonó la partida!'}
          </h1>
          <h2 className="text-xl md:text-2xl font-bold mb-8 text-white">
            {isWinner ? 'Has ganado la partida automáticamente.' : 'La partida ha concluido.'}
          </h2>
          {isWinner && (
            <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-600 shadow-inner mb-8 text-left">
              <ul className="space-y-4 text-lg font-bold">
                <li className="flex justify-between items-center">
                  <span className="text-gray-300">Monedas ganadas:</span> 
                  <span className="text-yellow-400 text-2xl">+{matchAbandonedData.coinsEarned}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-gray-300">Puntos ELO:</span> 
                  <span className="text-green-400 text-2xl">+{matchAbandonedData.eloEarned} ▲</span>
                </li>
              </ul>
            </div>
          )}
          <button 
            onClick={() => {
              localStorage.removeItem('casino21_roomId');
              window.location.reload();
            }} 
            className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-12 py-4 rounded-xl font-black text-xl transition transform hover:scale-105 shadow-xl w-full max-w-md"
          >
            VOLVER AL MENÚ PRINCIPAL
          </button>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-transparent relative z-10">
        <CelebrationConfetti active={showCelebration} seed={celebrationSeed} />
        <div className="bg-black/60 backdrop-blur-md p-10 rounded-3xl border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.2)] max-w-3xl w-full">
          <h1 className="text-6xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg">
            ¡PARTIDA TERMINADA!
          </h1>
          
          <h2 className="text-3xl font-bold mb-10 text-white">
            {gameState.winnerId 
              ? `Ganador: ${gameState.players.find(p => p.id === gameState.winnerId)?.name || gameState.winnerId}`
              : '¡EMPATE!'}
          </h2>

          <div className="grid grid-cols-2 gap-8 w-full mb-10">
            {gameState.players.map(p => (
              <div key={p.id} className={`p-6 rounded-2xl border ${p.id === gameState.winnerId ? 'bg-yellow-900/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'bg-white/5 border-white/10'}`}>
                <h3 className="text-2xl font-bold mb-4 text-white flex items-center justify-center gap-2">
                  {p.id === gameState.winnerId && <span className="text-yellow-400 text-3xl">👑</span>}
                  {p.name}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between bg-black/30 p-3 rounded-lg">
                    <span className="text-gray-400 font-bold">Puntuación</span>
                    <span className="text-blue-400 font-black text-xl">{p.score} pts</span>
                  </div>
                  <div className="flex justify-between bg-black/30 p-3 rounded-lg">
                    <span className="text-gray-400 font-bold">Cartas Recogidas</span>
                    <span className="text-white font-bold">{p.collectedCards.length}</span>
                  </div>
                  <div className="flex justify-between bg-black/30 p-3 rounded-lg">
                    <span className="text-gray-400 font-bold">Virados</span>
                    <span className="text-yellow-400 font-bold">{p.virados}</span>
                  </div>
                  
                  {/* Fake ELO calculation feedback for visual polish */}
                  <div className="flex justify-between p-2 mt-4 border-t border-white/10">
                    <span className="text-gray-400 font-bold text-sm">Rango ELO</span>
                    <span className={`font-black text-sm ${p.id === gameState.winnerId ? 'text-green-400' : p.score === gameState.players.find(o => o.id !== p.id)?.score ? 'text-gray-400' : 'text-red-400'}`}>
                      {p.id === gameState.winnerId ? '+25 ▲' : p.score === gameState.players.find(o => o.id !== p.id)?.score ? '+0 ▬' : '-25 ▼'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => {
              localStorage.removeItem('casino21_roomId');
              window.location.reload();
            }} 
            className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-12 py-4 rounded-xl font-black text-xl transition transform hover:scale-105 shadow-xl w-full max-w-md"
          >
            VOLVER AL MENÚ PRINCIPAL
          </button>
        </div>
      </div>
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
    const ringColor = isTurn ? (timeRemaining < 10000 ? '#ef4444' : '#22c55e') : '#334155';
    const ringStyle: React.CSSProperties = {
      background: `conic-gradient(${ringColor} ${progress * 360}deg, rgba(255,255,255,0.14) 0deg)`,
    };

    const avatarUrl = getAvatarForPlayer(p.id);
    const reaction = activeReactions[p.id];

    return (
      <div className={`flex items-center gap-3 px-3 py-2 rounded-2xl border ${isTurn ? 'bg-white/10 border-white/20 shadow-[0_0_18px_rgba(34,211,238,0.15)]' : 'bg-black/35 border-white/10'}`}>
        <div className="relative shrink-0">
          {reaction && (
            <div key={reaction.nonce} className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] animate-bounce">
              {reaction.emoji}
            </div>
          )}
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
          <div className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${isTurn ? 'text-cyan-200' : 'text-gray-400'}`}>
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
      <div className="absolute inset-0 w-screen h-screen overflow-hidden pointer-events-none">
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
          {/* Top Header */}
        <header className="flex flex-col gap-3 md:gap-4 bg-black/30 backdrop-blur-md p-3 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl relative">
          {viradoBanner && (
            <div className="absolute left-1/2 top-[105%] -translate-x-1/2 z-30 pointer-events-none">
              <div className="animate-virado-banner rounded-full border border-yellow-400/40 bg-black/75 px-8 py-3 shadow-[0_0_35px_rgba(251,191,36,0.35)] backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-[0.4em] font-black text-yellow-300 text-center">Virado</p>
                <p className="text-xl md:text-2xl font-black text-white text-center">
                  {viradoBanner.playerName ? `${viradoBanner.playerName} limpio la mesa` : 'Mesa vacia'}
                </p>
              </div>
            </div>
          )}
          
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
                <div className="flex flex-wrap gap-2 md:gap-4 w-full justify-center">
                  {gameState.players.map((p, i) => (
                    <div key={p.id}>{renderTurnPlayer(p, i)}</div>
                  ))}
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
              return (
                <div key={entity.id} className="flex-1">
                  <div className="flex justify-between text-[9px] md:text-xs mb-0.5 md:mb-1">
                    <span className="truncate pr-1">{(entity as any).name || `Equipo ${entity.id}`}</span>
                    <span className="shrink-0">{entity.score} / 21</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 md:h-3 overflow-hidden">
                    <div 
                      className="bg-green-500 h-1.5 md:h-3 transition-all duration-1000 ease-in-out" 
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
          style={!boardThemeUrl && profile?.equipped_board ? { backgroundImage: `url(/assets/store/${profile.equipped_board})` } : {}}
        >
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
            bg-black/40 backdrop-blur-md rounded-2xl md:rounded-3xl border
            ${isCurrentTurn ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10'}
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
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleQuickEmoji(emoji)}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 transition-colors text-lg shrink-0"
                    title={`Enviar ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
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
          />
        </footer>

        {/* Abandon Confirm Modal */}
        {showAbandonConfirm && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in pointer-events-auto">
            <div className="bg-gray-900 p-6 md:p-8 rounded-3xl border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.3)] max-w-md w-full text-center">
              <span className="text-5xl mb-4 block animate-bounce">⚠️</span>
              <h2 className="text-2xl font-black text-red-400 mb-4 uppercase">¿Abandonar Partida?</h2>
              <p className="text-gray-300 font-bold mb-8 leading-relaxed">
                Si sales ahora, la partida terminará y perderás todas tus monedas apostadas y puntos ELO. El jugador oponente obtendrá la victoria.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  className="w-full py-4 rounded-xl font-black text-white bg-red-600 hover:bg-red-500 transition-colors uppercase tracking-wider shadow-lg"
                  onClick={() => {
                    if (roomId) abandonMatch(roomId);
                    localStorage.removeItem('casino21_roomId');
                    window.location.reload();
                  }}
                >
                  Sí, Abandonar
                </button>
                <button
                  className="w-full py-4 rounded-xl font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors uppercase tracking-wider"
                  onClick={() => setShowAbandonConfirm(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        {!isSpectator && (
          <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            {activeDragCard ? (
              <div className={`${isMobile ? 'rotate-2 scale-110' : 'rotate-6 scale-110'} shadow-2xl z-[9999] pointer-events-none drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] opacity-95`}>
                <CardView card={activeDragCard} />
              </div>
            ) : null}
          </DragOverlay>
        )}

        {/* Drag Action Modal */}
        {dragModalData && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-gradient-to-b from-gray-800 to-gray-950 p-6 md:p-8 rounded-3xl border border-yellow-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-md w-full text-center animate-scale-up">
              <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-6 drop-shadow-md">¿Qué jugada deseas realizar?</h2>
              
              <div className="flex flex-col gap-3 md:gap-4">
                {dragModalData.validActions.map((action, idx) => (
                  <button
                    key={idx}
                    className={`w-full py-3 md:py-4 rounded-xl font-bold text-lg md:text-xl transition-all shadow-lg border border-white/10 uppercase tracking-widest text-white hover:scale-105 active:scale-95 touch-manipulation
                      ${action.type === 'llevar' ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400' : ''}
                      ${action.type === 'formar' ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black' : ''}
                      ${action.type === 'formarPar' ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400' : ''}
                      ${action.type === 'aumentarFormacion' ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400' : ''}
                      ${action.type === 'colocar' ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400' : ''}
                      ${action.type === 'cantar' ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400' : ''}
                    `}
                    onClick={() => {
                      playCard({ ...action, playerId: currentPlayer.id, cardId: dragModalData.handCard.id } as Action);
                      setDragModalData(null);
                      setSelectedBoardCardIds(new Set());
                      setSelectedFormationIds(new Set());
                    }}
                  >
                    {action.type === 'aumentarFormacion' ? 'Aumentar' : action.type === 'formarPar' ? 'Agrupar' : action.type}
                  </button>
                ))}
              </div>

              <button
                className="mt-6 w-full py-3 rounded-xl font-bold text-gray-300 bg-white/10 hover:bg-white/20 transition-all border border-white/10"
                onClick={() => setDragModalData(null)}
              >
                CANCELAR
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </DndContext>
  );
}
