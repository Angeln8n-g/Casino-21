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
  inviteCooldowns: Record<string, number>;
  onViewPlayer?: (playerId: string) => void;
}

const ROUND_LABELS: Record<number, string> = {
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
  inviteCooldowns,
  onViewPlayer,
}: TournamentVerticalBracketProps) {
  // Determine available rounds
  const getRoundsList = () => {
    if (maxParticipants === 8) return [2, 3, 4];
    if (maxParticipants === 32) return [0, 1, 2, 3, 4];
    return [1, 2, 3, 4]; // Default 16
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
              className={`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 border transform active:scale-95 ${
                isActive
                  ? 'bg-casino-gold text-casino-bg border-casino-gold shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                  : isCurrentActiveRound
                  ? 'bg-transparent text-casino-gold border-casino-gold/40 hover:bg-casino-gold/10'
                  : isRoundCompleted
                  ? 'bg-black/30 text-casino-emerald border-casino-emerald/20 hover:bg-white/5'
                  : 'bg-black/30 text-gray-500 border-white/5 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {ROUND_LABELS[r]}
                {isRoundCompleted && <span className="text-[10px]">✓</span>}
                {isCurrentActiveRound && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-casino-gold animate-pulse" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="glass-panel p-8 text-center border-white/5 bg-slate-900/20">
            <span className="text-3xl block mb-2 opacity-50">🛡️</span>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
              Partidos no disponibles
            </h4>
            <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
              Los emparejamientos de esta ronda se generarán en cuanto finalice el último partido de la ronda anterior.
            </p>
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
