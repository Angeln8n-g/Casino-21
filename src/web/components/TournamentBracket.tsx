import React from 'react';

export interface TournamentPlayer {
  id: string;
  name: string;
  avatar?: string;
  isWinner?: boolean;
}

export interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  status: 'pending' | 'live' | 'completed';
  game_room_id?: string | null;
  best_of?: number;
  series_game?: number;
  series_id?: string | null;
}

export interface TournamentBracketProps {
  matches: TournamentMatch[];
  title?: string;
  maxParticipants?: number;
  onJoinMatch?: (match: TournamentMatch) => void;
  onInviteOpponent?: (opponentId: string, match: TournamentMatch) => void;
  currentUserId?: string | null;
  isAdmin?: boolean;
  prizePool?: string;
  inviteCooldowns?: Record<string, number>;
  onViewPlayer?: (playerId: string) => void;
}

const ROUND_LABELS: Record<number, string> = {
  0: '16avos',
  1: 'Octavos',
  2: 'Cuartos',
  3: 'Semis',
  4: 'Final',
};

function MatchNode({
  match,
  isLeft,
  isFinal,
  onJoinMatch,
  onInviteOpponent,
  currentUserId,
  isAdmin,
  inviteCooldowns,
  onViewPlayer,
}: {
  match?: TournamentMatch;
  isLeft: boolean;
  isFinal?: boolean;
  onJoinMatch?: (match: TournamentMatch) => void;
  onInviteOpponent?: (opponentId: string, match: TournamentMatch) => void;
  currentUserId?: string | null;
  isAdmin?: boolean;
  inviteCooldowns?: Record<string, number>;
  onViewPlayer?: (playerId: string) => void;
}) {
  if (!match) {
    return (
      <div className="w-28 h-16 sm:w-36 sm:h-20 md:w-44 md:h-24 border border-white/[0.03] rounded-2xl bg-slate-900/10 flex flex-col justify-center opacity-30 relative z-10">
        <div className="h-1/2 border-b border-white/[0.03]" />
      </div>
    );
  }

  const isPlayerInMatch = currentUserId && (match.player1?.id === currentUserId || match.player2?.id === currentUserId);
  const canJoin = match.status !== 'completed' && isPlayerInMatch && match.player1 && match.player2;
  const isSpectatable = match.status !== 'completed' && match.player1 && match.player2 && match.game_room_id;

  const getPlayerClass = (p: TournamentPlayer | null) => {
    if (!p) return 'text-gray-500 font-sans italic';
    if (match.status === 'completed') {
      return p.isWinner
        ? 'text-casino-emerald font-black'
        : 'text-gray-500 line-through opacity-50';
    }
    if (p.id === currentUserId) {
      return 'text-casino-gold font-bold';
    }
    return 'text-gray-300';
  };

  const getBoxClass = () => {
    if (match.status === 'live') {
      return 'border-[#FF0055]/50 bg-[#FF0055]/5 shadow-[0_0_15px_rgba(255,0,85,0.25)] animate-glow-pulse';
    }
    if (isPlayerInMatch) {
      return 'border-casino-gold/50 bg-casino-gold/5 shadow-[0_0_20px_rgba(251,191,36,0.15)]';
    }
    if (match.status === 'completed') {
      return 'border-slate-800 bg-slate-950/40 opacity-90';
    }
    return 'border-white/[0.04] bg-slate-900/60 hover:border-white/10 hover:bg-slate-900/80';
  };

  // Determine the opponent for the invite button
  const opponentId = isPlayerInMatch && match.status !== 'completed'
    ? (match.player1?.id === currentUserId ? match.player2?.id : match.player1?.id)
    : null;
  const isClickable = canJoin || isSpectatable || (isAdmin && match.status !== 'completed');

  const connOffset = isLeft ? '-right-2 sm:-right-3 md:-right-4 lg:-right-6' : '-left-2 sm:-left-3 md:-left-4 lg:-left-6';
  const connWidth = 'w-2 sm:w-3 md:w-4 lg:w-6';
  const connColor = match.status === 'completed'
    ? 'border-[#7C3AED] shadow-[0_0_8px_rgba(124,58,237,0.6)]'
    : match.status === 'live'
    ? 'border-[#FF0055] shadow-[0_0_8px_rgba(255,0,85,0.6)] animate-pulse'
    : 'border-white/[0.06]';

  return (
    <div
      className={`w-28 h-16 sm:w-36 sm:h-20 md:w-44 md:h-24 border rounded-2xl flex flex-col justify-center relative z-10 backdrop-blur-sm transition-all duration-300 font-sans tracking-tight ${isClickable ? 'hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-[0_5px_20px_rgba(124,58,237,0.25)] cursor-pointer' : ''} ${getBoxClass()}`}
      onClick={() => isClickable && onJoinMatch && onJoinMatch(match)}
    >
      {match.status === 'live' && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 z-30">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0055] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-[#FF0055] shadow-[0_0_8px_#FF0055]"></span>
        </div>
      )}
      {canJoin ? (
        <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-[#00FFCC] text-[#0F0F23] text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-sm shadow-[0_0_10px_rgba(0,255,204,0.8)] z-20 animate-pulse tracking-widest border border-[#00FFCC]/50 whitespace-nowrap">
          TU TURNO
        </div>
      ) : isSpectatable ? (
        <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-[#7C3AED] text-white text-[7px] sm:text-[8px] font-bold uppercase px-1.5 sm:px-2 py-0.5 rounded-sm shadow-[0_0_10px_rgba(124,58,237,0.6)] z-20 flex items-center gap-0.5 sm:gap-1 group-hover:bg-[#8B5CF6] transition-colors tracking-widest border border-[#A78BFA]/50 whitespace-nowrap">
          <span className="text-[8px] sm:text-[10px]">👁️</span> VER
        </div>
      ) : null}

      {(() => {
        const cooldownEnd = inviteCooldowns?.[match.id] || 0;
        const isCooldownActive = cooldownEnd > Date.now();
        const cooldownSeconds = Math.ceil((cooldownEnd - Date.now()) / 1000);

        return opponentId && onInviteOpponent && (
          <button
            onClick={(e) => { e.stopPropagation(); onInviteOpponent(opponentId, match); }}
            disabled={isCooldownActive}
            className={`absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 text-black text-[7px] sm:text-[8px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-sm shadow-[0_0_10px_rgba(234,179,8,0.6)] z-20 transition-colors tracking-widest border whitespace-nowrap flex items-center gap-0.5 ${
              isCooldownActive
                ? 'bg-slate-700/90 text-gray-400 border-slate-600 cursor-not-allowed shadow-none'
                : 'bg-casino-gold/90 hover:bg-yellow-400 border-casino-gold/50'
            }`}
            title={isCooldownActive ? `Espera para volver a avisar` : "Avisar a tu rival"}
          >
            <span className="text-[8px] sm:text-[10px]">🔔</span> <span className="hidden sm:inline">{isCooldownActive ? `Espera (${cooldownSeconds}s)` : "Avisar"}</span>
          </button>
        );
      })()}

      <div className="flex flex-col h-full text-[10px] sm:text-xs md:text-sm overflow-hidden rounded-2xl">
        {/* Player 1 Row */}
        <div
          onClick={(e) => {
            if (match.player1 && onViewPlayer) {
              e.stopPropagation();
              onViewPlayer(match.player1.id);
            }
          }}
          className={`flex-1 flex items-center px-2 border-b border-white/[0.04] truncate ${getPlayerClass(match.player1)} gap-1.5 sm:gap-2 transition-colors ${match.player1 && onViewPlayer ? 'cursor-pointer hover:bg-white/5' : ''}`}
        >
          {match.player1 ? (
            <div className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-[7px] sm:text-[10px] font-black border ${
              match.status === 'completed' && match.player1.isWinner
                ? 'border-casino-emerald/50 bg-casino-emerald/10 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : match.player1.id === currentUserId
                ? 'border-casino-gold/50 bg-casino-gold/10'
                : 'border-white/5 bg-[#1e293b]'
            } shrink-0 overflow-hidden`}>
              {match.player1.avatar ? (
                <img src={match.player1.avatar} alt={match.player1.name} className="w-full h-full object-cover" />
              ) : (
                match.player1.name.charAt(0).toUpperCase()
              )}
            </div>
          ) : (
            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-lg bg-slate-950/40 flex items-center justify-center text-[7px] sm:text-xs font-bold text-gray-700 shrink-0 border border-dashed border-white/5">
              ?
            </div>
          )}
          <span className="truncate flex-1 text-left">{match.player1?.name || 'Por definir'}</span>
          {match.player1 && match.player1.id === currentUserId && (
            <span className="text-[7px] sm:text-[8px] bg-casino-gold/10 text-casino-gold px-1 rounded border border-casino-gold/20 leading-tight shrink-0 font-bold">TÚ</span>
          )}
          {match.status === 'completed' && match.player1?.isWinner && (
            <span className="text-[8px] sm:text-xs text-casino-gold shrink-0" title="Ganador">👑</span>
          )}
        </div>

        {/* Player 2 Row */}
        <div
          onClick={(e) => {
            if (match.player2 && onViewPlayer) {
              e.stopPropagation();
              onViewPlayer(match.player2.id);
            }
          }}
          className={`flex-1 flex items-center px-2 truncate ${getPlayerClass(match.player2)} gap-1.5 sm:gap-2 transition-colors ${match.player2 && onViewPlayer ? 'cursor-pointer hover:bg-white/5' : ''}`}
        >
          {match.player2 ? (
            <div className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-[7px] sm:text-[10px] font-black border ${
              match.status === 'completed' && match.player2.isWinner
                ? 'border-casino-emerald/50 bg-casino-emerald/10 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : match.player2.id === currentUserId
                ? 'border-casino-gold/50 bg-casino-gold/10'
                : 'border-white/5 bg-[#1e293b]'
            } shrink-0 overflow-hidden`}>
              {match.player2.avatar ? (
                <img src={match.player2.avatar} alt={match.player2.name} className="w-full h-full object-cover" />
              ) : (
                match.player2.name.charAt(0).toUpperCase()
              )}
            </div>
          ) : (
            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-lg bg-slate-950/40 flex items-center justify-center text-[7px] sm:text-xs font-bold text-gray-700 shrink-0 border border-dashed border-white/5">
              ?
            </div>
          )}
          <span className="truncate flex-1 text-left">{match.player2?.name || 'Por definir'}</span>
          {match.player2 && match.player2.id === currentUserId && (
            <span className="text-[7px] sm:text-[8px] bg-casino-gold/10 text-casino-gold px-1 rounded border border-casino-gold/20 leading-tight shrink-0 font-bold">TÚ</span>
          )}
          {match.status === 'completed' && match.player2?.isWinner && (
            <span className="text-[8px] sm:text-xs text-casino-gold shrink-0" title="Ganador">👑</span>
          )}
        </div>
      </div>

      {!isFinal && (
        <div className={`absolute top-1/2 ${connWidth} border-t-2 ${connColor} ${connOffset} transition-colors duration-500`} />
      )}
    </div>
  );
}

