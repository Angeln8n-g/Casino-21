import React, { useState, useEffect } from 'react';
import { showInterstitialAd } from './AdManager';

interface MatchPointHUDProps {
  score: number;
}

export const MatchPointHUD: React.FC<MatchPointHUDProps> = ({ score }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (score >= 17 && score < 21) {
      setIsVisible(true);
      setIsOpen(true);
      // Trigger Interstitial Ad during this pause/moment
      showInterstitialAd();
    } else {
      setIsVisible(false);
    }
  }, [score]);

  if (!isVisible) return null;

  let title = "🔥 MATCH POINT";
  let description = "";
  let conditions: { label: string; icon: string; points: number }[] = [];

  if (score === 17) {
    description = "Estás a 4 puntos de ganar. Según las reglas, solo aplican estas jugadas:";
    conditions = [
      { label: "Mayoría de Cartas", icon: "🃏", points: 3 },
      { label: "Mayoría de Picas", icon: "♠️", points: 1 }
    ];
  } else if (score === 18 || score === 19) {
    description = `Estás a ${21 - score} punto(s) de ganar. Solo aplica:`;
    conditions = [
      { label: "Mayoría de Cartas", icon: "🃏", points: 3 }
    ];
  } else if (score === 20) {
    description = "¡Estás a 1 punto de ganar! Solo aplica:";
    conditions = [
      { label: "Mayoría de Picas", icon: "♠️", points: 1 }
    ];
  }

  return (
    <div className="fixed md:absolute top-2.5 md:top-3 right-2 md:right-4 z-40 pointer-events-auto">
      {/* Compact Status Pill */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 hover:bg-amber-900/90 border border-amber-500/40 text-amber-200 text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95"
        title="Ver reglas de Match Point"
      >
        <span className="text-sm">🔥</span>
        <span>Match Point</span>
        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
          {21 - score} pt{21 - score > 1 ? 's' : ''}
        </span>
        <span className="text-[10px] text-amber-400/70 ml-0.5">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Expandable Rule Hints Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-8 mt-1 w-64 md:w-72 bg-gray-950/95 border border-amber-500/30 rounded-xl shadow-2xl p-3 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 text-left">
          <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-white/10">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Reglas Match Point</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-300 hover:text-white text-xs p-0.5"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-300 text-[11px] leading-relaxed mb-2.5">
            {description}
          </p>
          <div className="space-y-1.5">
            {conditions.map((cond, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-2 py-1"
              >
                <div className="flex items-center gap-1.5 text-xs text-amber-100 font-medium">
                  <span>{cond.icon}</span>
                  <span>{cond.label}</span>
                </div>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
                  +{cond.points} PT{cond.points > 1 ? 'S' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
