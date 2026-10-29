import React from 'react';
import { TournamentMatch } from '../TournamentBracket';
import { FINAL_ROUND_NUMBER, getInitialRoundNumber, getRoundDisplayName } from '../../../domain/tournament';

interface TournamentProgressProps {
  maxParticipants: number;
  matches: TournamentMatch[];
  currentUserId?: string | null;
}

export function TournamentProgress({ maxParticipants, matches, currentUserId }: TournamentProgressProps) {
  const getRoundsList = () => {
    let start = getInitialRoundNumber(maxParticipants);
    if (matches.length > 0) {
      const minMatchRound = Math.min(...matches.map((m) => m.round));
      if (minMatchRound < start) start = minMatchRound;
    }
    const list: number[] = [];
    for (let r = start; r <= FINAL_ROUND_NUMBER; r++) {
      list.push(r);
    }
    return list;
  };

  const roundsList = getRoundsList();

  const getPlayerStatus = () => {
    if (!currentUserId || matches.length === 0) {
      return {
        label: 'Espectador',
        style: 'border-white/15 bg-slate-800/60 text-slate-200',
      };
    }

    const userMatches = matches.filter(
      (m) => m.player1?.id === currentUserId || m.player2?.id === currentUserId
    );

    if (userMatches.length === 0) {
      return {
        label: 'Espectador',
        style: 'border-white/15 bg-slate-800/60 text-slate-200',
      };
    }

    // Check if user won the Final
    const finalMatches = matches.filter(
      (m) => m.round === FINAL_ROUND_NUMBER && (m.player1?.id === currentUserId || m.player2?.id === currentUserId)
    );
    if (finalMatches.length > 0 && finalMatches.every((m) => m.status === 'completed')) {
      const wins = finalMatches.filter(
        (m) =>
          (m.player1?.id === currentUserId && m.player1.isWinner) ||
          (m.player2?.id === currentUserId && m.player2.isWinner)
      ).length;
      const losses = finalMatches.length - wins;
      if (wins > losses) {
        return {
          label: '🏆 ¡Campeón!',
          style: 'border-casino-gold bg-slate-900 text-casino-gold font-black',
        };
      }
    }

    let eliminatedRound = -1;
    userMatches.forEach((m) => {
      if (m.status === 'completed' && (m.best_of ?? 1) === 1) {
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
        label: `Eliminado en ${getRoundDisplayName(eliminatedRound, maxParticipants)}`,
        style: 'border-red-500/40 bg-slate-900 text-red-300',
      };
    }

    return {
      label: '⚡ En Competencia',
      style: 'border-emerald-400/50 bg-slate-900 text-emerald-300 font-black',
    };
  };

  const status = getPlayerStatus();

  const getActiveRound = () => {
    if (matches.length === 0) return roundsList[0];
    for (const r of roundsList) {
      const roundMatches = matches.filter((m) => m.round === r);
      if (roundMatches.some((m) => m.status !== 'completed')) {
        return r;
      }
    }
    return FINAL_ROUND_NUMBER;
  };

  const activeRound = getActiveRound();

  return (
    <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">Tu Estado:</span>
        <div className={`px-3.5 py-1.5 rounded-full border text-[10px] uppercase font-bold tracking-widest ${status.style}`}>
          {status.label}
        </div>
      </div>

      <div className="flex items-center gap-1 w-full max-w-md justify-end pb-4 md:pb-3">
        {roundsList.map((r, index) => {
          const isCompleted = r < activeRound;
          const isActive = r === activeRound;
          const label = getRoundDisplayName(r, maxParticipants);

          return (
            <React.Fragment key={r}>
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition-all duration-500 ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-400 text-black'
                      : isActive
                      ? 'bg-casino-gold border-casino-gold text-black scale-110'
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 absolute -bottom-5 whitespace-nowrap ${
                    isActive ? 'text-casino-gold' : isCompleted ? 'text-emerald-300' : 'text-slate-300'
                  }`}
                >
                  {label}
                </span>
              </div>

              {index < roundsList.length - 1 && (
                <div className="flex-1 h-0.5 min-w-[28px] bg-slate-800 rounded relative overflow-hidden">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-casino-gold transition-all duration-700 ease-out"
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
    </div>
  );
}
