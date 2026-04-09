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
    return (
      <div className="h-12 md:h-16 flex items-center justify-center text-xs md:text-base text-gray-400 px-4 text-center">
        Selecciona una carta de tu mano para ver las acciones disponibles.
      </div>
    );
  }

  const handleColocar = () => {
    onPlayAction({ type: 'colocar' });
  };

  const handleLlevar = () => {
    // If the player has a pending formation that matches the hand card's value, we should auto-include it
    // if they haven't explicitly selected it, to avoid the validation error.
    let currentFormationIds = Array.from(selectedFormationIds);
    const player = gameState.players[gameState.currentTurnPlayerIndex];
    const handCard = player.hand.find(c => c.id === selectedHandCardId);
    
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
    // Determine the expected formation value to see if we should auto-merge with an existing formation
    const player = gameState.players[gameState.currentTurnPlayerIndex];
    const handCard = player.hand.find(c => c.id === selectedHandCardId);
    
    if (handCard) {
      const boardCards = gameState.board.cards.filter(c => selectedBoardCardIds.has(c.id));
      const targetSum = handCard.value + boardCards.reduce((sum, c) => sum + c.value, 0);
      
      const existingFormation = gameState.board.formations.find(f => 
        f.createdBy === player.id && f.value === targetSum
      );
      
      if (existingFormation && !selectedFormationIds.has(existingFormation.id)) {
        // Instead of calling 'formar', if they have a formation of this value, 
        // the game-engine's 'formar' automatically merges it now, so we can just proceed with 'formar'.
        // Or we can convert it to 'formarPar' internally if needed.
        // We'll just dispatch 'formar' and the engine will handle the merge and set isGroup = true.
      }
    }

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
    <div className="h-auto md:h-20 flex flex-wrap md:flex-nowrap items-center justify-center md:justify-start gap-2 md:gap-4 bg-black/40 backdrop-blur-md p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-2xl border border-white/20 w-full max-w-full">
      <span className="hidden md:inline text-sm font-bold text-gray-300 mr-4 drop-shadow">Acciones:</span>
      
      <div className="flex flex-wrap justify-center gap-2 md:gap-4 w-full md:w-auto flex-1">
        {selectedBoardCardIds.size === 0 && selectedFormationIds.size === 0 ? (
          <>
            <button onClick={handleColocar} className="btn flex-1 md:flex-none min-w-[100px] min-h-[44px] bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-3 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-base transition-all shadow-lg hover:scale-105 border border-white/10 touch-manipulation">
              Colocar
            </button>
            <button onClick={handleCantar} className="btn flex-1 md:flex-none min-w-[100px] min-h-[44px] bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 px-3 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-base transition-all shadow-lg hover:scale-105 border border-white/10 touch-manipulation">
              Cantar As
            </button>
          </>
        ) : (
          <>
            <button onClick={handleLlevar} className="btn flex-1 md:flex-none min-w-[100px] min-h-[44px] bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 px-3 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-base transition-all shadow-lg hover:scale-105 border border-white/10 touch-manipulation">
              Llevar
            </button>
            {selectedBoardCardIds.size > 0 && selectedFormationIds.size === 0 && (
              <>
                <button onClick={handleFormar} className="btn flex-1 md:flex-none min-w-[100px] min-h-[44px] bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 px-3 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-base transition-all shadow-lg hover:scale-105 border border-white/10 text-black touch-manipulation">
                  Formar
                </button>
                <button onClick={handleFormarPar} className="btn flex-1 md:flex-none min-w-[100px] min-h-[44px] bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 px-3 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-base transition-all shadow-lg hover:scale-105 border border-white/10 text-white touch-manipulation">
                  Agrupar
                </button>
              </>
            )}
            {selectedFormationIds.size === 1 && selectedBoardCardIds.size === 0 && (
              <>
                <button onClick={handleFormarPar} className="btn flex-1 md:flex-none min-w-[100px] min-h-[44px] bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 px-3 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-base transition-all shadow-lg hover:scale-105 border border-white/10 text-white touch-manipulation">
                  Agrupar
                </button>
                <button onClick={handleAumentarFormacion} className="btn flex-1 md:flex-none min-w-[100px] min-h-[44px] bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 px-3 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-base transition-all shadow-lg hover:scale-105 border border-white/10 touch-manipulation">
                  Aumentar
                </button>
              </>
            )}
          </>
        )}
      </div>

      <button onClick={onClearSelection} className="btn w-full md:w-auto min-h-[44px] bg-white/10 hover:bg-white/20 px-3 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-base transition-all shadow-lg border border-white/20 md:ml-auto mt-2 md:mt-0 touch-manipulation">
        Cancelar
      </button>
    </div>
  );
}
