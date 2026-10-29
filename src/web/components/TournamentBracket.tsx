import React, { useEffect, useState } from 'react';
import {
  FINAL_ROUND_NUMBER,
  getInitialRoundNumber,
  getRoundDisplayName,
} from '../../domain/tournament';

const NO_SHOW_TIMEOUT_MS = 180_000;

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
  walkover_reason?: string | null;
  waiting_player_id?: string | null;
  waiting_since?: string | null;
}

export interface TournamentBracketProps {
  matches: TournamentMatch[];
  title?: string;
  maxParticipants?: number;
  onJoinMatch?: (match: TournamentMatch) => void;
  onInviteOpponent?: (opponentId: string, match: TournamentMatch) => void;
  onClaimWalkover?: (matchId: string) => void;
  currentUserId?: string | null;
  isAdmin?: boolean;
  prizePool?: string;
  inviteCooldowns?: Record<string, number>;
  onViewPlayer?: (playerId: string) => void;
}

function MatchNode({
  match,
  isLeft,
  isFinal,
  onJoinMatch,
  onInviteOpponent,
  onClaimWalkover,
  currentUserId,
  isAdmin,
  inviteCooldowns,
  onViewPlayer,
  nowMs,
}: {
  match?: TournamentMatch;
  isLeft: boolean;
  isFinal?: boolean;
  onJoinMatch?: (match: TournamentMatch) => void;
  onInviteOpponent?: (opponentId: string, match: TournamentMatch) => void;
  onClaimWalkover?: (matchId: string) => void;
  currentUserId?: string | null;
  isAdmin?: boolean;
  inviteCooldowns?: Record<string, number>;
  onViewPlayer?: (playerId: string) => void;
  nowMs: number;
}) {
  if (!match) {
    return (
      <div className="w-32 h-16 sm:w-40 sm:h-20 md:w-44 md:h-24 border border-white/5 rounded-2xl bg-slate-900/30 flex flex-col justify-center opacity-40 relative z-10">
        <div className="h-1/2 border-b border-white/5" />
      </div>
    );
  }

  const isPlayerInMatch = Boolean(
    currentUserId && (match.player1?.id === currentUserId || match.player2?.id === currentUserId)
  );
  const canJoin = match.status !== 'completed' && isPlayerInMatch && Boolean(match.player1 && match.player2);
  const isSpectatable = match.status !== 'completed' && Boolean(match.player1 && match.player2 && match.game_room_id);

  const getPlayerClass = (p: TournamentPlayer | null) => {
    if (!p) return 'text-slate-400 font-sans italic';
    if (match.status === 'completed') {
      return p.isWinner ? 'text-emerald-300 font-black' : 'text-slate-400 line-through opacity-65';
    }
    if (p.id === currentUserId) {
      return 'text-casino-gold font-bold';
    }
    return 'text-slate-200';
  };

  const getBoxClass = () => {
    if (match.status === 'live') {
      return 'border-rose-500/50 bg-slate-900/90 shadow-[0_0_15px_rgba(244,63,94,0.2)]';
    }
    if (isPlayerInMatch) {
      return 'border-casino-gold/50 bg-slate-900/90 shadow-[0_0_20px_rgba(251,191,36,0.14)]';
    }
    if (match.status === 'completed') {
      return 'border-white/10 bg-slate-950/60';
    }
    return 'border-white/10 bg-slate-900/75 hover:border-white/20';
  };

  const opponentId =
    isPlayerInMatch && match.status !== 'completed'
      ? match.player1?.id === currentUserId
        ? match.player2?.id
        : match.player1?.id
      : null;

  const isClickable = canJoin || isSpectatable || (Boolean(isAdmin) && match.status !== 'completed');

  const waitElapsed = match.waiting_since ? Math.max(0, nowMs - new Date(match.waiting_since).getTime()) : 0;
  const waitRemainingSec = match.waiting_since ? Math.max(0, Math.ceil((NO_SHOW_TIMEOUT_MS - waitElapsed) / 1000)) : 0;
  const isMyWaitActive =
    isPlayerInMatch && match.status !== 'completed' && Boolean(match.waiting_since) && match.waiting_player_id === currentUserId;

  const connOffset = isLeft ? '-right-2 sm:-right-3 md:-right-4 lg:-right-6' : '-left-2 sm:-left-3 md:-left-4 lg:-left-6';
  const connWidth = 'w-2 sm:w-3 md:w-4 lg:w-6';
  const connColor =
    match.status === 'completed'
      ? 'border-purple-500/70'
      : match.status === 'live'
      ? 'border-rose-500/80'
      : 'border-white/10';

  const renderSlot = (p: TournamentPlayer | null, isSecondSlot: boolean) => {
    const isBye = !p && isSecondSlot && match.walkover_reason === 'bye';
    return (
      <div
        onClick={(e) => {
          if (p && onViewPlayer) {
            e.stopPropagation();
            onViewPlayer(p.id);
          }
        }}
        className={`flex-1 flex items-center px-2 ${
          !isSecondSlot ? 'border-b border-white/10' : ''
        } truncate ${getPlayerClass(p)} gap-1.5 sm:gap-2 transition-colors ${
          p && onViewPlayer ? 'cursor-pointer hover:bg-white/5' : ''
        }`}
      >
        {p ? (
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-[8px] sm:text-[10px] font-black border ${
              match.status === 'completed' && p.isWinner
                ? 'border-emerald-400/50 bg-slate-800 text-emerald-300'
                : p.id === currentUserId
                ? 'border-casino-gold/50 bg-slate-800 text-casino-gold'
                : 'border-white/10 bg-slate-800 text-white'
            } shrink-0 overflow-hidden`}
          >
            {p.avatar ? (
              <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              p.name.charAt(0).toUpperCase()
            )}
          </div>
        ) : (
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-slate-950/60 flex items-center justify-center text-[8px] sm:text-xs font-bold text-slate-400 shrink-0 border border-dashed border-white/10">
            {isBye ? '⚡' : '?'}
          </div>
        )}
        <span className="truncate flex-1 text-left">
          {p?.name || (isBye ? 'BYE (Directo)' : 'Por definir')}
        </span>
        {p && p.id === currentUserId && (
          <span className="text-[7px] sm:text-[8px] bg-black/70 text-casino-gold px-1 rounded border border-casino-gold/30 leading-tight shrink-0 font-bold">
            TÚ
          </span>
        )}
        {match.status === 'completed' && p?.isWinner && (
          <span className="text-[9px] sm:text-xs text-casino-gold shrink-0" title="Ganador">
            👑
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      id={isPlayerInMatch && match.status !== 'completed' ? 'my-match-node' : undefined}
      className={`w-32 h-16 sm:w-40 sm:h-20 md:w-44 md:h-24 border rounded-2xl flex flex-col justify-center relative z-10 backdrop-blur-sm transition-all duration-300 font-sans tracking-tight ${
        isClickable ? 'hover:scale-[1.02] cursor-pointer' : ''
      } ${getBoxClass()}`}
      onClick={() => isClickable && onJoinMatch?.(match)}
    >
      {match.status === 'live' && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 z-30">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:h-3 bg-rose-500" />
        </div>
      )}

      {canJoin ? (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-400 text-black text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded-md z-20 tracking-wider whitespace-nowrap">
          JUGAR AHORA
        </div>
      ) : isSpectatable ? (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded-md z-20 flex items-center gap-1 tracking-wider whitespace-nowrap">
          <span>👁️</span> VER
        </div>
      ) : match.walkover_reason === 'bye' ? (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-800 text-emerald-300 border border-emerald-400/30 text-[7px] sm:text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md z-20 tracking-wider whitespace-nowrap">
          BYE
        </div>
      ) : null}

      {/* Walkover claim or countdown badge on bottom */}
      {isMyWaitActive && waitRemainingSec === 0 && onClaimWalkover ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClaimWalkover(match.id);
          }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-400 hover:bg-amber-300 text-black text-[8px] font-black uppercase px-2 py-0.5 rounded-md z-20 whitespace-nowrap shadow-md"
        >
          ⚖️ Reclamar Walkover
        </button>
      ) : isMyWaitActive && waitRemainingSec > 0 ? (
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-900 border border-amber-400/40 text-amber-300 text-[8px] font-mono font-bold px-2 py-0.5 rounded-md z-20 whitespace-nowrap">
          ⏳ {Math.floor(waitRemainingSec / 60)}:{String(waitRemainingSec % 60).padStart(2, '0')}
        </div>
      ) : (
        (() => {
          const cooldownEnd = inviteCooldowns?.[match.id] || 0;
          const isCooldownActive = cooldownEnd > nowMs;
          const cooldownSeconds = Math.max(0, Math.ceil((cooldownEnd - nowMs) / 1000));

          return (
            opponentId &&
            onInviteOpponent && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInviteOpponent(opponentId, match);
                }}
                disabled={isCooldownActive}
                className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase px-2 py-0.5 rounded-md z-20 transition-colors tracking-wider border whitespace-nowrap flex items-center gap-1 ${
                  isCooldownActive
                    ? 'bg-slate-800 text-slate-300 border-slate-700 cursor-not-allowed'
                    : 'bg-casino-gold hover:bg-yellow-400 text-black border-casino-gold'
                }`}
              >
                <span>🔔</span>
                <span className="hidden sm:inline">{isCooldownActive ? `${cooldownSeconds}s` : 'Avisar'}</span>
              </button>
            )
          );
        })()
      )}

      <div className="flex flex-col h-full text-[10px] sm:text-xs overflow-hidden rounded-2xl">
        {renderSlot(match.player1, false)}
        {renderSlot(match.player2, true)}
      </div>

      {!isFinal && (
        <div
          className={`absolute top-1/2 ${connWidth} border-t-2 ${connColor} ${connOffset} transition-colors duration-500`}
        />
      )}
    </div>
  );
}

