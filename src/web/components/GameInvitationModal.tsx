import React, { useEffect, useState } from 'react';
import { GameInviteToastData } from '../hooks/useNotifications';
import { getDivisionFromElo } from './ProfileHeader';

interface GameInvitationModalProps {
  invite: GameInviteToastData;
  onAccept: (invitationId: string, roomId: string) => void;
  onReject: (invitationId: string) => void;
  onClose: () => void;
}

export function GameInvitationModal({ invite, onAccept, onReject, onClose }: GameInvitationModalProps) {
  const div = getDivisionFromElo(invite.elo);
  const totalGames = invite.wins + invite.losses;
  const winRate = totalGames > 0 ? Math.round((invite.wins / totalGames) * 100) : 0;

  const [progress, setProgress] = useState(100);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const endTime = new Date(invite.expiresAt).getTime();
    const totalMs = endTime - Date.now();
    
    if (totalMs <= 0) {
      onReject(invite.invitationId);
      onClose();
      return;
    }

    const tick = setInterval(() => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        clearInterval(tick);
        onReject(invite.invitationId);
        onClose();
        return;
      }
      const pct = Math.max(0, (remaining / totalMs) * 100);
      setProgress(pct);
      setSecondsLeft(Math.ceil(remaining / 1000));
    }, 250);

    return () => clearInterval(tick);
  }, [invite.expiresAt, invite.invitationId]);

  const handleAccept = () => {
    setAccepting(true);
    onAccept(invite.invitationId, invite.roomId);
    onClose();
  };

  const handleReject = () => {
    onReject(invite.invitationId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={handleReject} 
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-sm glass-panel-strong border-casino-gold/50 shadow-[0_0_50px_rgba(251,191,36,0.3)] animate-scale-up overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-white/5">
          <div
            className={`h-full transition-all duration-300 ${
              secondsLeft <= 10 ? 'bg-red-500' : 'bg-casino-gold'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-casino-surface-light flex items-center justify-center text-3xl mb-4 border-2 border-casino-gold shadow-lg shadow-casino-gold/20 relative">
              <span className="animate-bounce">⚔️</span>
              <div className="absolute -top-2 -right-2 bg-casino-gold text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Desafío
              </div>
            </div>
            <h2 className="text-xl font-display font-black text-white uppercase tracking-wider leading-tight">
              ¡Has sido desafiado!
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Sala: <span className="text-casino-gold font-mono font-bold tracking-widest">{invite.roomId}</span>
            </p>
          </div>

          {/* Opponent Profile */}
          <div className="glass-panel p-4 border-white/10 mb-6 flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-xl bg-casino-surface-light flex items-center justify-center text-xl font-bold text-white border border-white/10">
                {invite.username.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-casino-emerald border-2 border-casino-surface shadow-sm" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold truncate">{invite.username}</span>
                <span className="text-[10px] font-bold text-gray-500">Niv.{invite.level}</span>
              </div>
              <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-black ${div.cssClass}`}>
                {div.icon} {div.label}
              </div>
              <div className="flex gap-3 mt-2">
                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold">Elo</span>
                  <span className="text-xs text-casino-gold font-bold">{invite.elo}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-500 uppercase tracking-wider font-bold">Win Rate</span>
                  <span className={`text-xs font-bold ${winRate >= 50 ? 'text-casino-emerald' : 'text-red-400'}`}>
                    {winRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-casino-gold to-yellow-500 text-black font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all active:scale-[0.98] shadow-lg shadow-casino-gold/25 flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Conectando...
                </>
              ) : (
                <>🎮 Aceptar Desafío</>
              )}
            </button>
            
            <button
              onClick={handleReject}
              disabled={accepting}
              className="w-full py-3 rounded-xl bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.05] text-xs font-bold transition-all border border-white/5"
            >
              No, gracias ({secondsLeft}s)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
