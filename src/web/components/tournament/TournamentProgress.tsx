import React from 'react';
import { TournamentMatch } from '../TournamentBracket';

interface TournamentProgressProps {
  maxParticipants: number;
  matches: TournamentMatch[];
  currentUserId?: string | null;
}

const ROUND_NAMES: Record<number, string> = {
  0: '16avos',
  1: 'Octavos',
  2: 'Cuartos',
  3: 'Semis',
  4: 'Final',
};

export function TournamentProgress({ maxParticipants, matches, currentUserId }: TournamentProgressProps) {
  // Determine rounds based on maxParticipants
  const getRoundsList = () => {
    if (maxParticipants === 8) return [2, 3, 4];
    if (maxParticipants === 32) return [0, 1, 2, 3, 4];
    return [1, 2, 3, 4]; // Default 16 players
  };

  const roundsList = getRoundsList();

  // Find user status in the tournament
  const getPlayerStatus = () => {
    if (!currentUserId || matches.length === 0) return { label: 'Espectador', style: 'border-slate-700/50 bg-slate-800/30 text-slate-400' };

    // Check if the user is in the tournament at all
    const userMatches = matches.filter(
      m => m.player1?.id === currentUserId || m.player2?.id === currentUserId
    );

    if (userMatches.length === 0) {
      return { label: 'Espectador', style: 'border-slate-700/50 bg-slate-800/30 text-slate-400' };
    }

    // Check if user won the final (Round 4)
    const finalMatch = matches.find(
      m => m.round === 4 && (m.player1?.id === currentUserId || m.player2?.id === currentUserId)
    );
    if (finalMatch && finalMatch.status === 'completed') {
      const isWinner =
        (finalMatch.player1?.id === currentUserId && finalMatch.player1.isWinner) ||
        (finalMatch.player2?.id === currentUserId && finalMatch.player2.isWinner);
      if (isWinner) {
        return { label: '🏆 ¡Campeón!', style: 'border-casino-gold bg-casino-gold/10 text-casino-gold shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-bounce font-black' };
      }
    }

    // Check for losses
    // Find the highest round the player played in and lost
    let eliminatedRound = -1;
    userMatches.forEach(m => {
      if (m.status === 'completed') {
        const isLoser =
          (m.player1?.id === currentUserId && !m.player1.isWinner) ||
          (m.player2?.id === currentUserId && !m.player2.isWinner);
        if (isLoser && m.round > eliminatedRound) {
          eliminatedRound = m.round;
        }
      }
    });

    if (eliminatedRound !== -1) {
      return {
        label: `Eliminado en ${ROUND_NAMES[eliminatedRound]}`,
        style: 'border-red-500/30 bg-red-500/10 text-red-400',
      };
    }

    return {
      label: '⚡ Aún en Competencia',
      style: 'border-casino-emerald bg-casino-emerald/10 text-casino-emerald shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse font-black',
    };
  };

  const status = getPlayerStatus();

  // Find the currently active round in the tournament (highest round where games are live/pending)
  const getActiveRound = () => {
    if (matches.length === 0) return roundsList[0];
    
    // Sort rounds, see which ones are not fully completed
    for (const r of roundsList) {
      const roundMatches = matches.filter(m => m.round === r);
      if (roundMatches.some(m => m.status !== 'completed')) {
        return r;
      }
    }
    return 4; // Final if everything completed
  };

  const activeRound = getActiveRound();

  return (
    <div className="glass-panel p-4 border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
      {/* Player Status Tag */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tu Estado:</span>
        <div className={`px-3.5 py-1.5 rounded-full border text-[10px] uppercase font-bold tracking-widest ${status.style}`}>
          {status.label}
        </div>
      </div>

      {/* Stepper Timeline */}
      <div className="flex items-center gap-1 w-full max-w-md justify-end">
        {roundsList.map((r, index) => {
          const isCompleted = r < activeRound;
          const isActive = r === activeRound;
          const label = ROUND_NAMES[r];

          return (
            <React.Fragment key={r}>
              {/* Node */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition-all duration-500 shadow-md ${
                    isCompleted
                      ? 'bg-casino-emerald border-casino-emerald text-casino-bg'
                      : isActive
                      ? 'bg-casino-gold border-casino-gold text-casino-bg shadow-[0_0_10px_rgba(251,191,36,0.5)] scale-110'
                      : 'bg-slate-900 border-slate-700 text-gray-500'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span
                  className={`text-[8px] font-bold uppercase tracking-wider mt-1.5 absolute -bottom-5 whitespace-nowrap transition-colors duration-500 ${
                    isActive ? 'text-casino-gold' : isCompleted ? 'text-casino-emerald' : 'text-gray-500'
                  }`}
                >
                  {label}
                </span>
              </div>

              {/* Line */}
              {index < roundsList.length - 1 && (
                <div className="flex-1 h-0.5 min-w-[30px] bg-slate-800 rounded relative overflow-hidden">
                  <div
                    className={`absolute inset-0 bg-gradient-to-r from-casino-emerald to-casino-gold transition-all duration-700 ease-out`}
                    style={{
                      width: isCompleted ? '100%' : isActive ? '50%' : '0%',
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Spacer for absolute positioning labels below */}
      <div className="h-2 w-full md:hidden" />
    </div>
  );
}
