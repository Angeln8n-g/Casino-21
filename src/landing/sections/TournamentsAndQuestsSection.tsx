import React, { memo } from 'react';
import type { TournamentEvent } from '../hooks/useLandingData';
import { Trophy, Calendar, Users, Coins, Sparkles, Target, Award, ShoppingBag, ArrowRight, Building2 } from 'lucide-react';

interface Props {
  events: TournamentEvent[];
  onOpenSponsorModal?: () => void;
}

function TournamentsAndQuestsSection({ events, onOpenSponsorModal }: Props) {
  return (
    <section id="torneos" className="py-24 px-4 sm:px-6 lg:px-8 relative bg-[#040712] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Section Heading (No eyebrow per craft-floor) */}
        <div className="text-left max-w-3xl">
          <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-tight">
            Torneos competitivos 2.0
          </h2>
          <p className="mt-3 text-base sm:text-lg text-gray-300 font-['Chakra_Petch'] leading-relaxed">
            Compite en llaves eliminatorias en vivo por trofeos de perfil, pozos dinámicos de monedas virtuales y experiencia de temporada.
          </p>
        </div>

        {/* Live Tournaments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const isSitAndGo = event.tournament_format === 'sit_and_go';
            const prizeCoins = event.current_prize_coins || event.guaranteed_prize_coins || 1000;

            return (
              <div
                key={event.id}
                className="rounded-3xl bg-[#081020] border border-white/10 hover:border-amber-400/40 p-6 sm:p-7 shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider ${
                        isSitAndGo
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {isSitAndGo ? 'Sit & Go Instantáneo' : 'Torneo Programado'}
                    </span>

                    <span className="flex items-center gap-1.5 text-xs font-['Chakra_Petch'] font-bold text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Inscripciones Abiertas
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black font-['Russo_One'] text-white">
                      {event.title}
                    </h3>
                    <p className="text-xs text-gray-300 font-['Chakra_Petch'] mt-1.5 line-clamp-2 leading-relaxed">
                      {event.description || 'Eliminación directa. El primero a 21 avanza a la siguiente ronda.'}
                    </p>
                  </div>

                  {/* Tournament Meta Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-2 font-['Chakra_Petch'] text-xs">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                      <div className="text-gray-400 flex items-center gap-1">
                        <Coins size={13} className="text-amber-400" /> Pozo de Monedas
                      </div>
                      <div className="font-['Russo_One'] text-base text-amber-400 mt-0.5">
                        {prizeCoins.toLocaleString()} <span className="text-xs font-sans text-gray-400">coins</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                      <div className="text-gray-400 flex items-center gap-1">
                        <Users size={13} className="text-cyan-400" /> Cupos
                      </div>
                      <div className="font-['Russo_One'] text-base text-white mt-0.5">
                        {event.participants_count} / {event.max_participants}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs font-['Chakra_Petch'] text-gray-400">
                    +{event.reward_xp_winner || 250} XP al Campeón
                  </span>

                  <a
                    href="/login"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-[#050811] font-['Russo_One'] text-xs font-black tracking-wide shadow-sm hover:scale-105 active:scale-95 transition-all"
                  >
                    <span>INSCRIBIRSE</span>
                    <ArrowRight size={13} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Free Progression Loop: Quests, XP & Store */}
        <div className="pt-10 border-t border-white/[0.06]">
          <div className="text-left max-w-3xl mb-8">
            <h3 className="text-2xl sm:text-3xl font-black font-['Russo_One'] text-white">
              Bucle de progresión y recompensas
            </h3>
            <p className="mt-2 text-sm text-gray-300 font-['Chakra_Petch']">
              Todo en KASINO21 se gana jugando. Sin compras que otorguen ventajas competitivas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[#081020] border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Target size={20} />
              </div>
              <h4 className="text-lg font-black font-['Russo_One'] text-white">
                Misiones Diarias
              </h4>
              <p className="text-xs text-gray-300 font-['Chakra_Petch'] leading-relaxed">
                Nuevos objetivos cada 24 horas: ejecuta virados decisivos, gana con mayoría de picas y suma monedas y experiencia gratis para tu cuenta.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#081020] border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                <Award size={20} />
              </div>
              <h4 className="text-lg font-black font-['Russo_One'] text-white">
                Niveles y Trofeos
              </h4>
              <p className="text-xs text-gray-300 font-['Chakra_Petch'] leading-relaxed">
                Cada partida disputada te otorga XP. Sube tu nivel de perfil, exhibe tus insignias de torneo y desbloquea títulos honoríficos en tu tarjeta de duelista.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#081020] border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <ShoppingBag size={20} />
              </div>
              <h4 className="text-lg font-black font-['Russo_One'] text-white">
                Tienda de Cosméticos
              </h4>
              <p className="text-xs text-gray-300 font-['Chakra_Petch'] leading-relaxed">
                Canjea tus monedas virtuales ganadas en victorias por dorsos de cartas exclusivos, tapetes temáticos de mesa y emotes animados para el chat en vivo.
              </p>
            </div>
          </div>
        </div>

        {/* Discreet Corporate Tournament Sponsor Link (Question A3) */}
        {onOpenSponsorModal && (
          <div className="pt-6 text-center">
            <button
              type="button"
              onClick={onOpenSponsorModal}
              className="inline-flex items-center gap-2 text-xs font-['Chakra_Petch'] font-bold text-gray-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg px-3 py-1.5 cursor-pointer"
            >
              <Building2 size={14} />
              <span>¿Representas una marca o comunidad? Patrocina un torneo oficial de KASINO21 →</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(TournamentsAndQuestsSection);
