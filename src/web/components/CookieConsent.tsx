import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'cookie_consent';

interface ConsentData {
  accepted: boolean;
  timestamp: string;
}

export function getCookieConsent(): ConsentData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // localStorage unavailable (private browsing)
  }
  return null;
}

export function setCookieConsent(accepted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      accepted,
      timestamp: new Date().toISOString(),
    }));
  } catch {
    // localStorage unavailable
  }
}

export function clearCookieConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

export function hasAdConsent(): boolean {
  const consent = getCookieConsent();
  return consent?.accepted === true;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    setCookieConsent(true);
    setVisible(false);
  };

  const handleReject = () => {
    setCookieConsent(false);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] animate-slide-up">
      <div className="bg-[#0f172a]/98 backdrop-blur-xl border-t border-yellow-500/20 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-300 leading-relaxed">
                Usamos cookies para mejorar tu experiencia y mostrar anuncios relevantes.
                Los anuncios nos ayudan a mantener el juego gratuito.{' '}
                <a href="/cookies" className="text-casino-gold hover:underline font-bold">
                  Más información
                </a>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/cookies"
                className="text-xs text-gray-500 hover:text-gray-300 px-3 py-2 rounded-lg transition-colors font-bold uppercase tracking-wider"
              >
                Configurar
              </a>
              <button
                onClick={handleReject}
                className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-4 py-2 rounded-xl transition-all font-bold uppercase tracking-wider"
              >
                Rechazar
              </button>
              <button
                onClick={handleAccept}
                className="text-xs bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-5 py-2 rounded-xl font-black uppercase tracking-wider hover:scale-105 transition-transform"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
