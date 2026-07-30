import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Sparkles, ChevronRight, Calculator, Crown, Medal, Award } from 'lucide-react';
import type { ChampionshipLeaderboardItem } from '../hooks/useChampionshipLanding';

interface Props {
  leaderboard: ChampionshipLeaderboardItem[];
  timeRemaining: { days: number; hours: number; minutes: number; seconds: number };
  onOpenTop100: () => void;
  calculateProjection: (adsPerDay: number) => { totalAds: number; estimatedPoints: number; estimatedRank: number; estimatedPayout: number };
}

export default function LegendLeaderboard({ leaderboard, timeRemaining, onOpenTop100, calculateProjection }: Props) {
  const [calcAdsPerDay, setCalcAdsPerDay] = useState(30);
  const projection = calculateProjection(calcAdsPerDay);

  return (
    <section id="leaderboard-section" className="py-16 px-4 sm:px-6 relative overflow-hidden bg-[#020617]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-yellow-500/[0.03] rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Encabezado del Bloque 2 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold px-3.5 py-1.5 rounded-full mb-3 font-['Chakra_Petch'] uppercase tracking-widest">
            <Trophy size={14} className="text-yellow-400" /> Clasificación Mensual Directa
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-wide uppercase flex items-center justify-center gap-3">
            LOS 10 QUE VAN A LA <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 neon-gold-strong">FINAL</span>
            <Trophy size={32} className="text-yellow-400 inline-block drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
          </h2>

          {/* SUBTÍTULO CON CONTADOR REGRESIVO */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm sm:text-lg font-bold font-['Chakra_Petch'] text-gray-300">
            <span className="flex items-center gap-1.5 text-yellow-400">
              <Clock size={18} className="animate-pulse" /> Corte de clasificación en:
            </span>
            <div className="flex items-center gap-1 bg-black/60 border border-yellow-500/40 px-3 py-1 rounded-xl text-yellow-400 font-mono font-black text-base shadow-inner">
              <span>{timeRemaining.days}d</span>
              <span>{String(timeRemaining.hours).padStart(2, '0')}h</span>
              <span>{String(timeRemaining.minutes).padStart(2, '0')}m</span>
              <span className="text-yellow-300">{String(timeRemaining.seconds).padStart(2, '0')}s</span>
            </div>
          </div>
        </div>

        {/* TABLERO DE LEYENDAS - TABLA DE TOP 10 CON BORDE DORADO Y FONDO NEGRO */}
        <div className="relative bg-black border-2 border-yellow-500/40 rounded-3xl p-4 sm:p-7 shadow-[0_0_50px_rgba(251,191,36,0.15)] overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-bl-full pointer-events-none" />

          {/* Contenedor con Scroll Horizontal en Móvil */}
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-yellow-500/20">
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-yellow-500/20 text-yellow-400/80 text-xs font-black uppercase font-['Chakra_Petch'] tracking-wider">
                  <th className="py-3 px-4 w-20">Puesto</th>
                  <th className="py-3 px-4">Jugador</th>
                  <th className="py-3 px-4 text-right">Puntos Acumulados</th>
                  <th className="py-3 px-4 text-right">Premio Proyectado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-['Chakra_Petch']">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400 font-['Chakra_Petch']">
                      Aún no hay participantes registrados en la tabla de clasificación. ¡Inicia sesión y sé el primero en sumar puntos!
                    </td>
                  </tr>
                ) : (
                  leaderboard.slice(0, 10).map((player) => {
                    const isTop3 = player.rank <= 3;
                    let rankBadge = null;
                    if (player.rank === 1) {
                      rankBadge = (
                        <div className="flex items-center gap-1">
                          <Crown size={20} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                          <Medal size={18} className="text-yellow-400" />
                        </div>
                      );
                    } else if (player.rank === 2) {
                      rankBadge = <Medal size={18} className="text-slate-300 drop-shadow-[0_0_6px_rgba(203,213,225,0.6)]" />;
                    } else if (player.rank === 3) {
                      rankBadge = <Medal size={18} className="text-amber-600 drop-shadow-[0_0_6px_rgba(217,119,6,0.6)]" />;
                    } else {
                      rankBadge = <span className="text-gray-400 font-black font-mono">#{player.rank}</span>;
                    }

                    return (
                      <tr
                        key={player.username}
                        className={`transition-all duration-500 ${
                          player.isJustUpdated
                            ? 'bg-yellow-500/20 border-l-4 border-yellow-400 scale-[1.01]'
                            : isTop3
                            ? 'bg-yellow-500/[0.04] hover:bg-yellow-500/[0.08]'
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        {/* Puesto */}
                        <td className="py-3.5 px-4 font-bold">
                          <div className="flex items-center gap-1.5">
                            {rankBadge}
                          </div>
                        </td>

                        {/* Jugador */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-black text-sm select-none shadow"
                              style={{ backgroundColor: player.avatarColor }}
                            >
                              {player.avatarLetter}
                            </div>
                            <div>
                              <span className={`font-bold text-sm sm:text-base ${isTop3 ? 'text-yellow-300 font-black' : 'text-white'}`}>
                                {player.username}
                              </span>
                              {player.rank === 1 && (
                                <span className="ml-2 text-[9px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-black uppercase">
                                  LÍDER ACUMULADO
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Puntos (con animación cada 10s) */}
                        <td className="py-3.5 px-4 text-right">
                          <span className={`font-mono font-black text-base sm:text-lg transition-colors ${player.isJustUpdated ? 'text-yellow-300 animate-pulse' : 'text-white'}`}>
                            {player.points.toLocaleString()} pts
                          </span>
                          {player.isJustUpdated && (
                            <span className="block text-[10px] text-yellow-400 font-bold animate-bounce">+15 pts</span>
                          )}
                        </td>

                        {/* Premio Proyectado ("Se llevaría $X") */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-1 rounded-xl text-sm sm:text-base font-black font-['Russo_One'] shadow">
                            <span>Se llevaría ${player.projectedPrize} USD</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* BOTÓN VER TOP 100 COMPLETO */}
          <div className="mt-6 text-center">
            <button
              onClick={onOpenTop100}
              className="inline-flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-gray-200 hover:text-white px-6 py-2.5 rounded-xl text-sm font-bold font-['Chakra_Petch'] transition-all duration-300 hover:border-yellow-500/40 cursor-pointer"
            >
              <Trophy size={16} className="text-yellow-400" />
              VER TOP 100 COMPLETO
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* CARD DESTACADA AMARILLA DEBAJO */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 rounded-3xl p-6 sm:p-8 text-black shadow-[0_0_40px_rgba(251,191,36,0.3)] flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-black/10 flex items-center justify-center flex-shrink-0">
              <Sparkles size={32} className="text-black" />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black font-['Russo_One'] uppercase leading-tight">
                ¿QUIERES SALIR AQUÍ?
              </h3>
              <p className="text-black/80 font-bold font-['Chakra_Petch'] text-sm sm:text-base mt-1">
                Ve 50 ads hoy y entra directo al Top 32 clasificados para la gran final
              </p>
            </div>
          </div>

          <a
            href="/login"
            className="bg-black hover:bg-slate-900 text-yellow-400 font-black text-base px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-transform duration-300 font-['Russo_One'] flex-shrink-0 text-center w-full sm:w-auto cursor-pointer"
          >
            EMPEZAR A SUMAR PUNTOS
          </a>
        </motion.div>

        {/* MEJORA 1: CALCULADORA DE GANANCIAS "SIMULA TU PREMIO" */}
        <div className="mt-12 bg-[#090e1d] border border-yellow-500/20 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <Calculator size={20} className="text-yellow-400" />
            </div>
            <div>
              <h4 className="text-lg font-black font-['Russo_One'] text-white">SIMULADOR DE LUGAR Y PREMIO</h4>
              <p className="text-xs text-gray-400 font-['Chakra_Petch']">Calcula tu posición estimada según los anuncios que decidas ver por día</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <label className="block text-sm font-bold text-gray-300 font-['Chakra_Petch'] mb-3">
                Ads que verás por día: <span className="text-yellow-400 font-black text-lg">{calcAdsPerDay} ads/día</span>
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={calcAdsPerDay}
                onChange={(e) => setCalcAdsPerDay(Number(e.target.value))}
                className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                <span>5 (Casual)</span>
                <span>50 (Competitivo)</span>
                <span>100 (Hardcore)</span>
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-wrap items-center justify-around gap-4 text-center">
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase font-['Chakra_Petch']">Puntos Estimados</div>
                <div className="text-xl font-black font-mono text-white mt-0.5">{projection.estimatedPoints.toLocaleString()} pts</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase font-['Chakra_Petch']">Puesto Proyectado</div>
                <div className="text-xl font-black font-mono text-yellow-400 mt-0.5">Top #{projection.estimatedRank}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase font-['Chakra_Petch']">Premio Estimado</div>
                <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">${projection.estimatedPayout} USD</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
