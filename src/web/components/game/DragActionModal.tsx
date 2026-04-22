import React from 'react';
import { Card } from '../../../domain/card';
import { Action } from '../../../application/action-validator';
import { ActionPayload } from '../ActionPanel';

/**
 * Data required to render the drag-action modal.
 * @property handCard - The card the player dragged from their hand.
 * @property targetId - The ID of the drop target (board card / formation).
 * @property targetType - Whether the target is a board card, formation, or the board itself.
 * @property validActions - List of actions that are valid for this drag combination.
 */
interface DragModalData {
  handCard: Card;
  targetId?: string;
  targetType: 'boardCard' | 'formation' | 'board';
  validActions: ActionPayload[];
}

/**
 * Props for the DragActionModal component.
 * @property data - Modal data with the dragged card and valid actions.
 * @property playerId - The local player's ID.
 * @property onSelect - Callback when a valid action is chosen.
 * @property onCancel - Callback to dismiss the modal.
 */
interface DragActionModalProps {
  data: DragModalData;
  playerId: string;
  onSelect: (action: Action) => void;
  onCancel: () => void;
}

/** Maps action types to human-readable Spanish labels. */
const ACTION_LABELS: Record<string, string> = {
  aumentarFormacion: 'Aumentar',
  formarPar: 'Agrupar',
};

/** Maps action types to gradient classes for button styling. */
const ACTION_STYLES: Record<string, string> = {
  llevar: 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400',
  formar: 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black',
  formarPar: 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400',
  aumentarFormacion: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400',
  colocar: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400',
  cantar: 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400',
};

/**
 * DragActionModal
 *
 * Full-screen modal presented after a player drags a card onto a valid
 * drop target. Lists all valid actions for that combination, letting the
 * player choose which move to make.
 */
export function DragActionModal({ data, playerId, onSelect, onCancel }: DragActionModalProps) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-gradient-to-b from-gray-800 to-gray-950 p-6 md:p-8 rounded-3xl border border-yellow-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-md w-full text-center animate-scale-up">
        <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-6 drop-shadow-md">
          ¿Qué jugada deseas realizar?
        </h2>

        <div className="flex flex-col gap-3 md:gap-4">
          {data.validActions.map((action, idx) => (
            <button
              key={idx}
              className={`w-full py-3 md:py-4 rounded-xl font-bold text-lg md:text-xl transition-all shadow-lg border border-white/10 uppercase tracking-widest text-white hover:scale-105 active:scale-95 touch-manipulation ${ACTION_STYLES[action.type] || ''}`}
              onClick={() => {
                onSelect({ ...action, playerId, cardId: data.handCard.id } as Action);
              }}
            >
              {ACTION_LABELS[action.type] || action.type}
            </button>
          ))}
        </div>

        <button
          className="mt-6 w-full py-3 rounded-xl font-bold text-gray-300 bg-white/10 hover:bg-white/20 transition-all border border-white/10"
          onClick={onCancel}
        >
          CANCELAR
        </button>
      </div>
    </div>
  );
}

export type { DragModalData };
