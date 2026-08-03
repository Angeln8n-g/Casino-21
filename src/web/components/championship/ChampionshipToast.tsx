import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToastData {
  id: string;
  pointsAdded: number;
  newTotalPoints: number;
  streakMultiplier?: number;
  winStreak?: number;
  eventType: string;
}

export const ChampionshipToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handlePointEarned = (e: Event) => {
      const customEv = e as CustomEvent;
      if (!customEv.detail) return;

      const newToast: ToastData = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        pointsAdded: customEv.detail.pointsAdded || 1,
        newTotalPoints: customEv.detail.newTotalPoints || 0,
        streakMultiplier: customEv.detail.streakMultiplier || 1,
        winStreak: customEv.detail.winStreak || 0,
        eventType: customEv.detail.eventType || 'view',
      };

      setToasts(prev => [newToast, ...prev.slice(0, 2)]); // Keep max 3 active toasts

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 4000);
    };

    window.addEventListener('championship_point_earned', handlePointEarned);
    return () => {
      window.removeEventListener('championship_point_earned', handlePointEarned);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none font-['Chakra_Petch']">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="pointer-events-auto bg-slate-950/95 border-2 border-casino-gold rounded-2xl p-4 shadow-[0_0_25px_rgba(251,191,36,0.5)] flex items-center gap-3.5 max-w-sm backdrop-blur-md"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-casino-gold via-amber-400 to-yellow-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(251,191,36,0.6)]">
              {toast.streakMultiplier && toast.streakMultiplier > 1 ? (
                <Flame className="w-6 h-6 text-slate-950 animate-bounce" />
              ) : toast.eventType === 'click' ? (
                <Zap className="w-6 h-6 text-slate-950" />
              ) : (
                <Trophy className="w-6 h-6 text-slate-950" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black font-['Russo_One'] text-casino-gold uppercase tracking-wider">
                  +{toast.pointsAdded} {toast.pointsAdded === 1 ? 'Punto' : 'Puntos'} Championship
                </span>
                {toast.streakMultiplier && toast.streakMultiplier > 1 && (
                  <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-orange-500 text-black rounded font-mono">
                    🔥 x2 Racha
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-300 font-bold mt-0.5">
                {toast.eventType === 'click'
                  ? '⚡ Bonus Clic de Sponsor'
                  : '🎬 Vista de anuncio registrada'}
              </p>
              {toast.newTotalPoints > 0 && (
                <p className="text-[10px] text-casino-gold/80 font-mono font-bold mt-1">
                  Total acumulado: {toast.newTotalPoints.toLocaleString()} pts
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
