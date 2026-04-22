import React from 'react';
import { GameState } from '../../../domain/game-state';
import casinoBackground from '../../../Public/background.jpg';
import k21Logo from '../../../Public/brand21Icon.png';
import titleImage from '../../../Public/Reultados de la ronda.png';

/**
 * Props for the RoundSummaryScreen component.
 * @property gameState - The current game state (must be in 'scoring' phase).
 * @property onContinue - Callback to proceed to the next round.
 */
interface RoundSummaryScreenProps {
  gameState: GameState;
  onContinue: () => void;
}

/**
 * Determines whether to display players or teams based on the game mode.
 * In 1v1 mode, individual players are shown; in 2v2, teams are shown.
 */
const getEntities = (gameState: GameState) =>
  gameState.mode === '1v1' ? gameState.players : gameState.teams;

/**
 * ScoreRow — Reusable row for each scoring category in the breakdown card.
 * Keeps markup DRY and ensures consistent mobile-first spacing.
 */
function ScoreRow({
  icon,
  label,
  value,
  iconClass = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconClass?: string;
}) {
  return (
    <li className="flex justify-between items-center group/item min-h-[28px]">
      <span className="flex items-center gap-1.5 sm:gap-2 md:gap-3 truncate mr-2">
        <span
          className={`text-base sm:text-lg md:text-2xl shrink-0 group-hover/item:animate-bounce transition-all duration-300 ${iconClass}`}
        >
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </span>
      <span className="text-white font-mono bg-white/5 px-1.5 py-0.5 rounded text-[11px] sm:text-xs md:text-sm shrink-0">
        +{value}
      </span>
    </li>
  );
}

/**
 * RoundSummaryScreen
 *
 * Full-screen overlay shown at the end of each round ('scoring' phase).
 * Built **mobile-first**: compact spacing, small fonts, and single-column
 * layout by default — then scales up for tablets and desktops.
 *
 * Layout strategy:
 *  - `fixed inset-0` with `overflow-y-auto` so everything scrolls naturally.
 *  - Safe-area padding via `env()` for devices with notches.
 *  - Content capped at `max-w-4xl` and centered horizontally.
 */
