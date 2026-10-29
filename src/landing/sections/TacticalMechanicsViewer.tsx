import React, { useState, memo } from 'react';
import { TACTICAL_SCENES, OFFICIAL_SCORING_RULES } from '../data/arenaCatalog';
import LandingCard from '../components/LandingCard';
import { Layers, Spade, Gem, Sparkles, Crown, Zap, BookOpen, CheckCircle, ArrowRight } from 'lucide-react';

const RULE_ICONS: Record<string, React.ReactNode> = {
  Layers: <Layers size={16} className="text-amber-400" />,
  Spade: <Spade size={16} className="text-cyan-400" />,
  Gem: <Gem size={16} className="text-rose-400" />,
  Sparkle: <Sparkles size={16} className="text-yellow-400" />,
  Crown: <Crown size={16} className="text-amber-300" />,
  Zap: <Zap size={16} className="text-emerald-400" />,
};

function TacticalMechanicsViewer() {
  const [activeTabId, setActiveTabId] = useState<string>(TACTICAL_SCENES[0].id);

  const activeScene =
    TACTICAL_SCENES.find((scene) => scene.id === activeTabId) || TACTICAL_SCENES[0];

  return (
    <section id="mecanicas" className="py-24 px-4 sm:px-6 lg:px-8 relative bg-[#040712] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading (No kicker/eyebrow per craft-floor) */}
        <div className="text-left max-w-3xl mb-12">
          <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-tight">
            Mecánicas tácticas de KASINO21
          </h2>
          <p className="mt-3 text-base sm:text-lg text-gray-300 font-['Chakra_Petch'] leading-relaxed">
            A diferencia de los juegos de azar, en KASINO21 la victoria se decide por cálculo matemático, lectura de mano rival y control del mazo. Selecciona una jugada para verla en la mesa.
          </p>
        </div>

        {/* Tab Controls Bar */}
        <div
          role="tablist"
          aria-label="Selector de mecánicas de juego"
          className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-thin scrollbar-thumb-amber-500/20"
        >
          {TACTICAL_SCENES.map((scene) => {
            const isSelected = scene.id === activeTabId;
            return (
              <button
                key={scene.id}
                role="tab"
                id={`tab-${scene.id}`}
                aria-selected={isSelected}
                aria-controls={`panel-${scene.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveTabId(scene.id)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isSelected
                    ? 'bg-amber-400 text-[#050811] shadow-[0_2px_15px_rgba(251,191,36,0.35)]'
                    : 'bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                }`}
              >
                {scene.title}
              </button>
            );
          })}
        </div>

        {/* Main Grid: Interactive Table Viewer + Scoring Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Tab Panel with Simulated Table */}
          <div
            role="tabpanel"
            id={`panel-${activeScene.id}`}
            aria-labelledby={`tab-${activeScene.id}`}
            className="lg:col-span-7 bg-[#081020] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="mb-6">
              <h3 className="text-xl sm:text-2xl font-black font-['Russo_One'] text-white">
                {activeScene.title}
              </h3>
              <p className="text-sm font-['Chakra_Petch'] text-amber-400 font-semibold mt-0.5">
                {activeScene.subtitle}
              </p>
              <p className="text-sm text-gray-300 font-['Chakra_Petch'] mt-2.5 leading-relaxed">
                {activeScene.summary}
              </p>
            </div>

            {/* Virtual Felt Table */}
            <div
              className="rounded-2xl p-5 sm:p-6 border border-cyan-500/20 shadow-inner relative overflow-hidden"
              style={{
                background:
                  'radial-gradient(circle at 50% 35%, #0d2847 0%, #06172a 70%, #030c17 100%)',
              }}
            >
              {/* Board Cards */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs font-['Chakra_Petch'] font-bold text-cyan-300 mb-2.5">
                  <span>Cartas en Mesa (Tablero Activo)</span>
                  <span className="text-gray-400 font-mono text-[11px]">Turno en curso</span>
                </div>
                <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap min-h-[120px]">
                  {activeScene.boardCards.map((card, idx) => (
                    <LandingCard
                      key={`board-${idx}`}
                      value={card.value}
                      suit={card.suit}
                      annotation={card.annotation}
                      isKey={card.isKey}
                      size="md"
                    />
                  ))}
                </div>
              </div>

              {/* Action Ribbon */}
              <div className="py-2.5 px-4 rounded-xl bg-black/60 border border-amber-400/40 text-center font-['Chakra_Petch'] text-xs sm:text-sm font-bold text-amber-300 shadow-md mb-6">
                <span className="text-white font-mono mr-1.5 font-bold">Acción:</span>
                {activeScene.actionLabel}
              </div>

              {/* Hand Cards */}
              <div>
                <div className="text-xs font-['Chakra_Petch'] font-bold text-gray-300 mb-2.5">
                  Tu Mano de 4 Cartas
                </div>
                <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                  {activeScene.handCards.map((card, idx) => (
                    <LandingCard
                      key={`hand-${idx}`}
                      value={card.value}
                      suit={card.suit}
                      annotation={card.annotation}
                      isKey={card.isKey}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Outcome & Tactical Pro-Tip */}
            <div className="mt-6 pt-5 border-t border-white/[0.08] space-y-3 font-['Chakra_Petch'] text-xs sm:text-sm">
              <div className="flex items-start gap-2.5 text-emerald-400">
                <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span className="text-gray-200">
                  <strong className="text-emerald-400 font-bold font-sans">Resultado: </strong>
                  {activeScene.actionOutcome}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-amber-400">
                <Sparkles size={16} className="flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">
                  <strong className="text-amber-400 font-bold font-sans">Consejo Competitivo: </strong>
                  {activeScene.tacticalTip}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Official Scoring Guide & Rulebook Link */}
          <div className="lg:col-span-5 bg-[#081020] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg sm:text-xl font-black font-['Russo_One'] text-white">
                Sistema Oficial de Puntuación
              </h3>
              <p className="text-xs sm:text-sm font-['Chakra_Petch'] text-gray-300 mt-1">
                La ronda termina al agotarse la baraja. Estos son los puntos que otorgan la victoria:
              </p>
            </div>

            <div className="space-y-3 font-['Chakra_Petch']">
              {OFFICIAL_SCORING_RULES.map((rule) => (
                <div
                  key={rule.item}
                  className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-400/30 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-black/40 border border-white/10 flex-shrink-0">
                      {RULE_ICONS[rule.icon]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-white truncate">
                        {rule.item}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">{rule.note}</div>
                    </div>
                  </div>

                  <span className="text-xs sm:text-sm font-black font-['Russo_One'] text-amber-400 flex-shrink-0">
                    {rule.points}
                  </span>
                </div>
              ))}
            </div>

            {/* Link to Full Official Rules Page */}
            <div className="pt-2">
              <a
                href="/como-jugar"
                className="w-full inline-flex items-center justify-center gap-2 p-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white font-['Chakra_Petch'] font-bold text-xs sm:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <BookOpen size={16} />
                <span>Leer Reglamento Completo y Estrategia</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(TacticalMechanicsViewer);
