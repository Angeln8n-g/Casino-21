import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { requestAccountDeletion } from '../services/accountService';
import { triggerHaptic } from '../utils/haptics';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

const FEEDBACK_REASONS = [
  'No me gustó la dinámica o reglas del juego',
  'Es demasiado difícil o competitivo',
  'Problemas de conexión o rendimiento',
  'Falta de tiempo para jugar',
  'Solo estaba probando el juego',
  'Otro motivo',
];

export function DeleteAccountModal({ isOpen, onClose, username = 'jugador' }: DeleteAccountModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const trapRef = useFocusTrap({
    isOpen,
    onClose: () => {
      if (!isDeleting) onClose();
    },
  });

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    triggerHaptic('card_tap');

    const result = await requestAccountDeletion(selectedReason || undefined);

    if (result.success) {
      triggerHaptic('success');
      setIsDone(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      setIsDeleting(false);
      setErrorMessage(result.error || 'No se pudo completar la baja. Inténtalo de nuevo.');
      triggerHaptic('error');
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        ref={trapRef}
        className="relative w-full max-w-lg bg-[#0d111d] border border-rose-500/40 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col text-white animate-scale-up"
      >
        {/* Top Header Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600" />

        {isDone ? (
          /* Farewell screen */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-black font-['Russo_One'] text-white">
              Baja completada
            </h2>
            <p className="text-sm font-['Chakra_Petch'] text-gray-300 max-w-md mx-auto leading-relaxed">
              Tu cuenta y datos han sido eliminados de KASINO21 de forma permanente. Gracias por haber jugado y probado la plataforma.
            </p>
            <div className="text-xs font-mono text-gray-500 pt-2">
              Redirigiendo a la pantalla principal...
            </div>
          </div>
        ) : (
          /* Confirmation Flow */
          <>
            {/* Modal Title Bar */}
            <div className="p-5 sm:p-6 pb-4 flex items-start justify-between border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h2 id="delete-account-title" className="text-lg sm:text-xl font-black font-['Russo_One'] text-white">
                    Darse de baja del juego
                  </h2>
                  <p className="text-xs font-['Chakra_Petch'] text-gray-400">
                    Cuenta: <span className="text-amber-400 font-bold">@{username}</span>
                  </p>
                </div>
              </div>

              {!isDeleting && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
                  aria-label="Cerrar ventana"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar text-xs sm:text-sm font-['Chakra_Petch']">
              <p className="text-gray-300 leading-relaxed">
                Lamentamos que el juego no haya sido de tu agrado. Si decides darte de baja, eliminaremos permanentemente tu usuario y tu historial:
              </p>

              {/* Consequences Box */}
              <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/25 space-y-2 text-rose-200 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-300 uppercase tracking-wider text-[11px]">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>Consecuencias de la baja definitiva:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-300 pl-1">
                  <li>Se borrará tu nombre de usuario, rango y puntuación ELO.</li>
                  <li>Perderás tus monedas virtuales acumuladas y avatares comprados.</li>
                  <li>Se eliminarán tus registros de torneos y misiones completadas.</li>
                  <li>Esta acción es <strong className="text-rose-400">irreversible</strong> y no se puede restaurar.</li>
                </ul>
              </div>

              {/* Optional Reason Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  ¿Por qué deseas darte de baja? <span className="text-gray-500 font-normal lowercase">(opcional)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FEEDBACK_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setSelectedReason(reason)}
                      disabled={isDeleting}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                        selectedReason === reason
                          ? 'bg-amber-400/15 border-amber-400 text-amber-300 font-bold'
                          : 'bg-white/[0.03] border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/[0.06]'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-5 sm:p-6 pt-4 border-t border-white/[0.08] bg-[#090d16]/70 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-gray-200 font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Cancelar y seguir jugando
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-['Russo_One'] text-xs font-bold uppercase tracking-wider transition-all shadow-[0_2px_15px_rgba(244,63,94,0.4)] disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Procesando baja...' : 'Confirmar baja definitiva'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
