import React, { useState, useEffect } from 'react';
import { TournamentMatch } from '../TournamentBracket';
import { MatchCard } from './MatchCard';
import {
  FINAL_ROUND_NUMBER,
  getInitialRoundNumber,
  getRoundDisplayName,
} from '../../../domain/tournament';

interface TournamentVerticalBracketProps {
  matches: TournamentMatch[];
  maxParticipants: number;
  currentUserId?: string | null;
  isAdmin: boolean;
  onJoinMatch: (match: TournamentMatch) => void;
  onInviteOpponent: (opponentId: string, match: TournamentMatch) => void;
  onClaimWalkover?: (matchId: string) => void;
  inviteCooldowns: Record<string, number>;
  onViewPlayer?: (playerId: string) => void;
}

export function TournamentVerticalBracket({
  matches,
  maxParticipants,
  currentUserId,
  isAdmin,
  onJoinMatch,
  onInviteOpponent,
  onClaimWalkover,
  inviteCooldowns,
  onViewPlayer,
}: TournamentVerticalBracketProps) {
  const getRoundsList = () => {
    let start = getInitialRoundNumber(maxParticipants);
    if (matches.length > 0) {
      const minRound = Math.min(...matches.map((m) => m.round));
      if (minRound < start) start = minRound;
    }

    const rounds: number[] = [];
    for (let r = start; r <= FINAL_ROUND_NUMBER; r++) {
      rounds.push(r);
    }
    return rounds;
  };

  const roundsList = getRoundsList();

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

  const initialRound = getActiveRound();
  const [selectedRound, setSelectedRound] = useState(initialRound);

  useEffect(() => {
    setSelectedRound(initialRound);
  }, [initialRound]);

  const userActiveMatch = matches.find(
    (m) =>
      m.status !== 'completed' &&
      currentUserId &&
      (m.player1?.id === currentUserId || m.player2?.id === currentUserId)
  );

  const filteredMatches = matches
    .filter((m) => m.round === selectedRound)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6 animate-fade-in">
      {userActiveMatch && (
        <div className="relative overflow-hidden rounded-2xl border border-casino-gold/50 bg-slate-900/85 p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-casino-gold uppercase tracking-widest">
              <span>⚡</span>
              <span>Tu Partido Activo</span>
            </div>
            <MatchCard
              match={userActiveMatch}
              maxParticipants={maxParticipants}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onJoinMatch={onJoinMatch}
              onInviteOpponent={onInviteOpponent}
              onClaimWalkover={onClaimWalkover}
              inviteCooldowns={inviteCooldowns}
              onViewPlayer={onViewPlayer}
            />
          </div>
        </div>
      )}

      {/* Round Selection Pills */}
      <div className="flex justify-start gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {roundsList.map((r) => {
          const isActive = selectedRound === r;
          const roundMatches = matches.filter((m) => m.round === r);
          const isRoundCompleted = roundMatches.length > 0 && roundMatches.every((m) => m.status === 'completed');
          const isCurrentActiveRound = initialRound === r;

          return (
            <button
              type="button"
              key={r}
              onClick={() => setSelectedRound(r)}
              className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 border ${
                isActive
                  ? 'bg-casino-gold text-slate-950 border-casino-gold'
                  : isCurrentActiveRound
                  ? 'bg-slate-900 text-emerald-300 border-emerald-400/40'
                  : 'bg-slate-900/70 text-slate-300 border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              <span>{getRoundDisplayName(r, maxParticipants)}</span>
              {isRoundCompleted && <span className="text-[10px]">✓</span>}
              {isCurrentActiveRound && !isRoundCompleted && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* Matches in selected round */}
      <div className="mt-4">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-12 text-slate-300 text-sm">
            No hay partidos generados para esta ronda todavía.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                maxParticipants={maxParticipants}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onJoinMatch={onJoinMatch}
                onInviteOpponent={onInviteOpponent}
                onClaimWalkover={onClaimWalkover}
                inviteCooldowns={inviteCooldowns}
                onViewPlayer={onViewPlayer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
