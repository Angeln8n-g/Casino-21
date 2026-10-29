import React, { memo } from 'react';
import { Swords, Users, Trophy, KeyRound, Bot, Play, Zap, ArrowRight } from 'lucide-react';

function GameModesArena() {
  return (
    <section id="modos" className="py-24 px-4 sm:px-6 lg:px-8 relative bg-[#050811]">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading (No eyebrow per craft-floor) */}
        <div className="text-left max-w-3xl mb-12">
          <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-tight">
            Modalidades competitivas
          </h2>
          <p className="mt-3 text-base sm:text-lg text-gray-300 font-['Chakra_Petch'] leading-relaxed">
            Desde duelos individuales de alta tensión clasificatoria hasta partidas cooperativas por equipos y torneos de eliminación directa.
          </p>
        </div>

        {/* Asymmetric Bento-Arena Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
          {/* Card 1: 1v1 Ranked (Hero Primary Card - Spans 7 cols) */}
          <div className="lg:col-span-7 rounded-3xl bg-gradient-to-br from-[#0c1830] via-[#091222] to-[#060b16] border border-amber-400/40 p-7 sm:p-9 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none select-none">
              <Swords size={220} className="text-amber-400" />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider">
                <Zap size={13} /> Modo Insignia
              </div>

              <h3 className="text-2xl sm:text-4xl font-black font-['Russo_One'] text-white">
                Duelo 1v1 Ranked
              </h3>

              <p className="text-sm sm:text-base text-gray-300 font-['Chakra_Petch'] max-w-xl leading-relaxed">
                El formato competitivo puro de KASINO21. Sistema de emparejamiento por ELO (±50 puntos), 30 segundos por turno y carrera a 21 puntos. Cada carta jugada es pública en el pozo; la memoria y el conteo determinan al vencedor.
              </p>

              <div className="grid grid-cols-3 gap-3 pt-2 font-['Chakra_Petch'] text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                  <div className="text-gray-400">Jugadores</div>
                  <div className="text-white font-bold text-sm">1 vs 1</div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                  <div className="text-gray-400">Meta</div>
                  <div className="text-amber-400 font-bold text-sm">21 Puntos</div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                  <div className="text-gray-400">Clasificación</div>
                  <div className="text-cyan-400 font-bold text-sm">Puntos ELO</div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-6 mt-6 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-['Chakra_Petch'] text-gray-400">
                Gana puntos para subir de Bronce a Leyenda
              </span>
              <a
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-[#050811] font-['Russo_One'] text-xs sm:text-sm font-black tracking-wide shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                <Play size={14} className="fill-current" /> JUGAR 1V1
              </a>
            </div>
          </div>

          {/* Card 2: 2v2 Equipos Tácticos (Spans 5 cols) */}
          <div className="lg:col-span-5 rounded-3xl bg-[#091122] border border-white/10 p-7 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Users size={24} />
              </div>

              <h3 className="text-xl sm:text-2xl font-black font-['Russo_One'] text-white">
                Equipos 2v2 Tácticos
              </h3>

              <p className="text-xs sm:text-sm text-gray-300 font-['Chakra_Petch'] leading-relaxed">
                Cuatro jugadores en mesa divididos en dos bandos con marcador conjunto a 21. Coordina cantos de As, deja sumatorias preparadas para tu aliado y bloquea las intenciones del equipo rival.
              </p>

              <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] font-['Chakra_Petch'] text-xs space-y-1">
                <div className="text-cyan-300 font-bold">Estrategia en Pareja:</div>
                <div className="text-gray-400">Puntaje compartido · Turnos alternados de 4 jugadores.</div>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-white/[0.06]">
              <a
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 font-['Chakra_Petch'] transition-colors"
              >
                <span>Probar partidas por equipos</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* Card 3: Torneos Eliminatorios 2.0 (Spans 4 cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-[#091122] border border-white/10 p-6 sm:p-7 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
                <Trophy size={20} />
              </div>
              <h3 className="text-lg sm:text-xl font-black font-['Russo_One'] text-white">
                Torneos Sit & Go y Programados
              </h3>
              <p className="text-xs text-gray-300 font-['Chakra_Petch'] leading-relaxed">
                Llaves de eliminación directa de 4 a 32 duelistas. Sit & Go arrancan en cuanto se completan los cupos; los torneos programados ofrecen check-in previo y pozos garantizados de monedas y XP.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/[0.06] text-xs font-['Chakra_Petch'] text-amber-400 font-bold">
              Premios escalonados para el Podio
            </div>
          </div>

          {/* Card 4: Salas Privadas y Retos (Spans 4 cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-[#091122] border border-white/10 p-6 sm:p-7 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <KeyRound size={20} />
              </div>
              <h3 className="text-lg sm:text-xl font-black font-['Russo_One'] text-white">
                Salas Privadas y Retos
              </h3>
              <p className="text-xs text-gray-300 font-['Chakra_Petch'] leading-relaxed">
                Crea una sala personalizada, compártela mediante código de acceso con tus amigos y pacta retos con monedas virtuales de KASINO21 en partidas casuales o competitivas.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/[0.06] text-xs font-['Chakra_Petch'] text-purple-300 font-bold">
              Enlace directo y código de 6 caracteres
            </div>
          </div>

          {/* Card 5: Entrenamiento vs Bot IA (Spans 4 cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-[#091122] border border-white/10 p-6 sm:p-7 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Bot size={20} />
              </div>
              <h3 className="text-lg sm:text-xl font-black font-['Russo_One'] text-white">
                Campo de Práctica vs IA
              </h3>
              <p className="text-xs text-gray-300 font-['Chakra_Petch'] leading-relaxed">
                Perfecciona tu velocidad de cálculo, ensaya sumatorias y domina la regla de cierre contra bots de inteligencia artificial con 4 niveles de dificultad sin riesgo de perder ELO.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/[0.06] text-xs font-['Chakra_Petch'] text-emerald-400 font-bold">
              Fácil · Medio · Difícil · Maestro
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(GameModesArena);
