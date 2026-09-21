import React, { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { safeStorage } from '../../utils/safeStorage';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Check if previously dismissed within 7 days
    try {
      const dismissedAt = safeStorage.getItem('kasino21_pwa_dismissed');
      if (dismissedAt) {
        const daysSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          return;
        }
      }
    } catch {}

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent automatic browser mini-infobar so custom banner can be shown
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 30 seconds of active usage
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 30000);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    setIsVisible(false);
    if (!deferredPrompt) return;
    
    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      const userChoice = await deferredPrompt.userChoice;
      if (userChoice?.outcome === 'accepted') {
        console.log('[PWA] User accepted the installation');
      }
    } catch (err) {
      console.warn('[PWA] Prompt invocation failed:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      safeStorage.setItem('kasino21_pwa_dismissed', Date.now().toString());
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between gap-4">
        <div className="bg-indigo-500/10 p-3 rounded-xl flex-shrink-0">
          <Download className="w-6 h-6 text-indigo-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-white font-bold font-outfit mb-1">Instalar Kasino21</h3>
          <p className="text-sm text-slate-400 font-inter mb-3 leading-tight">
            Instala la aplicación para un acceso rápido y una mejor experiencia.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors font-outfit"
            >
              Instalar
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-slate-300 hover:text-white text-sm font-bold transition-colors font-outfit"
            >
              Más tarde
            </button>
          </div>
        </div>

        <button 
          onClick={handleDismiss}
          className="text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
