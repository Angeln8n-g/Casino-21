import React, { useEffect, useState } from 'react';
import { getDivisionFromElo } from './ProfileHeader';

export interface GameInviteToastData {
  invitationId: string;
  senderId: string;
  username: string;
  elo: number;
  level: number;
  wins: number;
  losses: number;
  xp: number;
  roomId: string;
  expiresAt: string; // ISO string
}

interface GameInviteToastProps {
  data: GameInviteToastData;
  onAccept: (invitationId: string, roomId: string) => void;
  onReject: (invitationId: string) => void;
}

export function GameInviteToast({ data, onAccept, onReject }: GameInviteToastProps) {
  const div = getDivisionFromElo(data.elo);
  const totalGames = data.wins + data.losses;
  const winRate = totalGames > 0 ? Math.round((data.wins / totalGames) * 100) : 0;

  // ── Countdown ────────────────────────────────────────────────
  const [progress, setProgress] = useState(100);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const endTime = new Date(data.expiresAt).getTime();
    const totalMs = endTime - Date.now();
    if (totalMs <= 0) {
      onReject(data.invitationId);
      return;
    }

    const tick = setInterval(() => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        clearInterval(tick);
        onReject(data.invitationId);
        return;
      }
      const pct = Math.max(0, (remaining / totalMs) * 100);
      setProgress(pct);
      setSecondsLeft(Math.ceil(remaining / 1000));
    }, 250);

    return () => clearInterval(tick);
  }, [data.expiresAt, data.invitationId]);

  const handleAccept = () => {
    setAccepting(true);
    onAccept(data.invitationId, data.roomId);
  };

  return (
    /* ── Outer slide-in container ─────────────────────────── */
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[340px] animate-slide-down"
      role="alertdialog"
      aria-label="Invitación a partida"
    >
      <div
        className="rounded-2xl border border-casino-gold/40 overflow-hidden shadow-[0_0_40px_rgba(251,191,36,0.2)]"
        style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(2,6,23,0.99) 100%)' }}
      >
        {/* ── Active countdown bar (top edge) ─────────────── */}
        <div className="h-0.5 w-full bg-white/5">
          <div
            className={`h-full rounded-full transition-all ${
              secondsLeft <= 10
                ? 'bg-gradient-to-r from-red-500 to-red-400'
                : 'bg-gradient-to-r from-casino-gold to-yellow-300'
            }`}
            style={{ width: `${progress}%`, transition: 'width 0.25s linear' }}
          />
        </div>

        {/* ── Header ──────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg animate-[bounce_1s_ease-in-out_3]">⚔️</span>
            <div>
              <p className="text-white font-black text-sm leading-none">¡Invitación a Partida!</p>
              <p className="text-gray-500 text-[10px] mt-0.5 leading-none">Tienes {secondsLeft}s para responder</p>
            </div>
          </div>
          {/* Room code badge */}
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-gray-500 uppercase tracking-[0.15em]">Sala</span>
            <span className="font-mono font-black text-casino-gold text-base tracking-widest leading-none">
              {data.roomId}
            </span>
          </div>
        </div>

        {/* ── Player profile strip ─────────────────────────── */}
        <div
          className="mx-3 mb-3 rounded-xl p-3 flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-xl bg-casino-surface-light flex items-center justify-center text-lg font-black text-casino-gold border-2 border-casino-gold/30 shadow-lg shadow-casino-gold/10">
              {data.username.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-casino-emerald border-2 border-casino-bg" />
          </div>

          {/* Name + Division */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{data.username}</p>
            <div className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${div.cssClass}`}>
              {div.icon} {div.label}
            </div>
          </div>

          {/* Quick stats */}
          <div className="shrink-0 flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-gray-500">ELO</span>
              <span className="text-xs font-bold text-casino-gold">{data.elo}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-gray-500">Niv.</span>
              <span className="text-xs font-bold text-white">{data.level}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-gray-500">W%</span>
              <span className={`text-xs font-bold ${winRate >= 50 ? 'text-casino-emerald' : 'text-red-400'}`}>
                {winRate}%
              </span>
            </div>
          </div>
        </div>

        {/* ── Action buttons ────────────────────────────────── */}
        <div className="px-3 pb-3 flex gap-2">
          {/* Reject */}
          <button
            onClick={() => onReject(data.invitationId)}
            disabled={accepting}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] font-bold text-sm border border-white/[0.06] hover:border-white/[0.12] transition-all active:scale-[0.97] disabled:opacity-40"
          >
            ✕ Rechazar
          </button>
          {/* Accept */}
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-casino-gold to-yellow-400 text-black font-black text-sm hover:from-yellow-300 hover:to-casino-gold transition-all active:scale-[0.97] shadow-lg shadow-casino-gold/25 disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {accepting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Entrando...
              </>
            ) : (
              <>🎮 Unirse</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
