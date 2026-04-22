import React from 'react';
import { GameState } from '../../../domain/game-state';
import { CelebrationConfetti } from '../CelebrationConfetti';

/**
 * Props for the MatchCompletedScreen component.
 * @property gameState - The final game state (phase === 'completed').
 * @property showCelebration - Whether to render the confetti animation.
 * @property celebrationSeed - Random seed for the confetti pattern.
 */
interface MatchCompletedScreenProps {
  gameState: GameState;
  showCelebration: boolean;
  celebrationSeed: number;
}

/**
 * Navigates the player back to the main menu by clearing the stored room
 * ID and reloading the page.
 */
const handleBackToMenu = () => {
  localStorage.removeItem('casino21_roomId');
  window.location.reload();
};

/**
 * MatchCompletedScreen
 *
 * Rendered when the game phase is 'completed'. Shows:
 *  - Victory/defeat confetti animation
 *  - Winner announcement (or tie message)
 *  - Per-player stats: score, collected cards, virados, ELO change
 *  - "Volver al Menú Principal" button
 */
export function MatchCompletedScreen({
  gameState,
  showCelebration,
  celebrationSeed,
}: MatchCompletedScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 sm:p-8 bg-transparent relative z-10 overflow-y-auto">
      <CelebrationConfetti active={showCelebration} seed={celebrationSeed} />

      <div className="bg-black/60 backdrop-blur-md p-6 sm:p-10 rounded-3xl border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.2)] max-w-3xl w-full">
        <h1 className="text-4xl sm:text-6xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg">
          ¡PARTIDA TERMINADA!
        </h1>

        <h2 className="text-xl sm:text-3xl font-bold mb-6 sm:mb-10 text-white">
          {gameState.winnerId
            ? `Ganador: ${
                gameState.players.find((p) => p.id === gameState.winnerId)?.name ||
                gameState.winnerId
              }`
            : '¡EMPATE!'}
        </h2>

        {/* Player stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 w-full mb-6 sm:mb-10">
          {gameState.players.map((p) => (
            <div
              key={p.id}
              className={`p-4 sm:p-6 rounded-2xl border ${
                p.id === gameState.winnerId
                  ? 'bg-yellow-900/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <h3 className="text-xl sm:text-2xl font-bold mb-4 text-white flex items-center justify-center gap-2">
                {p.id === gameState.winnerId && (
                  <span className="text-yellow-400 text-3xl">👑</span>
                )}
                {p.name}
              </h3>

              <div className="space-y-3">
                {/* Score */}
                <div className="flex justify-between bg-black/30 p-3 rounded-lg">
                  <span className="text-gray-400 font-bold">Puntuación</span>
                  <span className="text-blue-400 font-black text-xl">{p.score} pts</span>
                </div>

                {/* Collected cards */}
                <div className="flex justify-between bg-black/30 p-3 rounded-lg">
                  <span className="text-gray-400 font-bold">Cartas Recogidas</span>
                  <span className="text-white font-bold">{p.collectedCards.length}</span>
                </div>

                {/* Virados */}
                <div className="flex justify-between bg-black/30 p-3 rounded-lg">
                  <span className="text-gray-400 font-bold">Virados</span>
                  <span className="text-yellow-400 font-bold">{p.virados}</span>
                </div>

                {/* ELO change indicator */}
                <div className="flex justify-between p-2 mt-4 border-t border-white/10">
                  <span className="text-gray-400 font-bold text-sm">Rango ELO</span>
                  <span
                    className={`font-black text-sm ${
                      p.id === gameState.winnerId
                        ? 'text-green-400'
                        : p.score ===
                          gameState.players.find((o) => o.id !== p.id)?.score
                        ? 'text-gray-400'
                        : 'text-red-400'
                    }`}
                  >
                    {p.id === gameState.winnerId
                      ? '+25 ▲'
                      : p.score ===
                        gameState.players.find((o) => o.id !== p.id)?.score
                      ? '+0 ▬'
                      : '-25 ▼'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Back-to-menu button */}
        <button
          onClick={handleBackToMenu}
          className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-black text-lg sm:text-xl transition transform hover:scale-105 shadow-xl w-full max-w-md"
        >
          VOLVER AL MENÚ PRINCIPAL
        </button>
      </div>
    </div>
  );
}
