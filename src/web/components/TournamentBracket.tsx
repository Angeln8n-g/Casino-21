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
      id={isPlayerInMatch ? "my-match-node" : undefined}
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
  const [zoom, setZoom] = React.useState(100);
  const scrollViewportRef = React.useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 15, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 15, 50));
  const handleZoomReset = () => setZoom(100);

  const scrollToMyMatch = () => {
    const el = document.getElementById('my-match-node');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } else {
      alert('No estás participando en una partida activa en esta llave.');
    }
  };

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

  // Dynamic round calculation
  const getRoundList = () => {
    let start = 1;
    if (maxParticipants <= 8) start = 2;
    else if (maxParticipants <= 16) start = 1;
    else if (maxParticipants <= 32) start = 0;
    else if (maxParticipants <= 64) start = -1;
    else if (maxParticipants <= 128) start = -2;
    else if (maxParticipants <= 256) start = -3;
    else start = -4;

    if (matches.length > 0) {
      const minMatchRound = Math.min(...matches.map(m => m.round));
      if (minMatchRound < start) start = minMatchRound;
    }

    const roundsList: number[] = [];
    for (let r = start; r <= 3; r++) {
      roundsList.push(r);
    }
    return roundsList;
  };

  const rounds = getRoundList();

  const getRoundLabel = (r: number) => {
    switch (r) {
      case -4: return '256avos';
      case -3: return '128avos';
      case -2: return '64avos';
      case -1: return '32avos';
      case 0: return '16avos';
      case 1: return 'Octavos';
      case 2: return 'Cuartos';
      case 3: return 'Semis';
      case 4: return 'Final';
      default: return `Ronda ${r}`;
    }
  };

  return (
    <div className="w-full text-white space-y-3 animate-fade-in font-sans">
      {/* Controls Bar: Zoom & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-white/10 p-3 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">Zoom:</span>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-sm font-bold transition-all"
            title="Reducir zoom"
          >
            -
          </button>
          <span className="text-xs font-mono font-bold text-casino-gold w-12 text-center">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-sm font-bold transition-all"
            title="Aumentar zoom"
          >
            +
          </button>
          <button
            onClick={handleZoomReset}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-gray-400 hover:text-white uppercase transition-all"
            title="Restablecer zoom al 100%"
          >
            100%
          </button>
        </div>

        {currentUserId && (
          <button
            onClick={scrollToMyMatch}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-casino-gold to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all flex items-center gap-1.5"
          >
            🎯 Ir a Mi Partida
          </button>
        )}
      </div>

      {/* Main Bracket Scroll Viewport */}
      <div
        ref={scrollViewportRef}
        className="w-full overflow-x-auto overflow-y-auto max-h-[75vh] p-4 sm:p-6 custom-scrollbar relative bg-slate-950/60 rounded-3xl border border-white/10 shadow-2xl"
      >
        {/* Grid Decorative Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(251,191,36,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

        {/* Outer Content Container - w-max min-w-full m-auto ensures X=0 anchors correctly without negative clipping */}
        <div
          className="w-max min-w-full flex flex-col items-center justify-center m-auto relative z-10 transition-transform duration-200 origin-center"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          {/* Header Title */}
          <div className="mb-6 text-center">
            <h2 className="text-base sm:text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00FFCC] via-white to-[#7C3AED] uppercase">
              {title}
            </h2>
            <div className="h-0.5 w-20 bg-gradient-to-r from-transparent via-[#FF0055] to-transparent mx-auto mt-2 opacity-50" />
          </div>

          {/* Bracket Tree Row */}
          <div className="flex justify-center items-stretch gap-4 sm:gap-6 md:gap-8 lg:gap-10 relative w-full px-4">
            
            {/* LEFT BRANCHES (Round 0 / 1 / 2 / 3) */}
            <div className="flex gap-4 sm:gap-6 md:gap-8 lg:gap-10">
              {rounds.map(r => {
                const totalMatches = Math.pow(2, Math.max(0, 4 - r - 1));
                const halfMatches = Math.max(1, totalMatches / 2);

                return (
                  <div key={`left-r-${r}`} className="flex flex-col items-center gap-2">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                      {getRoundLabel(r)}
                    </span>
                    <div className="flex flex-col justify-around gap-3 sm:gap-4 relative h-full">
                      {[...Array(halfMatches)].map((_, i) => (
                        <React.Fragment key={`match-left-${r}-${i + 1}`}>
                          {renderMatchNode(getMatch(r, i + 1), true)}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CENTER FINAL (ROUND 4) */}
            <div className="flex flex-col justify-center items-center relative z-20 mx-4">
              <div className="mb-4 flex flex-col items-center">
                <span className="text-4xl sm:text-5xl drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] mb-1">🏆</span>
                <span className="text-xs font-black uppercase text-amber-400 tracking-widest">GRAN FINAL</span>
                {prizePool && (
                  <div className="bg-[#0F0F23]/80 border border-[#00FFCC]/30 px-3 py-1 rounded-xl shadow-lg shadow-[#00FFCC]/10 mt-1">
                    <span className="text-[#00FFCC] font-bold text-[10px] tracking-widest uppercase">
                      PREMIO: {prizePool}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 relative">
                {[1, 2, 3].map(gameNum => {
                  const match = getMatch(4, gameNum);
                  return (
                    <div key={`final-g${gameNum}`} className="relative flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-mono font-bold">G{gameNum}</span>
                      {renderMatchNode(match, false, true)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT BRANCHES (Round 3 / 2 / 1 / 0) */}
            <div className="flex gap-4 sm:gap-6 md:gap-8 lg:gap-10 flex-row-reverse">
              {rounds.map(r => {
                const totalMatches = Math.pow(2, Math.max(0, 4 - r - 1));
                const halfMatches = Math.max(1, totalMatches / 2);

                return (
                  <div key={`right-r-${r}`} className="flex flex-col items-center gap-2">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                      {getRoundLabel(r)}
                    </span>
                    <div className="flex flex-col justify-around gap-3 sm:gap-4 relative h-full">
                      {[...Array(halfMatches)].map((_, i) => (
                        <React.Fragment key={`match-right-${r}-${halfMatches + i + 1}`}>
                          {renderMatchNode(getMatch(r, halfMatches + i + 1), false)}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
