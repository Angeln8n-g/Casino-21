import React from 'react';
import { Users, Clock, Trophy, Eye } from 'lucide-react';
import { TournamentVerticalBracket } from '../tournament/TournamentVerticalBracket';
import { TournamentMatch } from '../TournamentBracket';

export const ChampionshipLiveFinalView: React.FC = () => {
  // Mock bracket matches
  const mockMatches: TournamentMatch[] = [];

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 relative rounded-3xl overflow-hidden bg-slate-900 border border-casino-gold/30">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse flex items-center gap-1.5">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                EN VIVO
              </span>
              <span className="text-casino-gold text-sm font-bold uppercase tracking-widest">Gran Final</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-widest text-shadow-gold">KASINO21 CHAMPIONSHIP</h1>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-black/50 border border-white/10 rounded-xl p-4 text-center min-w-[120px]">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Espectadores</div>
              <div className="text-2xl font-black text-white flex items-center justify-center gap-2">
                <Eye className="w-5 h-5 text-casino-gold" />
                1,245
              </div>
            </div>
            <div className="bg-black/50 border border-white/10 rounded-xl p-4 text-center min-w-[120px]">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Pozo Final</div>
              <div className="text-2xl font-black text-emerald-400">
                $1,250
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bracket Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6">
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-casino-gold" />
              Cuadro Final (Top 32)
            </h2>
            <TournamentVerticalBracket 
              matches={mockMatches}
              maxParticipants={32}
              isAdmin={false}
              onJoinMatch={() => {}}
              onInviteOpponent={() => {}}
              inviteCooldowns={{}}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active Matches */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Partidas en Curso</h2>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-black/40 border border-casino-gold/30 rounded-xl p-4 hover:border-casino-gold transition-colors cursor-pointer group">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-casino-gold font-bold uppercase tracking-wider">Cuartos de Final</span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-white">
                    <span>Player{i}A</span>
                    <span className="text-gray-500">vs</span>
                    <span>Player{i}B</span>
                  </div>
                  <button className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    Observar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Prize Distribution */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Distribución de Premios</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-3 bg-casino-gold/10 rounded-xl border border-casino-gold/30">
                <span className="font-bold text-casino-gold">1er Lugar</span>
                <span className="font-black text-white">$500</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="font-bold text-gray-300">2do Lugar</span>
                <span className="font-black text-white">$250</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="font-bold text-gray-300">3er-4to Lugar</span>
                <span className="font-black text-white">$125</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="font-bold text-gray-400 text-xs">5to-8vo Lugar</span>
                <span className="font-black text-gray-300 text-xs">$62.5</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
