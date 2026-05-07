import React from 'react';
import { RefreshCcw, X } from 'lucide-react';

interface UpdateNotificationProps {
  needRefresh: boolean;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  close: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ 
  needRefresh, 
  updateServiceWorker, 
  close 
}) => {
  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 border border-indigo-500/50 p-4 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.2)] z-[60] animate-in slide-in-from-top-5">
      <div className="flex items-start justify-between gap-4">
        <div className="bg-indigo-500/20 p-3 rounded-xl flex-shrink-0 animate-pulse">
          <RefreshCcw className="w-6 h-6 text-indigo-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-white font-bold font-outfit mb-1">Nueva actualización disponible</h3>
          <p className="text-sm text-slate-400 font-inter mb-3 leading-tight">
            Hay nuevas funciones y mejoras disponibles. Actualiza para obtener la mejor experiencia.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors font-outfit"
            >
              Actualizar
            </button>
            <button
              onClick={close}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold transition-colors font-outfit"
            >
              Más tarde
            </button>
          </div>
        </div>

        <button 
          onClick={close}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
