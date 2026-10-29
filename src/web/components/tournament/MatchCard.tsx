import React, { useEffect, useState } from 'react';
import { TournamentMatch, TournamentPlayer } from '../TournamentBracket';
import { FINAL_ROUND_NUMBER, getRoundDisplayName } from '../../../domain/tournament';

const NO_SHOW_TIMEOUT_MS = 180_000;

interface MatchCardProps {
  match: TournamentMatch;
  maxParticipants?: number;
  currentUserId?: string | null;
  isAdmin: boolean;
  onJoinMatch: (match: TournamentMatch) => void;
  onInviteOpponent: (opponentId: string, match: TournamentMatch) => void;
  onClaimWalkover?: (matchId: string) => void;
  inviteCooldowns: Record<string, number>;
  onViewPlayer?: (playerId: string) => void;
}

export function MatchCard({
  match,
  maxParticipants = 16,
  currentUserId,
  isAdmin,
  onJoinMatch,
  onInviteOpponent,
  onClaimWalkover,
  inviteCooldowns,
  onViewPlayer,
}: MatchCardProps) {
  const { round, position, player1, player2, status, game_room_id } = match;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (status === 'completed' || (!match.waiting_since && !(inviteCooldowns[match.id] > Date.now()))) {
      return;
    }
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status, match.waiting_since, match.id, inviteCooldowns]);

  const isPlayerInMatch = Boolean(
    currentUserId && (player1?.id === currentUserId || player2?.id === currentUserId)
  );
  const canJoin = status !== 'completed' && isPlayerInMatch && Boolean(player1 && player2);
  const isSpectatable = status !== 'completed' && Boolean(player1 && player2 && game_room_id);
  const isClickable = canJoin || isSpectatable;

  const opponentId =
    isPlayerInMatch && status !== 'completed'
      ? player1?.id === currentUserId
        ? player2?.id
        : player1?.id
      : null;

  const cooldownEnd = inviteCooldowns[match.id] || 0;
  const isCooldownActive = cooldownEnd > nowMs;
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownEnd - nowMs) / 1000));

  const waitElapsedMs = match.waiting_since ? Math.max(0, nowMs - new Date(match.waiting_since).getTime()) : 0;
  const waitRemainingSec = match.waiting_since
    ? Math.max(0, Math.ceil((NO_SHOW_TIMEOUT_MS - waitElapsedMs) / 1000))
    : 0;
  const canClaimWalkoverNow =
    isPlayerInMatch &&
    status !== 'completed' &&
    Boolean(match.waiting_since) &&
    match.waiting_player_id === currentUserId &&
    waitRemainingSec === 0;

  const formatWaitClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const getCardStyle = () => {
    if (status === 'live') {
      return 'border-rose-500/50 bg-slate-900/90 shadow-[0_0_20px_rgba(244,63,94,0.2)]';
    }
    if (isPlayerInMatch) {
      return 'border-casino-gold/50 bg-slate-900/90 shadow-[0_0_20px_rgba(251,191,36,0.12)]';
    }
    if (status === 'completed') {
      return 'border-white/10 bg-slate-950/60';
    }
    return 'border-white/10 bg-slate-900/70 hover:border-white/20';
  };

  const getPlayerStyle = (p: TournamentPlayer | null) => {
    if (!p) return 'text-slate-400 italic';
    if (status === 'completed') {
      return p.isWinner ? 'text-emerald-300 font-black' : 'text-slate-400 line-through opacity-70';
    }
    if (p.id === currentUserId) {
      return 'text-casino-gold font-bold';
    }
    return 'text-white';
  };

  const getAdvanceInfo = () => {
    if (round === FINAL_ROUND_NUMBER) {
      return (match.best_of ?? 1) > 1
        ? `👑 Gran Final (Juego ${match.series_game || position} de Mejor de ${match.best_of})`
        : '👑 Gran Final — ¡El ganador se corona Campeón!';
    }
    const nextRoundName = getRoundDisplayName(round + 1, maxParticipants);
    const nextPos = Math.ceil(position / 2);
    return `El ganador avanza a ${nextRoundName} (Partido ${nextPos})`;
  };

  const renderPlayer = (p: TournamentPlayer | null, isSecondSlot: boolean) => {
    if (!p) {
      const isByeSlot = isSecondSlot && match.walkover_reason === 'bye';
      return (
        <div className="flex items-center gap-3 py-2 px-3 bg-black/30 rounded-xl border border-dashed border-white/10">
          <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 border border-white/10">
            {isByeSlot ? '⚡' : '?'}
          </div>
          <span className="text-xs text-slate-300 font-mono">
            {isByeSlot ? 'BYE (Avance directo por seeding)' : 'Por definir'}
          </span>
        </div>
      );
    }

    const won = status === 'completed' && p.isWinner;

    return (
      <div
        onClick={(e) => {
          if (onViewPlayer) {
            e.stopPropagation();
            onViewPlayer(p.id);
          }
        }}
        title={onViewPlayer ? 'Ver perfil de jugador' : undefined}
        className={`flex items-center justify-between py-2 px-3 rounded-xl transition-all ${
          onViewPlayer ? 'hover:bg-white/5 cursor-pointer' : ''
        } ${won ? 'bg-black/50 border border-emerald-400/30' : 'bg-black/30 border border-transparent'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 overflow-hidden border ${
              won
                ? 'border-emerald-400/50 bg-slate-800 text-emerald-300'
                : p.id === currentUserId
                ? 'border-casino-gold/50 bg-slate-800 text-casino-gold'
                : 'border-white/10 bg-slate-800 text-white'
            }`}
          >
            {p.avatar ? (
              <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              p.name.charAt(0).toUpperCase()
            )}
          </div>
          <span className={`text-xs truncate ${getPlayerStyle(p)}`}>
            {p.name}{' '}
            {p.id === currentUserId && (
              <span className="text-[9px] bg-black/60 text-casino-gold px-1.5 py-0.5 rounded ml-1 border border-casino-gold/30">
                TÚ
              </span>
            )}
          </span>
        </div>

        {won && (
          <span className="text-sm shrink-0" title="Ganador">
            👑
          </span>
        )}
      </div>
    );
  };

  const renderBadge = () => {
    if (match.walkover_reason === 'bye') {
      return (
        <span className="text-emerald-300 font-bold uppercase tracking-widest bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-400/30 text-[9px]">
          ⚡ Bye (Seed)
        </span>
      );
    }
    if (match.walkover_reason) {
      return (
        <span className="text-amber-300 font-bold uppercase tracking-widest bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-400/30 text-[9px]">
          ⚖️ Walkover
        </span>
      );
    }
    if (status === 'live') {
      return (
        <span className="flex items-center gap-1.5 text-rose-300 font-black uppercase tracking-widest bg-rose-500/15 px-2.5 py-0.5 rounded-full border border-rose-400/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
          EN JUEGO
        </span>
      );
    }
    if (status === 'completed') {
      return (
        <span className="text-slate-200 uppercase tracking-widest bg-white/10 px-2.5 py-0.5 rounded-full">
          Completado
        </span>
      );
    }
    return (
      <span className="text-cyan-300 uppercase tracking-widest bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
        Pendiente
      </span>
    );
  };

  return (
    <div
      onClick={() => isClickable && onJoinMatch(match)}
      className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-300 ${
        isClickable ? 'cursor-pointer hover:-translate-y-0.5' : ''
      } ${getCardStyle()}`}
    >
      <div className="flex justify-between items-center text-[10px] text-slate-300 font-mono">
        <span>
          {(match.best_of ?? 1) > 1
            ? `SERIE JUEGO ${match.series_game || position}`
            : `PARTIDO ${position}`}
        </span>
        {renderBadge()}
      </div>

      <div className="flex flex-col gap-1.5">
        {renderPlayer(player1, false)}
        {renderPlayer(player2, true)}
      </div>

      {/* Estado de espera No-Show en vivo */}
      {status !== 'completed' && match.waiting_since && (
        <div className="px-3 py-2 rounded-xl bg-black/50 border border-amber-400/30 text-xs font-bold text-amber-300 flex items-center justify-between gap-2">
          <span>
            {match.waiting_player_id === currentUserId
              ? '⏳ Esperando a tu rival en sala'
              : isPlayerInMatch
              ? '⚠️ Tu rival ya te espera en la sala'
              : '⏳ Jugador esperando rival'}
          </span>
          <span className="font-mono">
            {waitRemainingSec > 0 ? formatWaitClock(waitRemainingSec) : 'Tiempo cumplido'}
          </span>
        </div>
      )}

      {isClickable && (
        <div className="mt-0.5">
          {canJoin ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJoinMatch(match);
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-2.5 rounded-xl text-xs uppercase tracking-widest transition-colors"
            >
              🎮 ¡Entrar a Jugar!
            </button>
          ) : isSpectatable ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJoinMatch(match);
              }}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-2 rounded-xl text-xs uppercase tracking-widest transition-colors"
            >
              👁️ Espectar Partida
            </button>
          ) : null}
        </div>
      )}

      {/* Reclamar victoria por incomparecencia cuando se cumplen los 3 minutos */}
      {canClaimWalkoverNow && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClaimWalkover?.(match.id);
          }}
          className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black py-2.5 rounded-xl text-xs uppercase tracking-widest transition-colors"
        >
          ⚖️ Reclamar Victoria por Walkover
        </button>
      )}

      {/* Avisar al Rival */}
      {opponentId && !isCooldownActive && status !== 'completed' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInviteOpponent(opponentId, match);
          }}
          className="w-full bg-casino-gold hover:bg-yellow-400 text-black font-black py-2 rounded-xl text-xs uppercase tracking-widest transition-colors"
        >
          🔔 Avisar a mi Rival
        </button>
      )}

      {opponentId && isCooldownActive && status !== 'completed' && (
        <div className="text-center py-2 bg-black/40 rounded-xl border border-white/10 text-[10px] text-slate-300 font-mono">
          Espera {cooldownSeconds}s para volver a avisar
        </div>
      )}

      {isAdmin && status !== 'completed' && !canJoin && !isSpectatable && (
        <span className="text-[10px] text-slate-400 font-mono text-center">
          Sala: {game_room_id || 'Pendiente'}
        </span>
      )}

      <div className="border-t border-white/10 pt-2 text-[10px] text-slate-300 font-medium">
        {getAdvanceInfo()}
      </div>
    </div>
  );
}
