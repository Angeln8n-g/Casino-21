import React, { useEffect } from 'react';
import { CelebrationConfetti } from '../CelebrationConfetti';

interface MatchAbandonedData {
  winnerId: string;
  coinsEarned: number;
  eloEarned: number;
}

interface MatchAbandonedScreenProps {
  data: MatchAbandonedData;
  localPlayerId: string | null;
  celebrationSeed: number;
}

const handleBackToMenu = () => {
  localStorage.removeItem('casino21_roomId');
  window.location.reload();
};

/**
 * MatchAbandonedScreen — shown when a player abandons the match.
 * Displays win/loss state and earned rewards for the remaining player.
 */
export function MatchAbandonedScreen({ data, localPlayerId, celebrationSeed }: MatchAbandonedScreenProps) {
  const isWinner = data.winnerId === localPlayerId;
  
  // Disparar eventos al montar el componente para refrescar estadísticas
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('profile_updated'));
    window.dispatchEvent(new CustomEvent('coins_updated'));
    window.dispatchEvent(new CustomEvent('elo_updated'));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 sm:p-8 bg-transparent relative z-10 overflow-y-auto">
      <CelebrationConfetti active={isWinner} seed={celebrationSeed} />
      <div className="bg-black/60 backdrop-blur-md p-6 sm:p-10 rounded-3xl border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.2)] max-w-3xl w-full">
        <h1 className="text-3xl sm:text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg uppercase">
          {isWinner ? '¡Tu oponente ha abandonado!' : '¡Alguien abandonó la partida!'}
        </h1>
        <h2 className="text-lg sm:text-2xl font-bold mb-8 text-white">
          {isWinner ? 'Has ganado la partida automáticamente.' : 'La partida ha concluido.'}
        </h2>
        {isWinner && (
          <div className="bg-gray-800/80 p-4 sm:p-6 rounded-2xl border border-gray-600 shadow-inner mb-8 text-left">
            <ul className="space-y-4 text-base sm:text-lg font-bold">
              <li className="flex justify-between items-center">
                <span className="text-gray-300">Monedas ganadas:</span>
                <span className="text-yellow-400 text-xl sm:text-2xl">+{data.coinsEarned}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-300">Puntos ELO:</span>
                <span className="text-green-400 text-xl sm:text-2xl">+{data.eloEarned} ▲</span>
              </li>
            </ul>
          </div>
        )}
        <button onClick={handleBackToMenu} className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-black text-lg sm:text-xl transition transform hover:scale-105 shadow-xl w-full max-w-md">
          VOLVER AL MENÚ PRINCIPAL
        </button>
      </div>
    </div>
  );
}
