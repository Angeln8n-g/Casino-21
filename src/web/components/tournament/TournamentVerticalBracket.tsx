import React, { useState, useEffect } from 'react';
import { TournamentMatch } from '../TournamentBracket';
import { MatchCard } from './MatchCard';

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

const ROUND_LABELS: Record<number, string> = {
  '-4': '256avos',
  '-3': '128avos',
  '-2': '64avos',
  '-1': '32avos',
  0: '16avos',
  1: 'Octavos',
  2: 'Cuartos',
  3: 'Semis',
  4: 'Final',
};

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
  // Determine available rounds dynamically
  const getRoundsList = () => {
    let start = 1;
    if (maxParticipants <= 8) start = 2;
    else if (maxParticipants <= 16) start = 1;
    else if (maxParticipants <= 32) start = 0;
    else if (maxParticipants <= 64) start = -1;
    else if (maxParticipants <= 128) start = -2;
    else if (maxParticipants <= 256) start = -3;
    else start = -4;

    if (matches.length > 0) {
      const minRound = Math.min(...matches.map(m => m.round));
      if (minRound < start) start = minRound;
    }

    const rounds: number[] = [];
    for (let r = start; r <= 4; r++) {
      rounds.push(r);
    }
    return rounds;
  };

  const roundsList = getRoundsList();

  // Find the active round: first round that has non-completed matches
  const getActiveRound = () => {
    if (matches.length === 0) return roundsList[0];
    for (const r of roundsList) {
      const roundMatches = matches.filter(m => m.round === r);
      if (roundMatches.some(m => m.status !== 'completed')) {
        return r;
      }
    }
    return 4; // Final if everything completed
  };

  const initialRound = getActiveRound();
  const [selectedRound, setSelectedRound] = useState(initialRound);

  // Sync selected round with database changes
  useEffect(() => {
    setSelectedRound(initialRound);
  }, [initialRound]);

  // Find if user has a pending or live match in the tournament
  const userActiveMatch = matches.find(
    m =>
      m.status !== 'completed' &&
      currentUserId &&
      (m.player1?.id === currentUserId || m.player2?.id === currentUserId)
  );

  const filteredMatches = matches
    .filter(m => m.round === selectedRound)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ⚡ Highlight User Active Match */}
      {userActiveMatch && (
        <div className="relative overflow-hidden rounded-2xl border border-casino-gold bg-casino-gold/5 p-4 shadow-[0_0_20px_rgba(251,191,36,0.15)] animate-fade-in">
          {/* Subtle gold glow pulse back */}
          <div className="absolute inset-0 bg-gradient-to-r from-casino-gold/5 to-transparent animate-pulse-slow pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-casino-gold uppercase tracking-widest">
              <span className="text-sm">⚡</span>
              <span>Tu Partido Activo</span>
            </div>
            <MatchCard
              match={userActiveMatch}
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
        {roundsList.map(r => {
          const isActive = selectedRound === r;
          const isRoundCompleted = matches.filter(m => m.round === r).every(m => m.status === 'completed');
          const isCurrentActiveRound = initialRound === r;
          
          return (
            <button
              key={r}
              onClick={() => setSelectedRound(r)}
              className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 border ${
                isActive
                  ? 'bg-casino-gold text-casino-bg border-casino-gold shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                  : isCurrentActiveRound
                  ? 'bg-casino-emerald/10 text-casino-emerald border-casino-emerald/30'
                  : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/10 hover:text-white'
              }`}
            >
              <span>{ROUND_LABELS[r] || `Ronda ${r}`}</span>
              {isRoundCompleted && <span className="text-[10px]">✓</span>}
              {isCurrentActiveRound && !isRoundCompleted && (
                <span className="w-1.5 h-1.5 rounded-full bg-casino-emerald animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Matches in selected round */}
      <div className="mt-4">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No hay partidos programados para esta ronda aún.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
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
