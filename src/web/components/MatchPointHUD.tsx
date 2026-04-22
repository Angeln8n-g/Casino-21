import React, { useState, useEffect } from 'react';

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
    <>
      {/* Collapsed Toggle Button */}
      {!isOpen && isVisible && (
        <button
          onClick={() => setIsOpen(true)}
          className="
            fixed md:absolute top-16 md:top-24 right-0 md:-right-4 z-50
            bg-black/60 backdrop-blur-md border-l border-t border-b border-yellow-500/40
            text-yellow-400 p-2 md:p-3 rounded-l-xl shadow-[0_0_15px_rgba(234,179,8,0.2)]
            hover:bg-yellow-900/40 transition-colors flex items-center justify-center
            animate-pulse
          "
        >
          <span className="text-lg filter drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">🔥</span>
        </button>
      )}

      {/* Main Panel */}
      <div className={`
        fixed md:absolute top-16 md:top-24 right-4 md:right-8 z-50
        transition-all duration-500 ease-in-out transform
        ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[150%] md:translate-x-[120%] opacity-0 pointer-events-none'}
      `}>
        <div className="
          relative w-64 md:w-80
          bg-black/60 backdrop-blur-xl
          border border-yellow-500/40 rounded-2xl
          shadow-[0_0_30px_rgba(234,179,8,0.2)]
          overflow-hidden
        ">
          {/* Animated Background Glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-yellow-500/20 to-transparent blur-3xl animate-pulse" />
            <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-orange-500/20 to-transparent blur-3xl animate-pulse delay-1000" />
          </div>

          {/* Header */}
          <div 
            className="relative px-4 py-3 bg-gradient-to-r from-yellow-900/50 to-black/50 border-b border-yellow-500/30 flex justify-between items-center cursor-pointer"
            onClick={() => setIsOpen(false)}
          >
            <h3 className="text-yellow-400 font-black tracking-widest text-sm md:text-base drop-shadow-md">
              {title}
            </h3>
            <button 
              className="text-yellow-400/70 hover:text-yellow-300 transition-colors"
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="relative p-4 space-y-4">
            <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
              {description}
            </p>

            <div className="space-y-2">
              {conditions.map((cond, idx) => (
                <div 
                  key={idx}
                  className="
                    flex items-center justify-between
                    bg-gradient-to-r from-white/5 to-transparent
                    border border-white/10 rounded-lg p-2
                    hover:border-yellow-500/50 hover:bg-yellow-500/10
                    transition-all duration-300
                  "
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{cond.icon}</span>
                    <span className="text-yellow-100 font-semibold text-xs md:text-sm">{cond.label}</span>
                  </div>
                  <div className="bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[10px] md:text-xs font-bold px-2 py-1 rounded-md">
                    +{cond.points} PT{cond.points > 1 ? 'S' : ''}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between items-center text-[10px] md:text-xs text-yellow-200/50">
                <span>Puntuación actual:</span>
                <span className="font-bold text-yellow-400 text-sm">{score} / 21</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
