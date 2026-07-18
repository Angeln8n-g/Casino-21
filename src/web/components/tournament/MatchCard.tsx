import React from 'react';
import { TournamentMatch, TournamentPlayer } from '../TournamentBracket';

interface MatchCardProps {
  match: TournamentMatch;
  currentUserId?: string | null;
  isAdmin: boolean;
  onJoinMatch: (match: TournamentMatch) => void;
  onInviteOpponent: (opponentId: string, match: TournamentMatch) => void;
  inviteCooldowns: Record<string, number>;
  onViewPlayer?: (playerId: string) => void;
}

const ROUND_NAMES: Record<number, string> = {
  0: '16avos',
  1: 'Octavos',
  2: 'Cuartos',
  3: 'Semis',
  4: 'Final',
};

export function MatchCard({
  match,
  currentUserId,
  isAdmin,
  onJoinMatch,
  onInviteOpponent,
  inviteCooldowns,
  onViewPlayer,
}: MatchCardProps) {
  const { round, position, player1, player2, status, game_room_id } = match;

  const isPlayerInMatch = currentUserId && (player1?.id === currentUserId || player2?.id === currentUserId);
  const canJoin = status !== 'completed' && isPlayerInMatch && player1 && player2;
  const isSpectatable = status !== 'completed' && player1 && player2 && game_room_id;
  const isClickable = canJoin || isSpectatable || (isAdmin && status !== 'completed');

  const opponentId = isPlayerInMatch && status !== 'completed'
    ? (player1?.id === currentUserId ? player2?.id : player1?.id)
    : null;

  const cooldownEnd = inviteCooldowns[match.id] || 0;
  const isCooldownActive = cooldownEnd > Date.now();
  const cooldownSeconds = Math.ceil((cooldownEnd - Date.now()) / 1000);

  // Border and shadow styling based on state
  const getCardStyle = () => {
    if (status === 'live') {
      return 'border-[#FF0055]/50 bg-[#FF0055]/5 shadow-[0_0_20px_rgba(255,0,85,0.25)] animate-glow-pulse';
    }
    if (isPlayerInMatch) {
      return 'border-casino-gold/50 bg-casino-gold/5 shadow-[0_0_20px_rgba(251,191,36,0.15)]';
    }
    if (status === 'completed') {
      return 'border-slate-800 bg-slate-950/40 opacity-90';
    }
    return 'border-white/[0.04] bg-slate-900/60 hover:border-white/10 hover:bg-slate-900/80';
  };

  const getPlayerStyle = (p: TournamentPlayer | null) => {
    if (!p) return 'text-gray-600 italic';
    if (status === 'completed') {
      return p.isWinner
        ? 'text-casino-emerald font-black'
        : 'text-gray-500 line-through opacity-50';
    }
    if (p.id === currentUserId) {
      return 'text-casino-gold font-bold';
    }
    return 'text-white';
  };

  // Connection metadata
  const getAdvanceInfo = () => {
    if (round === 4) {
      return '👑 Gran Final — ¡El ganador será coronado Campeón!';
    }
    const nextRoundName = ROUND_NAMES[round + 1] || 'Siguiente Ronda';
    const nextPos = Math.ceil(position / 2);
    const siblingPos = position % 2 === 0 ? position - 1 : position + 1;
    return `👉 El ganador avanza a ${nextRoundName} (Partido ${nextPos}) contra el ganador del Partido ${siblingPos}`;
  };

  const renderPlayer = (p: TournamentPlayer | null, isPlayer1: boolean) => {
    if (!p) {
      return (
        <div className="flex items-center gap-3 py-2 px-3 bg-black/25 rounded-xl border border-dashed border-white/5">
          <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-xs font-bold text-gray-700 shrink-0 border border-white/5">
            ?
          </div>
          <span className="text-xs text-gray-600 font-mono">Por definir</span>
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
        title={onViewPlayer ? "Ver perfil de jugador" : undefined}
        className={`flex items-center justify-between py-2 px-3 rounded-xl transition-all ${
          onViewPlayer ? 'hover:bg-white/5 cursor-pointer' : ''
        } ${won ? 'bg-casino-emerald/5' : 'bg-black/20'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 overflow-hidden border ${
            won ? 'border-casino-emerald/50 bg-casino-emerald/10 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : p.id === currentUserId ? 'border-casino-gold/50 bg-casino-gold/10' : 'border-white/5 bg-[#1e293b]'
          }`}>
            {p.avatar ? (
              <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              p.name.charAt(0).toUpperCase()
            )}
          </div>
          <span className={`text-xs truncate ${getPlayerStyle(p)}`}>
            {p.name} {p.id === currentUserId && <span className="text-[9px] bg-casino-gold/10 text-casino-gold px-1 rounded ml-1 border border-casino-gold/20">TÚ</span>}
          </span>
        </div>

        {won && (
          <span className="text-sm animate-bounce" title="Ganador">
            👑
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      onClick={() => isClickable && onJoinMatch(match)}
      className={`glass-panel border p-4 flex flex-col gap-3 transition-all duration-300 ${
        isClickable ? 'cursor-pointer transform hover:-translate-y-1 hover:shadow-lg' : ''
      } ${getCardStyle()}`}
    >
      {/* Header Info */}
      <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
        <span>PARTIDO {position}</span>
        {status === 'live' ? (
          <span className="flex items-center gap-1 text-[#FF0055] font-black uppercase tracking-widest bg-[#FF0055]/10 px-2 py-0.5 rounded-full border border-[#FF0055]/20 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF0055]" />
            EN VIVO
          </span>
        ) : status === 'completed' ? (
          <span className="text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">
            Completado
          </span>
        ) : (
          <span className="text-cyan-400 uppercase tracking-widest bg-cyan-400/5 px-2 py-0.5 rounded-full border border-cyan-400/10">
            Pendiente
          </span>
        )}
      </div>

      {/* Players Stack */}
      <div className="flex flex-col gap-1.5">
        {renderPlayer(player1, true)}
        {renderPlayer(player2, false)}
      </div>

      {/* Action CTA Buttons */}
      {isClickable && (
        <div className="mt-1">
          {canJoin ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJoinMatch(match);
              }}
              className="w-full bg-casino-emerald text-casino-bg font-black py-2 rounded-xl text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.45)] hover:bg-casino-emerald-light transition-all active:scale-95 animate-pulse border border-casino-emerald"
            >
              🎮 ¡Entrar a Jugar! (Tu Turno)
            </button>
          ) : isSpectatable ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJoinMatch(match);
              }}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-2 rounded-xl text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all active:scale-95 border border-purple-500/50"
            >
              👁️ Espectar Partida
            </button>
          ) : isAdmin ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJoinMatch(match); // for admin, this opens admin action dialog
              }}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-all"
            >
              ⚙️ Gestionar Encuentro (Admin)
            </button>
          ) : null}
        </div>
      )}

      {/* Invite Opponent Action */}
      {opponentId && !isCooldownActive && status !== 'completed' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onInviteOpponent(opponentId, match);
          }}
          className="w-full bg-casino-gold hover:bg-yellow-400 text-casino-bg font-black py-2 rounded-xl text-xs uppercase tracking-widest shadow-[0_0_10px_rgba(251,191,36,0.3)] transition-all active:scale-95 border border-casino-gold"
        >
          🔔 Avisar a mi Rival
        </button>
      )}

      {opponentId && isCooldownActive && status !== 'completed' && (
        <div className="text-center py-2 bg-slate-950/40 rounded-xl border border-white/5 text-[10px] text-gray-500 font-mono">
          Espera {cooldownSeconds}s para avisar de nuevo
        </div>
      )}

      {/* Footer connection details */}
      <div className="border-t border-white/[0.04] pt-2 text-[9px] text-gray-500 font-medium">
        {getAdvanceInfo()}
      </div>
    </div>
  );
}