export function RoundSummaryScreen({ gameState, onContinue }: RoundSummaryScreenProps) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden"
      style={{
        backgroundImage: `url(${casinoBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay with subtle blur */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-none" />

      {/* Scrollable content — safe-area aware */}
      <div
        className="relative z-10 flex flex-col items-center w-full min-h-full px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-10"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
        }}
      >
        {/* Main glassmorphic card */}
        <div className="relative w-full max-w-4xl bg-[#08111e]/90 border border-yellow-500/40 rounded-2xl sm:rounded-[1.5rem] md:rounded-[2rem] p-3 sm:p-5 md:p-8 lg:p-10 shadow-[0_0_40px_rgba(234,179,8,0.12)] sm:shadow-[0_0_60px_rgba(234,179,8,0.15)] backdrop-blur-xl">
          {/* Inner golden border effect (decorative) */}
          <div className="absolute inset-1.5 sm:inset-2 border border-yellow-600/20 sm:border-2 rounded-xl sm:rounded-[1.25rem] md:rounded-[1.5rem] pointer-events-none" />

          {/* ---- Branding ---- */}
          <div className="flex flex-col items-center mb-3 sm:mb-4 md:mb-6">
            <img
              src={k21Logo}
              alt="K21 Logo"
              className="h-12 sm:h-16 md:h-24 lg:h-28 w-auto mb-1 sm:mb-2 object-contain drop-shadow-[0_0_12px_rgba(251,191,36,0.4)] animate-[pulse_3s_ease-in-out_infinite]"
            />
            <img
              src={titleImage}
              alt="Resumen de la Ronda"
              className="h-4 sm:h-6 md:h-8 lg:h-10 w-auto object-contain drop-shadow-xl"
            />
          </div>

          {/* ---- Progress Bars ---- */}
          <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:gap-6 w-full mb-3 sm:mb-5 md:mb-8">
            {getEntities(gameState).map((entity) => {
              const progress = Math.min((entity.score / 21) * 100, 100);
              return (
                <div
                  key={entity.id}
                  className="flex-1 bg-black/40 border border-yellow-600/30 p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl shadow-inner"
                >
                  <div className="flex justify-between text-[11px] sm:text-xs md:text-sm mb-1.5 sm:mb-2 font-bold text-white items-center">
                    <span className="text-gray-200 truncate mr-2">
                      {(entity as any).name || `Equipo ${entity.id}`}
                    </span>
                    <span className="text-yellow-400 font-mono tracking-wider shrink-0">
                      {entity.score}
                      <span className="text-gray-500 text-[9px] sm:text-[10px] md:text-xs ml-0.5">
                        / 21
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-[#111A28] rounded-full h-1.5 sm:h-2 md:h-3 overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] border border-white/5">
                    <div
                      className="bg-gradient-to-r from-green-600 to-green-400 h-full transition-all duration-1000 ease-in-out"
                      style={{
                        width: `${progress}%`,
                        boxShadow: '0 0 8px rgba(74,222,128,0.5)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---- Score Breakdown Cards ---- */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 w-full mb-4 sm:mb-6 md:mb-8">
            {gameState.lastScoreBreakdown?.map((b) => {
              const entity =
                gameState.players.find((p) => p.id === b.id) ||
                gameState.teams.find((t) => t.id === b.id);
              return (
                <div
                  key={b.id}
                  className="bg-[#0b1525]/80 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl border border-yellow-600/30 text-left group hover:border-yellow-500/50 transition-colors duration-300"
                >
                  {/* Entity name header */}
                  <h3 className="text-sm sm:text-base md:text-xl font-bold mb-2 sm:mb-3 md:mb-4 text-center text-white border-b border-yellow-600/20 pb-1.5 sm:pb-2 md:pb-3 tracking-wide">
                    {(entity as any)?.name || (entity ? `Equipo ${entity.id}` : b.id)}
                  </h3>

                  <ul className="space-y-1.5 sm:space-y-2 md:space-y-3 text-[11px] sm:text-xs md:text-sm text-gray-300">
                    <ScoreRow
                      icon="👑"
                      label="Mayoría de Cartas:"
                      value={b.points.cards}
                      iconClass="drop-shadow-[0_0_5px_rgba(251,191,36,0.8)] text-yellow-500"
                    />
                    <ScoreRow
                      icon="♠️"
                      label="Mayoría de Picas:"
                      value={b.points.spades}
                      iconClass="text-gray-300 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]"
                    />
                    <ScoreRow
                      icon="♦️"
                      label="10 de Diamantes:"
                      value={b.points.tenOfDiamonds}
                      iconClass="text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]"
                    />

                    {/* 2 de Picas — custom badge icon */}
                    <li className="flex justify-between items-center group/item min-h-[28px]">
                      <span className="flex items-center gap-1.5 sm:gap-2 md:gap-3 truncate mr-2">
                        <span className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center bg-gray-300 text-black font-black rounded-full text-[8px] sm:text-[10px] md:text-xs shrink-0 group-hover/item:scale-110 group-hover/item:rotate-12 transition-all duration-300 shadow-[0_0_6px_rgba(255,255,255,0.4)]">
                          2
                        </span>
                        <span className="truncate">2 de Picas:</span>
                      </span>
                      <span className="text-white font-mono bg-white/5 px-1.5 py-0.5 rounded text-[11px] sm:text-xs md:text-sm shrink-0">
                        +{b.points.twoOfSpades}
                      </span>
                    </li>

                    {/* Ases — custom badge icon */}
                    <li className="flex justify-between items-center group/item min-h-[28px]">
                      <span className="flex items-center gap-1.5 sm:gap-2 md:gap-3 truncate mr-2">
                        <span className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center border border-yellow-400 text-yellow-400 font-serif font-black rounded-full text-[8px] sm:text-[10px] md:text-xs shrink-0 group-hover/item:scale-110 group-hover/item:-rotate-12 transition-all duration-300 shadow-[0_0_5px_rgba(251,191,36,0.4)]">
                          A
                        </span>
                        <span className="truncate">Ases:</span>
                      </span>
                      <span className="text-white font-mono bg-white/5 px-1.5 py-0.5 rounded text-[11px] sm:text-xs md:text-sm shrink-0">
                        +{b.points.aces}
                      </span>
                    </li>

                    <ScoreRow
                      icon="🔄"
                      label="Virados:"
                      value={b.points.virados}
                      iconClass="text-yellow-200"
                    />

                    {/* Total de la Ronda */}
                    <li className="flex justify-between items-center font-bold text-yellow-400 pt-2 sm:pt-3 md:pt-4 mt-2 sm:mt-3 md:mt-4 border-t border-yellow-600/20 text-xs sm:text-sm md:text-lg">
                      <span className="tracking-wider sm:tracking-widest uppercase">
                        Total Ronda:
                      </span>
                      <span className="text-base sm:text-xl md:text-2xl drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">
                        +{b.points.total}
                      </span>
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>

          {/* ---- Continue Button ---- */}
          <div className="flex justify-center pt-1 sm:pt-2">
            <button
              onClick={onContinue}
              className="relative overflow-hidden group bg-transparent border border-yellow-500/50 hover:border-yellow-400 active:border-yellow-300 text-yellow-400 hover:text-yellow-300 px-5 py-2 sm:px-7 sm:py-2.5 md:px-12 md:py-3.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-lg tracking-[0.12em] sm:tracking-[0.15em] uppercase transition-all duration-300 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] active:scale-95 hover:-translate-y-0.5 touch-manipulation"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/0 via-yellow-500/10 to-yellow-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              Siguiente Ronda
              {/* Decorative diamond accents */}
              <span className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 bg-yellow-400 rotate-45 -left-0.5 sm:-left-1 top-1/2 -translate-y-1/2" />
              <span className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 bg-yellow-400 rotate-45 -right-0.5 sm:-right-1 top-1/2 -translate-y-1/2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
