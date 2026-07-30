import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import type { LiveToast } from '../hooks/useChampionshipLanding';

interface Props {
  toast: LiveToast | null;
}

export default function LiveToastNotification({ toast }: Props) {
  return (
    <div className="fixed bottom-6 left-4 sm:left-6 z-50 pointer-events-none max-w-sm">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="pointer-events-auto bg-[#090f20]/95 border-2 border-yellow-500/40 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 flex-shrink-0">
              <Sparkles size={20} className="animate-spin-slow" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-gray-300 font-['Chakra_Petch'] font-semibold">
                <span className="text-yellow-400 font-bold">{toast.user}</span>
                <span>({toast.city})</span>
              </div>
              <div className="text-sm font-black font-['Russo_One'] text-emerald-400 flex items-center gap-1 mt-0.5">
                <span>Ganó ${toast.amount} USD</span>
                <span className="text-[10px] text-gray-400 font-normal">via {toast.method}</span>
                <CheckCircle2 size={12} className="text-emerald-400" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
