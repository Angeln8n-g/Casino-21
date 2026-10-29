import React, { memo } from 'react';
import { Play, ShieldCheck } from 'lucide-react';

interface Props {
  onlineCount?: number;
}

function MobilePlayDock({ onlineCount = 28 }: Props) {
  return (
    <aside
      aria-label="Acceso rápido al juego"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#060a13]/95 border-t border-amber-500/25 p-2.5 px-4 backdrop-blur-xl sm:hidden flex items-center justify-between gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.85)] pb-safe"
    >
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          <span className="text-[11px] font-['Chakra_Petch'] font-bold text-gray-300 uppercase tracking-wider truncate">
            {onlineCount} en la mesa
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-amber-400/90 font-['Chakra_Petch']">
          <ShieldCheck size={11} aria-hidden="true" /> 100% Gratis · Sin Apuestas
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href="/login"
          className="bg-gradient-to-r from-amber-400 to-yellow-500 text-[#050811] font-black text-xs px-5 py-2.5 rounded-xl font-['Russo_One'] tracking-wide flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
        >
          <Play size={14} className="fill-current" aria-hidden="true" /> JUGAR GRATIS
        </a>
      </div>
    </aside>
  );
}

export default memo(MobilePlayDock);
