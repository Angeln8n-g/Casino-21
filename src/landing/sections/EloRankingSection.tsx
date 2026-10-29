import React, { memo } from 'react';
import { ELO_DIVISIONS_DATA } from '../data/arenaCatalog';
import type { LeaderboardEntry } from '../hooks/useLandingData';
import { Trophy, Shield, Flame, Play } from 'lucide-react';

interface Props {
  leaderboard: LeaderboardEntry[];
  loading?: boolean;
}

function getDivision(elo: number) {
  if (elo >= 2400) return ELO_DIVISIONS_DATA[5];
  if (elo >= 2100) return ELO_DIVISIONS_DATA[4];
  if (elo >= 1800) return ELO_DIVISIONS_DATA[3];
  if (elo >= 1500) return ELO_DIVISIONS_DATA[2];
  if (elo >= 1200) return ELO_DIVISIONS_DATA[1];
  return ELO_DIVISIONS_DATA[0];
}

function EloRankingSection({ leaderboard, loading }: Props) {
  return (
    <section id="ranking" className="py-24 px-4 sm:px-6 lg:px-8 relative bg-[#040712] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading (No eyebrow per craft-floor) */}
        <div className="text-left max-w-3xl mb-12">
          <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-tight">
            Escalera competitiva ELO
          </h2>
          <p className="mt-3 text-base sm:text-lg text-gray-300 font-['Chakra_Petch'] leading-relaxed">
            Tu habilidad matemática y lectura del rival determinan tu rango. Avanza a través de 6 divisiones oficiales y compite contra los mejores duelistas de la temporada.
          </p>
        </div>

        {/* Divisions Progression Horizontal Track */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-14">
          {ELO_DIVISIONS_DATA.map((division) => (
            <div
              key={division.name}
              className={`p-4 rounded-2xl bg-[#081020] border ${division.border} shadow-md flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-['Russo_One'] text-base text-white">{division.name}</span>
                  <Shield size={16} style={{ color: division.color }} />
                </div>
                <div className="text-xs font-mono font-bold text-gray-400 mb-2">
                  {division.minElo}+ ELO
                </div>
                <p className="text-[11px] font-['Chakra_Petch'] text-gray-300 leading-snug">
                  {division.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Leaderboard Table */}
        <div className="rounded-3xl bg-[#081020] border border-white/10 p-6 sm:p-8 shadow-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08] mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-black font-['Russo_One'] text-white flex items-center gap-2.5">
                <Trophy size={22} className="text-amber-400" />
                <span>Top Duelistas de la Temporada</span>
              </h3>
              <p className="text-xs sm:text-sm font-['Chakra_Petch'] text-gray-400 mt-1">
                Clasificación global en vivo sincronizada con la base de datos de KASINO21.
              </p>
            </div>

            <a
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-[#050811] font-['Russo_One'] text-xs sm:text-sm font-black tracking-wide shadow-md active:scale-95 transition-all"
            >
              <Play size={14} className="fill-current" /> DISPUTAR UN LUGAR
            </a>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-['Chakra_Petch']">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th scope="col" className="py-3 px-3">Posición</th>
                  <th scope="col" className="py-3 px-3">Duelista</th>
                  <th scope="col" className="py-3 px-3">División</th>
                  <th scope="col" className="py-3 px-3 text-center">Nivel</th>
                  <th scope="col" className="py-3 px-3 text-center">Victorias</th>
                  <th scope="col" className="py-3 px-3 text-right">Puntuación ELO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs sm:text-sm">
                {leaderboard.slice(0, 10).map((player, idx) => {
                  const div = getDivision(player.elo);
                  const isTop3 = idx < 3;
                  const totalGames = player.wins + player.losses;
                  const winrate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;

                  return (
                    <tr
                      key={`${player.username}-${idx}`}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Rank Index */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {idx === 0 ? (
                            <span className="w-7 h-7 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-['Russo_One'] font-black flex items-center justify-center text-xs shadow-sm">
                              1
                            </span>
                          ) : idx === 1 ? (
                            <span className="w-7 h-7 rounded-lg bg-gray-400/20 border border-gray-400/40 text-gray-300 font-['Russo_One'] font-black flex items-center justify-center text-xs shadow-sm">
                              2
                            </span>
                          ) : idx === 2 ? (
                            <span className="w-7 h-7 rounded-lg bg-amber-700/20 border border-amber-700/40 text-amber-500 font-['Russo_One'] font-black flex items-center justify-center text-xs shadow-sm">
                              3
                            </span>
                          ) : (
                            <span className="w-7 h-7 rounded-lg bg-white/[0.03] text-gray-400 font-['Chakra_Petch'] font-bold flex items-center justify-center text-xs">
                              {idx + 1}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Duelist Avatar & Username */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0d1b33] border border-white/10 flex items-center justify-center font-['Russo_One'] text-amber-400 text-xs overflow-hidden flex-shrink-0">
                            {player.avatar_url ? (
                              <img
                                src={player.avatar_url}
                                alt={player.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Safe fallback to initials if avatar URL 400s
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>{player.username.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>@{player.username}</span>
                              {isTop3 && <Flame size={14} className="text-amber-400" />}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {totalGames > 0 ? `${winrate}% Winrate (${player.wins}W / ${player.losses}L)` : 'En ascenso'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Division Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${div.badge}`}>
                          {div.name}
                        </span>
                      </td>

                      {/* Level */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-center font-bold text-gray-300">
                        Nv. {player.level}
                      </td>

                      {/* Wins */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-center font-bold text-emerald-400">
                        {player.wins}W
                      </td>

                      {/* ELO */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-right">
                        <span className="font-['Russo_One'] text-sm sm:text-base text-amber-400 tabular-nums">
                          {player.elo.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 font-sans ml-1">pts</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(EloRankingSection);
