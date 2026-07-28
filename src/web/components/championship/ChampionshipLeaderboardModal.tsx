import React, { useState } from 'react';
import { X, Search, Copy, CheckCircle2, Trophy, Users, Star, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export const ChampionshipLeaderboardModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mockData = Array.from({ length: 50 }).map((_, i) => ({
    rank: i + 1,
    username: `Player_${i + 1}`,
    points: 15000 - i * 100,
    adsToday: Math.floor(Math.random() * 300),
    clicks: Math.floor(Math.random() * 50),
    referrals: Math.floor(Math.random() * 10),
    isCurrentUser: i === 46 // #47
  }));

  const handleCopyRef = () => {
    navigator.clipboard.writeText('https://kasino21.com/ref/user123');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-5xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-br from-slate-800 to-slate-950 border-b border-white/10">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-casino-gold to-yellow-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                <Trophy className="w-8 h-8 text-slate-950" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest">Leaderboard</h2>
                <p className="text-sm text-casino-gold uppercase tracking-wider font-bold">Top 1000 Clasificatorio</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center min-w-[100px]">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Participantes</span>
                <span className="text-lg font-black text-white">4,281</span>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center min-w-[100px]">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Tu Rank</span>
                <span className="text-lg font-black text-casino-gold">#47</span>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center min-w-[100px]">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Ads Hoy</span>
                <span className="text-lg font-black text-white">142<span className="text-xs text-gray-500">/300</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar & Referral */}
        <div className="p-4 bg-slate-800/50 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar jugador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-casino-gold outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-1.5 pl-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">Invita: +200 pts</span>
              <div className="flex gap-1">
                <code className="text-xs text-casino-gold font-mono bg-black/40 px-2 py-1 rounded-lg">.../ref/user123</code>
                <button 
                  onClick={handleCopyRef}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button 
              onClick={handleRefresh}
              className={`p-2 bg-black/40 border border-white/10 rounded-xl hover:bg-white/10 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-slate-900 p-0">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md z-10">
              <tr>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest">Rank</th>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest">Jugador</th>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest text-right">Puntos</th>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest text-right">Ads Hoy</th>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest text-right">Clicks</th>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest text-right">Referidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {mockData.map((row) => (
                <React.Fragment key={row.rank}>
                  {row.rank === 33 && (
                    <tr>
                      <td colSpan={6} className="p-0 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-px bg-red-500/50"></div>
                          <span className="absolute px-3 py-1 bg-red-950 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/50 rounded-full">
                            Línea de Corte (Top 32)
                          </span>
                        </div>
                        <div className="h-10"></div>
                      </td>
                    </tr>
                  )}
                  <tr className={`hover:bg-white/5 transition-colors ${row.isCurrentUser ? 'bg-casino-gold/10 relative' : ''}`}>
                    <td className="px-6 py-3">
                      {row.isCurrentUser && <div className="absolute left-0 top-0 bottom-0 w-1 bg-casino-gold shadow-[0_0_10px_rgba(251,191,36,1)]"></div>}
                      <span className={`font-black ${row.rank <= 3 ? 'text-casino-gold text-lg' : row.rank <= 32 ? 'text-emerald-400' : 'text-gray-500'}`}>
                        #{row.rank}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 overflow-hidden">
                          <Users className="w-4 h-4 text-gray-400" />
                        </div>
                        <span className={`font-bold ${row.isCurrentUser ? 'text-casino-gold' : 'text-white'}`}>{row.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-black text-white">{row.points.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right font-mono text-gray-400">{row.adsToday}/300</td>
                    <td className="px-6 py-3 text-right font-mono text-gray-400">{row.clicks}</td>
                    <td className="px-6 py-3 text-right font-mono text-gray-400">{row.referrals}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};
