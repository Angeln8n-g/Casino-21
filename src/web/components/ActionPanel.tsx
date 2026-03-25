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
      <div className="h-16 flex items-center justify-center text-gray-400">
        Selecciona una carta de tu mano para ver las acciones disponibles.
      </div>
    );
  }

  const handleColocar = () => {
    onPlayAction({ type: 'colocar' });
  };

  const handleLlevar = () => {
    onPlayAction({
      type: 'llevar',
      boardCardIds: Array.from(selectedBoardCardIds),
      formationIds: Array.from(selectedFormationIds)
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
    <div className="h-20 flex items-center justify-center gap-4 bg-black/40 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-white/20">
      <span className="text-sm font-bold text-gray-300 mr-4 drop-shadow">Acciones:</span>
      
      {selectedBoardCardIds.size === 0 && selectedFormationIds.size === 0 ? (
        <>
          <button onClick={handleColocar} className="btn bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 border border-white/10">
            Colocar
          </button>
          <button onClick={handleCantar} className="btn bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 border border-white/10">
            Cantar As
          </button>
        </>
      ) : (
        <>
          <button onClick={handleLlevar} className="btn bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 border border-white/10">
            Llevar
          </button>
          {selectedBoardCardIds.size > 0 && selectedFormationIds.size === 0 && (
            <>
              <button onClick={handleFormar} className="btn bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 border border-white/10 text-black">
                Formar
              </button>
              <button onClick={handleFormarPar} className="btn bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 border border-white/10 text-white">
                Formar Par
              </button>
            </>
          )}
          {selectedFormationIds.size === 1 && selectedBoardCardIds.size === 0 && (
            <>
              <button onClick={handleFormarPar} className="btn bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 border border-white/10 text-white">
                Formar Par
              </button>
              <button onClick={handleAumentarFormacion} className="btn bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 border border-white/10">
                Aumentar
              </button>
            </>
          )}
        </>
      )}

      <button onClick={onClearSelection} className="btn bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-bold transition-all shadow-lg border border-white/20 ml-auto">
        Cancelar
      </button>
    </div>
  );
}
