import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCcw } from 'lucide-react';

export const OfflineFallback: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    } else {
      // Opcional: mostrar un toast de que sigue sin conexión
      setIsOnline(false);
    }
  };

  if (isOnline) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 z-50 fixed inset-0">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center">
        <div className="bg-rose-500/10 p-4 rounded-full mb-6">
          <WifiOff className="w-12 h-12 text-rose-500" />
        </div>
        
        <h1 className="text-2xl font-black text-white mb-2 font-outfit">
          Sin Conexión
        </h1>
        
        <p className="text-slate-400 mb-8 leading-relaxed font-inter">
          Kasino21 es un juego multijugador que requiere conexión a internet. 
          Por favor, verifica tu red para continuar jugando.
        </p>

        <button
          onClick={handleRetry}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] font-outfit"
        >
          <RefreshCcw className="w-5 h-5" />
          Reintentar conexión
        </button>
      </div>
    </div>
  );
};
