import React from 'react';

/**
 * Props for the AbandonConfirmModal component.
 * @property roomId - The current game room ID.
 * @property onConfirm - Callback when the player confirms abandonment.
 * @property onCancel - Callback to dismiss the modal.
 */
interface AbandonConfirmModalProps {
  roomId: string;
  onConfirm: (roomId: string) => void;
  onCancel: () => void;
}

/**
 * AbandonConfirmModal
 *
 * Full-screen modal asking the player to confirm abandoning the match.
 * Warns about coin and ELO loss before executing the action.
 */
export function AbandonConfirmModal({ roomId, onConfirm, onCancel }: AbandonConfirmModalProps) {
  return (
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
              onConfirm(roomId);
              localStorage.removeItem('casino21_roomId');
              window.location.reload();
            }}
          >
            Sí, Abandonar
          </button>
          <button
            className="w-full py-4 rounded-xl font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors uppercase tracking-wider"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
