import React, { memo } from 'react';
import { Play, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import LandingCard from '../components/LandingCard';

interface Props {
  onExploreMechanics?: () => void;
}

function ArenaHero({ onExploreMechanics }: Props) {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background radial lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/[0.07] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 translate-x-1/3 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/[0.06] rounded-full blur-[140px]" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-5xl h-32 bg-amber-400/[0.03] rounded-full blur-[90px]" />
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Left Column: Core Value Proposition & Primary Conversion */}
        <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-['Chakra_Petch'] font-bold text-gray-200">
            <span className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
            <span>Videojuego Competitivo Multijugador · 1v1 y 2v2</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-['Russo_One'] text-white leading-[1.05] tracking-tight">
            Domina la mesa. <br />
            Calcula el virado. <br />
            <span className="text-amber-400">Conquista el 21.</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-300 font-['Chakra_Petch'] leading-relaxed max-w-2xl">
            KASINO21 lleva la estrategia del 21 tradicional a los esports: memoria de mazo, sumatorias con riesgo de robo, cantos blindados de As y reloj de 30 segundos. Juega al instante en tu navegador o descarga la app Android oficial.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2 w-full sm:w-auto">
            <a
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-[#050811] font-['Russo_One'] font-black text-base tracking-wide shadow-[0_4px_25px_rgba(251,191,36,0.35)] hover:shadow-[0_6px_35px_rgba(251,191,36,0.5)] transition-all transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <Play size={18} className="fill-current" aria-hidden="true" />
              <span>JUGAR AHORA GRATIS</span>
            </a>

            <a
              href="#mecanicas"
              onClick={onExploreMechanics}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-['Chakra_Petch'] font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <span>Ver Cómo se Juega</span>
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>

          {/* Key Game Attributes Strip */}
          <div className="pt-4 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            <div>
              <div className="font-['Russo_One'] text-lg sm:text-xl text-white">52 Cartas</div>
              <div className="font-['Chakra_Petch'] text-xs text-gray-400">Baraja estándar</div>
            </div>
            <div>
              <div className="font-['Russo_One'] text-lg sm:text-xl text-amber-400">30 Segundos</div>
              <div className="font-['Chakra_Petch'] text-xs text-gray-400">Reloj por turno</div>
            </div>
            <div>
              <div className="font-['Russo_One'] text-lg sm:text-xl text-cyan-400">Sistema ELO</div>
              <div className="font-['Chakra_Petch'] text-xs text-gray-400">Matchmaking justo</div>
            </div>
            <div>
              <div className="font-['Russo_One'] text-lg sm:text-xl text-emerald-400">100% Gratis</div>
              <div className="font-['Chakra_Petch'] text-xs text-gray-400">Sin apuestas reales</div>
            </div>
          </div>
        </div>

        {/* Right Column: High-Stakes Duel Diorama */}
        <div className="lg:col-span-5 relative">
          <div className="relative rounded-3xl bg-[#091122]/90 border border-white/10 p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl overflow-hidden">
            {/* Top Stage Header: Duelists Rivalry Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
              {/* Player 1 */}
              <div className="flex items-center gap-2.5">
                <img
                  src="https://kasino21.com/storage/v1/object/public/store_assets/el_as_1785028294641.jpg"
                  alt="El AS Audax"
                  className="w-10 h-10 rounded-full border-2 border-amber-400 object-cover shadow-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div>
                  <div className="font-['Russo_One'] text-xs text-white">El AS (Tú)</div>
                  <div className="font-['Chakra_Petch'] text-[10px] text-amber-400 font-bold uppercase">
                    Diamante · 2,140 ELO
                  </div>
                </div>
              </div>

              {/* Match Score Indicator (Closing Zone Tension) */}
              <div className="text-center px-3 py-1 rounded-xl bg-black/60 border border-amber-500/30">
                <div className="font-['Russo_One'] text-sm text-amber-400 tracking-wider">
                  19 <span className="text-gray-500 font-sans">:</span> 18
                </div>
                <div className="font-['Chakra_Petch'] text-[9px] text-rose-400 font-bold uppercase">
                  Zona Cierre
                </div>
              </div>

              {/* Player 2 */}
              <div className="flex items-center gap-2.5 text-right">
                <div>
                  <div className="font-['Russo_One'] text-xs text-white">La Q (Rival)</div>
                  <div className="font-['Chakra_Petch'] text-[10px] text-cyan-400 font-bold uppercase">
                    Platino · 1,910 ELO
                  </div>
                </div>
                <img
                  src="https://kasino21.com/storage/v1/object/public/store_assets/la_q_1785112716923.webp"
                  alt="La Q Reyna"
                  className="w-10 h-10 rounded-full border-2 border-cyan-400 object-cover shadow-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>

            {/* Tactical Table Felt Center */}
            <div
              className="rounded-2xl p-4 sm:p-5 relative border border-cyan-500/20 shadow-inner mb-4 overflow-hidden"
              style={{
                background:
                  'radial-gradient(circle at 50% 40%, #0c2b4d 0%, #07192e 60%, #040c17 100%)',
              }}
            >
              <div className="flex items-center justify-between text-[11px] font-['Chakra_Petch'] text-cyan-300 font-bold mb-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" aria-hidden="true" />
                  Mesa de Duelo #429
                </span>
                <span className="text-amber-400">Turno 3 / Ronda Final</span>
              </div>

              {/* Board Cards on Table */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
                <LandingCard value="10" suit="diamonds" annotation="La Buena +2" isKey size="md" />
                <LandingCard value="2" suit="spades" annotation="La Chica +1" size="md" />
                <LandingCard value="A" suit="spades" annotation="Pica +1" size="md" />
              </div>

              {/* Virado Alert Banner */}
              <div className="mt-3 py-1.5 px-3 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-center font-['Russo_One'] text-xs sm:text-sm tracking-wide flex items-center justify-center gap-1.5">
                <Zap size={14} className="fill-current text-amber-400" /> ¡JUGADA DECISIVA: BARRIDA DE MESA!
              </div>
            </div>

            {/* Your Hand (Bottom Fan) */}
            <div className="pt-2">
              <div className="text-[11px] font-['Chakra_Petch'] text-gray-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Tu Mano (4 Cartas)</span>
                <span className="text-amber-400 font-mono">Tiempo: 18s</span>
              </div>

              <div className="flex items-center justify-center -space-x-4 sm:-space-x-5 hover:space-x-1 transition-all duration-300 py-1">
                <LandingCard value="10" suit="hearts" size="sm" className="-rotate-6" />
                <LandingCard value="7" suit="spades" size="sm" className="-rotate-2" />
                <LandingCard value="K" suit="clubs" size="sm" className="rotate-2" />
                <LandingCard value="A" suit="hearts" size="sm" className="rotate-6" isKey />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(ArenaHero);