export function TournamentBracket({
  matches,
  title = "TORNEO",
  maxParticipants = 16,
  onJoinMatch,
  onInviteOpponent,
  currentUserId,
  isAdmin,
  prizePool,
  inviteCooldowns,
  onViewPlayer,
}: TournamentBracketProps) {
  const getMatch = (r: number, p: number) => matches.find(m => m.round === r && m.position === p);

  const renderMatchNode = (match: TournamentMatch | undefined, isLeft: boolean, isFinal = false) => (
    <MatchNode
      match={match}
      isLeft={isLeft}
      isFinal={isFinal}
      onJoinMatch={onJoinMatch}
      onInviteOpponent={onInviteOpponent}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      inviteCooldowns={inviteCooldowns}
      onViewPlayer={onViewPlayer}
    />
  );

  const is8Player = maxParticipants === 8;
  const is32Player = maxParticipants === 32;

  const RoundColumn = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</span>
      {children}
    </div>
  );

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden pb-8 pt-4 custom-scrollbar flex md:justify-center justify-start items-start relative bg-transparent">
      {/* Decorative Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(251,191,36,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.02)_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="min-w-[560px] sm:min-w-[700px] md:min-w-[800px] lg:min-w-[1000px] flex flex-col items-center select-none font-sans mx-auto px-4 relative z-10">

        <div className="mb-4 sm:mb-6 text-center">
          <h2 className="text-sm sm:text-lg md:text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00FFCC] via-white to-[#7C3AED] drop-shadow-[0_0_10px_rgba(0,255,204,0.3)] uppercase">
            {title}
          </h2>
          <div className="h-0.5 w-16 sm:w-24 bg-gradient-to-r from-transparent via-[#FF0055] to-transparent mx-auto mt-2 opacity-50" />
        </div>

        <div className="flex justify-center items-stretch gap-2 sm:gap-4 md:gap-6 lg:gap-10 relative w-full px-2 sm:px-4 mt-2 sm:mt-4">

          {/* LEFT SIDE */}
          <div className="flex gap-2 sm:gap-4 md:gap-6 lg:gap-10">
            {is32Player && (
              <RoundColumn label={ROUND_LABELS[0]}>
                <div className="flex flex-col justify-around gap-1 sm:gap-2 relative">
                  {[...Array(8)].map((_, i) => (
                    <React.Fragment key={`r0-${i + 1}`}>
                      {renderMatchNode(getMatch(0, i + 1), true)}
                    </React.Fragment>
                  ))}
                  {[...Array(4)].map((_, i) => (
                    <div key={`vconn0-${i}`} className="absolute border-r border-white/10" style={{ top: `${(i * 25) + 6}%`, height: '13%', right: '-0.5rem' }} />
                  ))}
                  {[...Array(4)].map((_, i) => (
                    <div key={`hconn0-${i}`} className="absolute border-t border-white/10 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: `${(i * 25) + 12.5}%`, right: '-0.75rem' }} />
                  ))}
                </div>
              </RoundColumn>
            )}

            {!is8Player && (
              <RoundColumn label={ROUND_LABELS[1]}>
                <div className="flex flex-col justify-around gap-2 sm:gap-4 md:gap-6 relative">
                  {renderMatchNode(getMatch(1, 1), true)}
                  {renderMatchNode(getMatch(1, 2), true)}
                  {renderMatchNode(getMatch(1, 3), true)}
                  {renderMatchNode(getMatch(1, 4), true)}
                  <div className="absolute border-r border-white/10" style={{ top: '12%', height: '26%', right: '-0.5rem' }} />
                  <div className="absolute border-r border-white/10" style={{ top: '62%', height: '26%', right: '-0.5rem' }} />
                  <div className="absolute border-t border-white/10 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: '25%', right: '-0.75rem' }} />
                  <div className="absolute border-t border-white/10 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: '75%', right: '-0.75rem' }} />
                </div>
              </RoundColumn>
            )}

            <RoundColumn label={ROUND_LABELS[2]}>
              <div className={`flex flex-col justify-around ${is8Player ? 'gap-2 sm:gap-4 md:gap-6 py-0' : 'gap-8 sm:gap-12 md:gap-16 py-6 sm:py-12'} relative`}>
                {renderMatchNode(getMatch(2, 1), true)}
                {renderMatchNode(getMatch(2, 2), true)}
                <div className="absolute border-r border-white/10" style={{ top: '25%', height: '50%', right: '-0.5rem' }} />
                <div className="absolute border-t border-white/10 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: '50%', right: '-0.75rem' }} />
              </div>
            </RoundColumn>

            <RoundColumn label={ROUND_LABELS[3]}>
              <div className="flex flex-col justify-center relative py-12 sm:py-20 md:py-24">
                {renderMatchNode(getMatch(3, 1), true)}
              </div>
            </RoundColumn>
          </div>

          {/* CENTER (FINAL) */}
          <div className="flex flex-col justify-center items-center relative z-20 mx-1 sm:mx-2 md:mx-4 mt-4 sm:mt-8 md:mt-16">
            <div className="mb-3 sm:mb-4 relative flex flex-col items-center">
              <div className="absolute inset-0 bg-casino-gold/10 blur-xl rounded-full animate-pulse" />
              <span className="text-3xl sm:text-5xl md:text-6xl drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] relative z-10 mb-1">🏆</span>
              {prizePool && (
                <div className="bg-[#0F0F23]/80 border border-[#00FFCC]/30 px-2 sm:px-3 py-1 rounded-xl shadow-[0_0_15px_rgba(0,255,204,0.15)] backdrop-blur-sm z-10 animate-pulse mt-1">
                  <span className="text-[#00FFCC] font-bold text-[8px] sm:text-[10px] tracking-widest uppercase">PREMIO: {prizePool}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 sm:gap-2 relative">
              {[1, 2, 3].map(gameNum => {
                const match = getMatch(4, gameNum);
                return (
                  <div key={gameNum} className="relative">
                    <span className="absolute -left-5 sm:-left-7 md:-left-8 top-1/2 -translate-y-1/2 text-[7px] sm:text-[9px] text-gray-500 font-mono font-bold">
                      G{gameNum}
                    </span>
                    {renderMatchNode(match, false, true)}
                  </div>
                );
              })}
            </div>

            <div className="absolute top-[calc(50%+1.5rem)] sm:top-[calc(50%+2rem)] md:top-[calc(50%+3rem)] -left-2 sm:-left-4 md:-left-6 lg:-left-10 w-2 sm:w-4 md:w-6 lg:w-10 border-t border-white/10" />
            <div className="absolute top-[calc(50%+1.5rem)] sm:top-[calc(50%+2rem)] md:top-[calc(50%+3rem)] -right-2 sm:-right-4 md:-right-6 lg:-right-10 w-2 sm:w-4 md:w-6 lg:w-10 border-t border-white/10" />
          </div>

          {/* RIGHT SIDE */}
          <div className="flex gap-2 sm:gap-4 md:gap-6 lg:gap-10 flex-row-reverse">
            {is32Player && (
              <RoundColumn label={ROUND_LABELS[0]}>
                <div className="flex flex-col justify-around gap-1 sm:gap-2 relative">
                  {[...Array(8)].map((_, i) => (
                    <React.Fragment key={`r0r-${i + 9}`}>
                      {renderMatchNode(getMatch(0, i + 9), false)}
                    </React.Fragment>
                  ))}
                  {[...Array(4)].map((_, i) => (
                    <div key={`vconn0r-${i}`} className="absolute border-l border-white/10" style={{ top: `${(i * 25) + 6}%`, height: '13%', left: '-0.5rem' }} />
                  ))}
                  {[...Array(4)].map((_, i) => (
                    <div key={`hconn0r-${i}`} className="absolute border-t border-white/10 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: `${(i * 25) + 12.5}%`, left: '-0.75rem' }} />
                  ))}
                </div>
              </RoundColumn>
            )}

            {!is8Player && (
              <RoundColumn label={ROUND_LABELS[1]}>
                <div className="flex flex-col justify-around gap-2 sm:gap-4 md:gap-6 relative">
                  {renderMatchNode(getMatch(1, 5), false)}
                  {renderMatchNode(getMatch(1, 6), false)}
                  {renderMatchNode(getMatch(1, 7), false)}
                  {renderMatchNode(getMatch(1, 8), false)}
                  <div className="absolute border-l border-white/10" style={{ top: '12%', height: '26%', left: '-0.5rem' }} />
                  <div className="absolute border-l border-white/10" style={{ top: '62%', height: '26%', left: '-0.5rem' }} />
                  <div className="absolute border-t border-white/10 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: '25%', left: '-0.75rem' }} />
                  <div className="absolute border-t border-white/10 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: '75%', left: '-0.75rem' }} />
                </div>
              </RoundColumn>
            )}

            <RoundColumn label={ROUND_LABELS[2]}>
              <div className={`flex flex-col justify-around ${is8Player ? 'gap-2 sm:gap-4 md:gap-6 py-0' : 'gap-8 sm:gap-12 md:gap-16 py-6 sm:py-12'} relative`}>
                {renderMatchNode(getMatch(2, 3), false)}
                {renderMatchNode(getMatch(2, 4), false)}
                <div className="absolute border-l border-white/10" style={{ top: '25%', height: '50%', left: '-0.5rem' }} />
                <div className="absolute border-t border-white/10 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: '50%', left: '-0.75rem' }} />
              </div>
            </RoundColumn>

            <RoundColumn label={ROUND_LABELS[3]}>
              <div className="flex flex-col justify-center relative py-12 sm:py-20 md:py-24">
                {renderMatchNode(getMatch(3, 2), false)}
              </div>
            </RoundColumn>
          </div>

        </div>

        {/* Scroll indicator for mobile */}
        <div className="flex md:hidden items-center justify-center gap-2 mt-4 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
          <span>← desliza lateralmente para navegar el árbol →</span>
        </div>
      </div>
    </div>
  );
}
