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
}

const ROUND_LABELS: Record<number, string> = {
  0: '16avos',
  1: 'Octavos',
  2: 'Cuartos',
  3: 'Semis',
  4: 'Final',
};

function MatchNode({ match, isLeft, isFinal, onJoinMatch, onInviteOpponent, currentUserId, isAdmin }: { match?: TournamentMatch; isLeft: boolean; isFinal?: boolean; onJoinMatch?: (match: TournamentMatch) => void; onInviteOpponent?: (opponentId: string, match: TournamentMatch) => void; currentUserId?: string | null; isAdmin?: boolean }) {
  if (!match) {
    return (
      <div className="w-28 h-16 sm:w-36 sm:h-20 md:w-44 md:h-24 border border-[#2A2A4A] rounded bg-[#0F0F23]/80 flex flex-col justify-center opacity-40 relative z-10">
        <div className="h-1/2 border-b border-[#2A2A4A]" />
      </div>
    );
  }

  const getPlayerClass = (p: TournamentPlayer | null) => {
    if (!p) return 'text-slate-600 font-mono';
    if (match.status === 'completed') {
      return p.isWinner ? 'text-[#00FFCC] font-bold text-shadow-[0_0_5px_rgba(0,255,204,0.5)]' : 'text-slate-500 opacity-60 line-through';
    }
    return 'text-slate-200';
  };

  const getBoxClass = () => {
    if (match.status === 'live') return 'border-[#FF0055]/70 shadow-[0_0_15px_rgba(255,0,85,0.4)] bg-[#FF0055]/10';
    if (match.status === 'completed') return 'border-[#7C3AED]/40 bg-[#0F0F23]/90';
    return 'border-[#2A2A4A] bg-[#0F0F23]/70 hover:border-[#7C3AED]/60';
  };

  const isPlayerInMatch = currentUserId && (match.player1?.id === currentUserId || match.player2?.id === currentUserId);
  const canJoin = match.status !== 'completed' && isPlayerInMatch && match.player1 && match.player2;
  const isSpectatable = match.status !== 'completed' && match.player1 && match.player2 && match.game_room_id;

  // Determine the opponent for the invite button
  const opponentId = isPlayerInMatch && match.status !== 'completed'
    ? (match.player1?.id === currentUserId ? match.player2?.id : match.player1?.id)
    : null;
  const isClickable = canJoin || isSpectatable || (isAdmin && match.status !== 'completed');

  const connOffset = isLeft ? '-right-2 sm:-right-3 md:-right-4 lg:-right-6' : '-left-2 sm:-left-3 md:-left-4 lg:-left-6';
  const connWidth = 'w-2 sm:w-3 md:w-4 lg:w-6';
  const connColor = match.status === 'completed' ? 'border-[#7C3AED] shadow-[0_0_5px_#7C3AED]' : 'border-[#2A2A4A]';

  return (
    <div
      className={`w-28 h-16 sm:w-36 sm:h-20 md:w-44 md:h-24 border rounded flex flex-col justify-center relative z-10 backdrop-blur-sm transition-all duration-300 font-mono tracking-tight ${isClickable ? 'hover:scale-105 hover:-translate-y-1 hover:shadow-[0_5px_20px_rgba(124,58,237,0.4)] cursor-pointer' : ''} ${getBoxClass()}`}
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

      {opponentId && onInviteOpponent && (
        <button
          onClick={(e) => { e.stopPropagation(); onInviteOpponent(opponentId, match); }}
          className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 bg-casino-gold/90 text-black text-[7px] sm:text-[8px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-sm shadow-[0_0_10px_rgba(234,179,8,0.6)] z-20 hover:bg-yellow-400 transition-colors tracking-widest border border-casino-gold/50 whitespace-nowrap flex items-center gap-0.5"
          title="Avisar a tu rival"
        >
          <span className="text-[8px] sm:text-[10px]">🔔</span> <span className="hidden sm:inline">Avisar</span>
        </button>
      )}

      <div className="flex flex-col h-full text-[10px] sm:text-xs md:text-sm">
        <div className={`flex-1 flex items-center px-1.5 sm:px-2 md:px-3 border-b border-[#2A2A4A] truncate ${getPlayerClass(match.player1)} gap-1.5 sm:gap-2 md:gap-3 transition-colors`}>
          {match.player1 && (
            <div className="w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 rounded-sm bg-[#1A1A3A] flex items-center justify-center text-[8px] sm:text-xs font-bold border border-[#7C3AED]/40 shrink-0 overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]">
              {match.player1.avatar ? (
                <img src={match.player1.avatar} alt={match.player1.name} className="w-full h-full object-cover" />
              ) : (
                match.player1.name.charAt(0).toUpperCase()
              )}
            </div>
          )}
          <span className="truncate">{match.player1?.name || 'TBD'}</span>
        </div>
        <div className={`flex-1 flex items-center px-1.5 sm:px-2 md:px-3 truncate ${getPlayerClass(match.player2)} gap-1.5 sm:gap-2 md:gap-3 transition-colors`}>
          {match.player2 && (
            <div className="w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 rounded-sm bg-[#1A1A3A] flex items-center justify-center text-[8px] sm:text-xs font-bold border border-[#7C3AED]/40 shrink-0 overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]">
              {match.player2.avatar ? (
                <img src={match.player2.avatar} alt={match.player2.name} className="w-full h-full object-cover" />
              ) : (
                match.player2.name.charAt(0).toUpperCase()
              )}
            </div>
          )}
          <span className="truncate">{match.player2?.name || 'TBD'}</span>
        </div>
      </div>

      {!isFinal && (
        <div className={`absolute top-1/2 ${connWidth} border-t-2 ${connColor} ${connOffset} transition-colors duration-500`} />
      )}
    </div>
  );
}

export function TournamentBracket({ matches, title = "SOCCER CHAMPIONSHIP", maxParticipants = 16, onJoinMatch, onInviteOpponent, currentUserId, isAdmin, prizePool }: TournamentBracketProps) {
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
    />
  );

  const is8Player = maxParticipants === 8;
  const is32Player = maxParticipants === 32;

  const RoundColumn = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</span>
      {children}
    </div>
  );

  return (
    <div className="w-full h-full overflow-x-auto overflow-y-hidden pb-8 pt-4 custom-scrollbar flex md:justify-center justify-start items-start relative bg-[#0F0F23] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1A1A3A] via-[#0F0F23] to-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.05)_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="min-w-[560px] sm:min-w-[700px] md:min-w-[800px] lg:min-w-[1000px] flex flex-col items-center select-none font-sans mx-auto px-4 relative z-10">

        <div className="mb-4 sm:mb-6 text-center">
          <h2 className="text-lg sm:text-2xl md:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00FFCC] via-white to-[#7C3AED] drop-shadow-[0_0_10px_rgba(0,255,204,0.5)]">
            {title}
          </h2>
          <div className="h-1 w-20 sm:w-32 bg-gradient-to-r from-transparent via-[#FF0055] to-transparent mx-auto mt-2 opacity-70" />
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
                    <div key={`vconn0-${i}`} className="absolute border-r-2 border-white/20" style={{ top: `${(i * 25) + 6}%`, height: '13%', right: '-0.5rem' }} />
                  ))}
                  {[...Array(4)].map((_, i) => (
                    <div key={`hconn0-${i}`} className="absolute border-t-2 border-white/20 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: `${(i * 25) + 12.5}%`, right: '-0.75rem' }} />
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
                  <div className="absolute border-r-2 border-white/20" style={{ top: '12%', height: '26%', right: '-0.5rem' }} />
                  <div className="absolute border-r-2 border-white/20" style={{ top: '62%', height: '26%', right: '-0.5rem' }} />
                  <div className="absolute border-t-2 border-white/20 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: '25%', right: '-0.75rem' }} />
                  <div className="absolute border-t-2 border-white/20 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: '75%', right: '-0.75rem' }} />
                </div>
              </RoundColumn>
            )}

            <RoundColumn label={ROUND_LABELS[2]}>
              <div className={`flex flex-col justify-around ${is8Player ? 'gap-2 sm:gap-4 md:gap-6 py-0' : 'gap-8 sm:gap-12 md:gap-16 py-6 sm:py-12'} relative`}>
                {renderMatchNode(getMatch(2, 1), true)}
                {renderMatchNode(getMatch(2, 2), true)}
                <div className="absolute border-r-2 border-white/20" style={{ top: '25%', height: '50%', right: '-0.5rem' }} />
                <div className="absolute border-t-2 border-white/20 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: '50%', right: '-0.75rem' }} />
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
              <div className="absolute inset-0 bg-casino-gold/20 blur-xl rounded-full animate-pulse" />
              <span className="text-3xl sm:text-5xl md:text-7xl drop-shadow-[0_0_20px_rgba(234,179,8,0.8)] relative z-10 mb-1">🏆</span>
              {prizePool && (
                <div className="bg-[#0F0F23]/80 border border-[#00FFCC]/50 px-2 sm:px-3 py-0.5 rounded shadow-[0_0_15px_rgba(0,255,204,0.3)] backdrop-blur-sm z-10 animate-pulse mt-1">
                  <span className="text-[#00FFCC] font-bold text-[9px] sm:text-xs tracking-widest uppercase">RECOMPENSA: {prizePool}</span>
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

            <div className="absolute top-[calc(50%+1.5rem)] sm:top-[calc(50%+2rem)] md:top-[calc(50%+3rem)] -left-2 sm:-left-4 md:-left-6 lg:-left-10 w-2 sm:w-4 md:w-6 lg:w-10 border-t-2 border-white/20" />
            <div className="absolute top-[calc(50%+1.5rem)] sm:top-[calc(50%+2rem)] md:top-[calc(50%+3rem)] -right-2 sm:-right-4 md:-right-6 lg:-right-10 w-2 sm:w-4 md:w-6 lg:w-10 border-t-2 border-white/20" />
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
                    <div key={`vconn0r-${i}`} className="absolute border-l-2 border-white/20" style={{ top: `${(i * 25) + 6}%`, height: '13%', left: '-0.5rem' }} />
                  ))}
                  {[...Array(4)].map((_, i) => (
                    <div key={`hconn0r-${i}`} className="absolute border-t-2 border-white/20 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: `${(i * 25) + 12.5}%`, left: '-0.75rem' }} />
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
                  <div className="absolute border-l-2 border-white/20" style={{ top: '12%', height: '26%', left: '-0.5rem' }} />
                  <div className="absolute border-l-2 border-white/20" style={{ top: '62%', height: '26%', left: '-0.5rem' }} />
                  <div className="absolute border-t-2 border-white/20 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: '25%', left: '-0.75rem' }} />
                  <div className="absolute border-t-2 border-white/20 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: '75%', left: '-0.75rem' }} />
                </div>
              </RoundColumn>
            )}

            <RoundColumn label={ROUND_LABELS[2]}>
              <div className={`flex flex-col justify-around ${is8Player ? 'gap-2 sm:gap-4 md:gap-6 py-0' : 'gap-8 sm:gap-12 md:gap-16 py-6 sm:py-12'} relative`}>
                {renderMatchNode(getMatch(2, 3), false)}
                {renderMatchNode(getMatch(2, 4), false)}
                <div className="absolute border-l-2 border-white/20" style={{ top: '25%', height: '50%', left: '-0.5rem' }} />
                <div className="absolute border-t-2 border-white/20 w-2 sm:w-3 md:w-4 lg:w-5" style={{ top: '50%', left: '-0.75rem' }} />
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
          <span>← desliza para ver →</span>
        </div>
      </div>
    </div>
  );
}
