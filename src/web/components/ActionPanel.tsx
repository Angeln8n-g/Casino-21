import React from 'react';
import { Action, ActionType } from '../../application/action-validator';
import { GameState } from '../../domain/game-state';

export type ActionPayload = 
  | { type: 'llevar'; boardCardIds: string[]; formationIds: string[] }
  | { type: 'formar'; boardCardIds: string[] }
  | { type: 'formarPar'; formationId?: string; boardCardIds?: string[] }
  | { type: 'aumentarFormacion'; formationId: string }
  | { type: 'cantar' }
  | { type: 'colocar' };

interface ActionPanelProps {
  gameState: GameState;
  selectedHandCardId: string | null;
  selectedBoardCardIds: Set<string>;
  selectedFormationIds: Set<string>;
  onPlayAction: (action: ActionPayload) => void;
  onClearSelection: () => void;
}

export function ActionPanel({
  gameState,
  selectedHandCardId,
  selectedBoardCardIds,
  selectedFormationIds,
  onPlayAction,
  onClearSelection
}: ActionPanelProps) {
  if (!selectedHandCardId) {
    return null;
  }

  const handleColocar = () => {
    onPlayAction({ type: 'colocar' });
  };

  const handleLlevar = () => {
    let currentFormationIds = Array.from(selectedFormationIds);
    const player = gameState.players[gameState.currentTurnPlayerIndex];
    const handCard = player?.hand.find(c => c.id === selectedHandCardId);
    
    if (handCard) {
      const targetValues = handCard.rank === 'A' ? [1, 14] : [handCard.value];
      const myPendingFormations = gameState.board.formations.filter(f => 
        f.createdBy === player.id && targetValues.includes(f.value)
      );

      for (const form of myPendingFormations) {
        if (!currentFormationIds.includes(form.id)) {
          currentFormationIds.push(form.id);
        }
      }
    }

    onPlayAction({
      type: 'llevar',
      boardCardIds: Array.from(selectedBoardCardIds),
      formationIds: currentFormationIds
    });
  };

  const handleFormar = () => {
    onPlayAction({
      type: 'formar',
      boardCardIds: Array.from(selectedBoardCardIds)
    });
  };

  const handleFormarPar = () => {
    if (selectedFormationIds.size === 1) {
      const formId = Array.from(selectedFormationIds)[0];
      onPlayAction({ type: 'formarPar', formationId: formId });
    } else if (selectedBoardCardIds.size > 0) {
      onPlayAction({ type: 'formarPar', boardCardIds: Array.from(selectedBoardCardIds) });
    }
  };

  const handleAumentarFormacion = () => {
    const formId = Array.from(selectedFormationIds)[0];
    if (formId) {
      onPlayAction({ type: 'aumentarFormacion', formationId: formId });
    }
  };

  const handleCantar = () => {
    onPlayAction({ type: 'cantar' });
  };

  return (
    <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2 bg-gray-950/90 backdrop-blur-xl px-3 py-2 rounded-xl md:rounded-2xl shadow-xl border border-white/10 w-full animate-in fade-in slide-in-from-bottom-2">
      <div className="flex flex-wrap items-center gap-2 flex-1 justify-center md:justify-start">
        {selectedBoardCardIds.size === 0 && selectedFormationIds.size === 0 ? (
          <>
            <button
              onClick={handleColocar}
              className="min-h-[36px] bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm transition-all shadow active:scale-95 border border-cyan-400/30"
            >
              Colocar
            </button>
            <button
              onClick={handleCantar}
              className="min-h-[36px] bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm transition-all shadow active:scale-95 border border-purple-500/30"
            >
              Cantar As
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleLlevar}
              className="min-h-[36px] bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-1.5 rounded-lg font-bold text-xs md:text-sm transition-all shadow-md active:scale-95 border border-emerald-400/40"
            >
              Llevar
            </button>
            {selectedBoardCardIds.size > 0 && selectedFormationIds.size === 0 && (
              <>
                <button
                  onClick={handleFormar}
                  className="min-h-[36px] bg-gray-800 hover:bg-gray-700 text-amber-300 px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm transition-all border border-amber-500/30 active:scale-95"
                >
                  Formar
                </button>
                <button
                  onClick={handleFormarPar}
                  className="min-h-[36px] bg-gray-800 hover:bg-gray-700 text-amber-200 px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm transition-all border border-amber-500/30 active:scale-95"
                >
                  Agrupar
                </button>
              </>
            )}
            {selectedFormationIds.size === 1 && selectedBoardCardIds.size === 0 && (
              <>
                <button
                  onClick={handleFormarPar}
                  className="min-h-[36px] bg-gray-800 hover:bg-gray-700 text-amber-200 px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm transition-all border border-amber-500/30 active:scale-95"
                >
                  Pares
                </button>
                <button
                  onClick={handleAumentarFormacion}
                  className="min-h-[36px] bg-gray-800 hover:bg-gray-700 text-rose-300 px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm transition-all border border-rose-500/30 active:scale-95"
                >
                  Aumentar
                </button>
              </>
            )}
          </>
        )}
      </div>

      <button
        onClick={onClearSelection}
        className="min-h-[36px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg font-medium text-xs transition-colors border border-white/10 active:scale-95"
      >
        Cancelar
      </button>
    </div>
  );
}
