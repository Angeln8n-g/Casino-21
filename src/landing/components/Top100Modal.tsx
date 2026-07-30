import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Search } from 'lucide-react';
import type { ChampionshipLeaderboardItem } from '../hooks/useChampionshipLanding';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leaderboard: ChampionshipLeaderboardItem[];
  prizePoolUsd: number;
}

export default function Top100Modal({ isOpen, onClose, leaderboard, prizePoolUsd }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  // Expand top 10 to top 100 with generated mock extensions if length < 100
  const full100List: ChampionshipLeaderboardItem[] = React.useMemo(() => {
    const list = [...leaderboard];
    const colors = ['#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#60a5fa', '#fb923c', '#38bdf8', '#c084fc', '#facc15', '#4ade80'];

    for (let i = list.length + 1; i <= 100; i++) {
      let prize = 0;
      if (i <= 4) prize = Math.round(prizePoolUsd * 0.10);
      else if (i <= 8) prize = Math.round(prizePoolUsd * 0.05);
      else if (i <= 16) prize = 15;
      else if (i <= 32) prize = 5;

      const mockName = `@Jugador${i}`;
      list.push({
        rank: i,
        username: mockName,
        points: Math.max(100, 10000 - i * 95),
        projectedPrize: prize,
        avatarColor: colors[i % colors.length],
        avatarLetter: `J${i}`,
      });
    }
    return list;
  }, [leaderboard, prizePoolUsd]);

  const filtered = full100List.filter((item) =>
    item.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-[#080d1a] border-2 border-yellow-500/40 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(251,191,36,0.2)] overflow-hidden z-10"
          >
            {/* Header Modal */}
            <div className="p-5 sm:p-6 border-b border-yellow-500/20 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400">
                  <Trophy size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black font-['Russo_One'] text-white">TOP 100 CHAMPIONSHIP</h3>
                  <p className="text-xs text-gray-400 font-['Chakra_Petch']">Los 32 primeros califican para disputar la gran final</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 bg-slate-950/60 border-b border-white/5">
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar usuario en el Top 100..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 font-['Chakra_Petch']"
                />
              </div>
            </div>

            {/* Table list */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
              {filtered.map((player) => {
                const isQualified = player.rank <= 32;
                return (
                  <div
                    key={player.username}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isQualified
                        ? 'bg-yellow-500/[0.03] border-yellow-500/20 hover:border-yellow-500/40'
                        : 'bg-white/[0.01] border-white/5 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-center font-mono font-black text-sm text-yellow-400">
                        #{player.rank}
                      </div>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-black text-xs select-none"
                        style={{ backgroundColor: player.avatarColor }}
                      >
                        {player.avatarLetter}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white font-['Chakra_Petch'] flex items-center gap-2">
                          {player.username}
                          {isQualified && (
                            <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">
                              Clasificado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-black text-sm text-white">{player.points.toLocaleString()} pts</div>
                      {player.projectedPrize > 0 && (
                        <div className="text-xs text-yellow-400 font-bold font-['Chakra_Petch']">
                          ${player.projectedPrize} USD
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
