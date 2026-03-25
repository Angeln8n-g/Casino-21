import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useGame } from '../hooks/useGame';
import { BoardView } from './BoardView';
import { HandView } from './HandView';
import { ActionPanel, ActionPayload } from './ActionPanel';
import { Action } from '../../application/action-validator';
import { DefaultActionValidator } from '../../application/action-validator';
import { Card } from '../../domain/card';
import { CardView } from './CardView';

export function GameScreen() {
  const { gameState, playCard, continueToNextRound, error, clearError, localPlayerId, timeRemaining, disconnectionMessage } = useGame();
  
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [selectedBoardCardIds, setSelectedBoardCardIds] = useState<Set<string>>(new Set());
  const [selectedFormationIds, setSelectedFormationIds] = useState<Set<string>>(new Set());
  const [isDealing, setIsDealing] = useState(false);

  // DnD State
  const [activeDragCard, setActiveDragCard] = useState<Card | null>(null);
  const [dragModalData, setDragModalData] = useState<{
    handCard: Card;
    targetId?: string;
    targetType: 'boardCard' | 'formation' | 'board';
    validActions: ActionPayload[];
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
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
      setIsDealing(true);
      const timer = setTimeout(() => setIsDealing(false), 1000); // Wait for animations to finish
      return () => clearTimeout(timer);
    }
  }, [gameState?.turnCount, gameState?.phase, gameState?.roundCount, totalCardsInHands, gameState?.mode]);

  if (!gameState) return null;

  // En multijugador, queremos mostrar al jugador local en la parte inferior (footer)
  // independientemente de de quién sea el turno.
  const localPlayer = gameState.players.find(p => p.id === localPlayerId) || gameState.players[0];
  const isCurrentTurn = gameState.players[gameState.currentTurnPlayerIndex]?.id === localPlayer?.id;
  const currentPlayer = localPlayer;

  const handleBoardCardClick = (card: Card) => {
    const newSet = new Set(selectedBoardCardIds);
    if (newSet.has(card.id)) {
      newSet.delete(card.id);
    } else {
      newSet.add(card.id);
    }
    setSelectedBoardCardIds(newSet);
    clearError();
  };

  const handleFormationClick = (formationId: string) => {
    const newSet = new Set(selectedFormationIds);
    if (newSet.has(formationId)) {
      newSet.delete(formationId);
    } else {
      newSet.add(formationId);
    }
    setSelectedFormationIds(newSet);
    clearError();
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

  const handleDragStart = (event: any) => {
    // Si no es el turno, cancelar el drag
    if (!isCurrentTurn) {
      return;
    }
    if (event.active.data.current?.type === 'handCard') {
      setActiveDragCard(event.active.data.current.card);
    }
  };

  const handleDragEnd = (event: any) => {
    setActiveDragCard(null);
    
    // Si no es el turno, ignorar el drop
    if (!isCurrentTurn) {
      return;
    }

    const { active, over } = event;

    if (!over || !gameState || !localPlayerId) return;
    
    // Validar que sea el turno del jugador antes de permitir soltar la carta
    // (Ya validado arriba, pero por seguridad)
    if (gameState.players[gameState.currentTurnPlayerIndex]?.id !== localPlayerId) {
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
      // Show some temporary error maybe, or just do nothing
      // We could set an error state here
    }
  };

  const getEntities = () => gameState.mode === '1v1' ? gameState.players : gameState.teams;

  if (gameState.phase === 'scoring') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-green-900">
        <h1 className="text-4xl font-bold mb-6 text-yellow-400">Resumen de la Ronda</h1>
        
        {/* Progress Bars in Scoring */}
        <div className="flex gap-4 w-full max-w-4xl mb-8">
          {getEntities().map(entity => {
            const progress = Math.min((entity.score / 21) * 100, 100);
            return (
              <div key={entity.id} className="flex-1 bg-gray-900/50 p-4 rounded-xl">
                <div className="flex justify-between text-sm mb-2 font-bold text-white">
                  <span>{(entity as any).name || `Equipo ${entity.id}`}</span>
                  <span>{entity.score} / 21 pts</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                  <div 
                    className="bg-green-500 h-4 transition-all duration-1000 ease-in-out" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-8 w-full max-w-4xl mb-8">
          {gameState.lastScoreBreakdown?.map(b => {
            const entity = gameState.players.find(p => p.id === b.id) || gameState.teams.find(t => t.id === b.id);
            return (
              <div key={b.id} className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 text-left">
                <h3 className="text-2xl font-bold mb-4 text-center border-b border-gray-600 pb-2">{(entity as any)?.name || (entity ? `Equipo ${entity.id}` : b.id)}</h3>
                <ul className="space-y-2 text-lg text-gray-300">
                  <li className="flex justify-between"><span>Mayoría de Cartas:</span> <span className="text-white">+{b.points.cards}</span></li>
                  <li className="flex justify-between"><span>Mayoría de Picas:</span> <span className="text-white">+{b.points.spades}</span></li>
                  <li className="flex justify-between"><span>10 de Diamantes:</span> <span className="text-white">+{b.points.tenOfDiamonds}</span></li>
                  <li className="flex justify-between"><span>2 de Picas:</span> <span className="text-white">+{b.points.twoOfSpades}</span></li>
                  <li className="flex justify-between"><span>Ases:</span> <span className="text-white">+{b.points.aces}</span></li>
                  <li className="flex justify-between"><span>Virados:</span> <span className="text-white">+{b.points.virados}</span></li>
                  <li className="flex justify-between font-bold text-yellow-400 pt-3 mt-2 border-t border-gray-600 text-xl">
                    <span>Total Ronda:</span> <span>+{b.points.total}</span>
                  </li>
                </ul>
              </div>
            );
          })}
        </div>
        <button 
          onClick={continueToNextRound} 
          className="bg-blue-600 hover:bg-blue-500 px-10 py-4 rounded-xl font-bold text-2xl transition shadow-lg hover:scale-105"
        >
          Siguiente Ronda
        </button>
      </div>
    );
  }

  if (gameState.phase === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-transparent relative z-10">
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
  
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="absolute inset-0 w-screen h-screen overflow-hidden pointer-events-none">
        <div className="flex flex-col h-full max-w-6xl mx-auto p-4 gap-4 relative z-10 pointer-events-auto">
          {/* Top Header */}
        <header className="flex flex-col gap-4 bg-black/30 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl relative">
          
          {/* Disconnection Warning */}
          {disconnectionMessage && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white p-6 rounded-2xl shadow-2xl border border-red-500/50 z-50 flex flex-col items-center gap-4 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3 text-red-400 font-bold text-lg">
                <span className="animate-pulse">⚠️</span>
                {disconnectionMessage}
              </div>
              <div className="text-sm text-gray-400">
                Código de la sala: <span className="font-mono text-yellow-400 font-bold bg-black/50 px-2 py-1 rounded">{localStorage.getItem('casino21_roomId') || 'Desconocido'}</span>
              </div>
              <button 
                onClick={() => {
                  localStorage.removeItem('casino21_roomId');
                  window.location.reload();
                }}
                className="mt-2 bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-bold transition-colors w-full"
              >
                Salir de la sala
              </button>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 drop-shadow-sm">Casino 21</h1>
              <p className="text-sm text-gray-300 mt-1 font-medium">Ronda: {gameState.roundCount}</p>
              <button 
                onClick={() => {
                  localStorage.removeItem('casino21_roomId');
                  window.location.reload();
                }}
                className="mt-2 text-xs bg-red-900/50 hover:bg-red-800 text-red-200 px-3 py-1 rounded border border-red-500/30 transition cursor-pointer"
              >
                Abandonar Partida
              </button>
            </div>
            <div className="flex gap-4">
              {gameState.players.map((p, i) => (
                <div key={p.id} className={`text-center px-6 py-2 rounded-2xl border transition-all ${i === gameState.currentTurnPlayerIndex ? 'bg-blue-600/80 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-110 z-10' : 'bg-black/40 border-white/10 opacity-70'}`}>
                  <div className="font-bold text-white">{p.name} {p.id === localPlayerId ? '(Tú)' : ''}</div>
                  <div className={`text-xs font-black uppercase mt-1 ${i === gameState.currentTurnPlayerIndex ? 'text-white' : 'text-gray-400'}`}>
                    {i === gameState.currentTurnPlayerIndex ? 'TU TURNO' : 'Esperando...'}
                  </div>
                  <div className="text-xs text-yellow-400 mt-1 font-bold">Recogidas: {p.collectedCards.length}</div>
                  
                  {/* Timer display for current turn */}
                  {i === gameState.currentTurnPlayerIndex && (
                    <div className="mt-2 w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 linear ${timeRemaining < 10000 ? 'bg-red-500' : 'bg-green-400'}`}
                        style={{ width: `${(timeRemaining / 30000) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-right bg-black/40 px-6 py-2 rounded-2xl border border-white/10">
              <p className="text-sm text-gray-300">Cartas en Mazo</p>
              <p className="text-3xl font-bold text-white">{gameState.deck.cards.length}</p>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="flex gap-4 w-full">
            {getEntities().map(entity => {
              const progress = Math.min((entity.score / 21) * 100, 100);
              return (
                <div key={entity.id} className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{(entity as any).name || `Equipo ${entity.id}`}</span>
                    <span>{entity.score} / 21 pts</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-green-500 h-3 transition-all duration-1000 ease-in-out" 
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

        {/* Main Board Area */}
        <main className="flex-grow flex flex-col items-center justify-center relative">
          
          {/* Indicador visual de turno grande */}
          {!isCurrentTurn && (
            <div className="absolute top-4 bg-black/60 px-6 py-2 rounded-full border border-white/10 text-gray-300 font-bold tracking-widest z-0 pointer-events-none animate-pulse">
              ESPERANDO AL OPONENTE...
            </div>
          )}

          <BoardView 
            board={gameState.board}
            selectedCardIds={selectedBoardCardIds}
            selectedFormationIds={selectedFormationIds}
            onCardClick={handleBoardCardClick}
            onFormationClick={handleFormationClick}
          />
        </main>

        {/* Action Panel */}
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

        {/* Player Hand */}
        <footer className={`mt-auto bg-black/40 backdrop-blur-md p-6 rounded-3xl border ${isCurrentTurn ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10'} flex flex-col items-center gap-6 relative overflow-hidden transition-all duration-300`}>
          {!isCurrentTurn && (
            <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm">
              <span className="text-gray-300 font-black tracking-widest text-lg animate-pulse">ESPERANDO TURNO...</span>
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

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeDragCard ? (
            <div className="rotate-6 scale-110 shadow-2xl z-[9999] pointer-events-none">
              <CardView card={activeDragCard} />
            </div>
          ) : null}
        </DragOverlay>

        {/* Drag Action Modal */}
        {dragModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-3xl border border-white/20 shadow-2xl max-w-md w-full text-center">
              <h2 className="text-2xl font-bold text-yellow-400 mb-6">¿Qué jugada deseas realizar?</h2>
              
              <div className="flex flex-col gap-4">
                {dragModalData.validActions.map((action, idx) => (
                  <button
                    key={idx}
                    className={`w-full py-4 rounded-xl font-bold text-xl transition-all shadow-lg border border-white/10 uppercase tracking-widest text-white hover:scale-105
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
                    {action.type === 'aumentarFormacion' ? 'Aumentar' : action.type}
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