export function TournamentBracket({
  matches,
  title = 'TORNEO',
  maxParticipants = 16,
  onJoinMatch,
  onInviteOpponent,
  onClaimWalkover,
  currentUserId,
  isAdmin,
  prizePool,
  inviteCooldowns,
  onViewPlayer,
}: TournamentBracketProps) {
  const [zoom, setZoom] = useState(100);
  const [notice, setNotice] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const hasActiveTimers = matches.some(
      (m) => m.status !== 'completed' && (m.waiting_since || (inviteCooldowns?.[m.id] ?? 0) > Date.now())
    );
    if (!hasActiveTimers) return;
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [matches, inviteCooldowns]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 50));
  const handleZoomReset = () => setZoom(100);

  const scrollToMyMatch = () => {
    const el = document.getElementById('my-match-node');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } else {
      setNotice('No tienes una partida pendiente activa en esta llave en este momento.');
      window.setTimeout(() => setNotice(null), 3500);
    }
  };

  const getMatch = (r: number, p: number) => matches.find((m) => m.round === r && m.position === p);

  const renderMatchNode = (match: TournamentMatch | undefined, isLeft: boolean, isFinal = false) => (
    <MatchNode
      match={match}
      isLeft={isLeft}
      isFinal={isFinal}
      onJoinMatch={onJoinMatch}
      onInviteOpponent={onInviteOpponent}
      onClaimWalkover={onClaimWalkover}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      inviteCooldowns={inviteCooldowns}
      onViewPlayer={onViewPlayer}
      nowMs={nowMs}
    />
  );

  // Rondas previas a la Gran Final (4J -> [3], 8J -> [2,3], 16J -> [1,2,3], 32J -> [0,1,2,3])
  const getBranchRounds = () => {
    let start = getInitialRoundNumber(maxParticipants);
    if (matches.length > 0) {
      const minMatchRound = Math.min(...matches.map((m) => m.round));
      if (minMatchRound < start) start = minMatchRound;
    }

    const roundsList: number[] = [];
    for (let r = start; r < FINAL_ROUND_NUMBER; r++) {
      roundsList.push(r);
    }
    return roundsList;
  };

  const rounds = getBranchRounds();

  const finalMatches = matches
    .filter((m) => m.round === FINAL_ROUND_NUMBER)
    .sort((a, b) => (a.series_game || a.position) - (b.series_game || b.position));
  const finalBestOf = finalMatches[0]?.best_of || 1;
  const finalGamesCount = Math.max(finalMatches.length, finalBestOf > 1 ? finalBestOf : 1);

  return (
    <div className="w-full text-white space-y-3 animate-fade-in font-sans">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/85 border border-white/10 p-3 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider hidden sm:inline">Zoom:</span>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-sm font-bold transition-all"
            title="Reducir zoom"
          >
            -
          </button>
          <span className="text-xs font-mono font-bold text-casino-gold w-12 text-center">{zoom}%</span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-sm font-bold transition-all"
            title="Aumentar zoom"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomReset}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 hover:text-white uppercase transition-all"
            title="Restablecer zoom al 100%"
          >
            100%
          </button>
        </div>

        {currentUserId && (
          <button
            type="button"
            onClick={scrollToMyMatch}
            className="px-3.5 py-1.5 rounded-xl bg-casino-gold hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
          >
            🎯 Ir a Mi Partida
          </button>
        )}
      </div>

      {notice && (
        <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs font-bold text-slate-200 text-center">
          {notice}
        </div>
      )}

      {/* Main Bracket Scroll Viewport */}
      <div className="w-full overflow-x-auto overflow-y-auto max-h-[75vh] p-4 sm:p-6 custom-scrollbar relative bg-slate-950/75 rounded-3xl border border-white/10 shadow-2xl">
        <div
          className="w-max min-w-full flex flex-col items-center justify-center m-auto relative z-10 transition-transform duration-200 origin-center"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          <div className="mb-6 text-center">
            <h2 className="text-base sm:text-xl font-black tracking-widest text-white uppercase">{title}</h2>
            <div className="h-0.5 w-20 bg-gradient-to-r from-transparent via-casino-gold to-transparent mx-auto mt-2 opacity-60" />
          </div>

          <div className="flex justify-center items-stretch gap-4 sm:gap-6 md:gap-8 lg:gap-10 relative w-full px-4">
            {/* LEFT BRANCHES */}
            <div className="flex gap-4 sm:gap-6 md:gap-8 lg:gap-10">
              {rounds.map((r) => {
                const totalMatches = Math.pow(2, Math.max(0, FINAL_ROUND_NUMBER - r));
                const halfMatches = Math.max(1, totalMatches / 2);

                return (
                  <div key={`left-r-${r}`} className="flex flex-col items-center gap-2">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-300 mb-1">
                      {getRoundDisplayName(r, maxParticipants)}
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
                <span className="text-4xl sm:text-5xl mb-1">🏆</span>
                <span className="text-xs font-black uppercase text-casino-gold tracking-widest">
                  GRAN FINAL {finalGamesCount > 1 ? `(Bo${finalGamesCount})` : ''}
                </span>
                {prizePool && (
                  <div className="bg-slate-900 border border-casino-gold/30 px-3 py-1 rounded-xl mt-1.5">
                    <span className="text-casino-gold font-bold text-[10px] tracking-widest uppercase">
                      POZO: {prizePool}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2.5 relative">
                {finalGamesCount === 1 ? (
                  renderMatchNode(finalMatches[0] || getMatch(FINAL_ROUND_NUMBER, 1), false, true)
                ) : (
                  Array.from({ length: finalGamesCount }).map((_, idx) => {
                    const gameNum = idx + 1;
                    const match =
                      finalMatches.find((m) => (m.series_game || m.position) === gameNum) ||
                      getMatch(FINAL_ROUND_NUMBER, gameNum);
                    return (
                      <div key={`final-g${gameNum}`} className="relative flex items-center gap-2">
                        <span className="text-[10px] text-slate-300 font-mono font-bold">G{gameNum}</span>
                        {renderMatchNode(match, false, true)}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT BRANCHES */}
            <div className="flex gap-4 sm:gap-6 md:gap-8 lg:gap-10 flex-row-reverse">
              {rounds.map((r) => {
                const totalMatches = Math.pow(2, Math.max(0, FINAL_ROUND_NUMBER - r));
                const halfMatches = Math.max(1, totalMatches / 2);

                return (
                  <div key={`right-r-${r}`} className="flex flex-col items-center gap-2">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-300 mb-1">
                      {getRoundDisplayName(r, maxParticipants)}
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
