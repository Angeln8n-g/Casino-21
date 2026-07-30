import React from 'react';
import { Trophy, Sparkles } from 'lucide-react';

interface Props {
  prizePoolUsd: number;
}

export default function StickyMobileBar({ prizePoolUsd }: Props) {
  const formattedPrize = Math.floor(prizePoolUsd).toLocaleString();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 border-t border-yellow-500/30 p-3 px-4 backdrop-blur-xl sm:hidden flex items-center justify-between shadow-[0_-5px_25px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400">
          <Trophy size={16} />
        </div>
        <div>
          <div className="text-[10px] text-gray-400 font-bold uppercase font-['Chakra_Petch'] leading-none">Pozo Championship</div>
          <div className="text-base font-black font-['Russo_One'] text-yellow-400 leading-tight">${formattedPrize} USD</div>
        </div>
      </div>

      <a
        href="/login"
        className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-xs px-4 py-2.5 rounded-xl shadow font-['Russo_One'] flex items-center gap-1.5 active:scale-95 transition-transform"
      >
        <Sparkles size={14} /> ENTRAR A LA LIGA
      </a>
    </div>
  );
}
