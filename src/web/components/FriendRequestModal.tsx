import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { getDivisionFromElo } from './ProfileHeader';

export interface FriendRequestProfile {
  requestId: string;        // friend_requests.id
  senderId: string;
  username: string;
  avatar_url?: string | null;
  elo: number;
  level: number;
  wins: number;
  losses: number;
  xp: number;
}

interface FriendRequestModalProps {
  request: FriendRequestProfile;
  onAccepted: (requestId: string) => void;
  onRejected: (requestId: string) => void;
  onClose: () => void;
}

export function FriendRequestModal({
  request,
  onAccepted,
  onRejected,
  onClose,
}: FriendRequestModalProps) {
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null);
  const [done, setDone] = useState<'accepted' | 'rejected' | null>(null);

  const div = getDivisionFromElo(request.elo);
  const totalGames = request.wins + request.losses;
  const winRate = totalGames > 0 ? Math.round((request.wins / totalGames) * 100) : 0;
  const isHighElo = request.elo >= 1500;
  const initial = request.username?.trim()?.[0]?.toUpperCase() ?? '?';

  const handleAction = async (action: 'accepted' | 'rejected') => {
    setLoading(action === 'accepted' ? 'accept' : 'reject');
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: action, responded_at: new Date().toISOString() })
        .eq('id', request.requestId);

      if (error) {
        console.error('Error responding to friend request:', error);
        setLoading(null);
        return;
      }

      setDone(action);

      // Auto-close after feedback
      setTimeout(() => {
        onClose();
        if (action === 'accepted') onAccepted(request.requestId);
        else onRejected(request.requestId);
      }, 900);

    } catch (err) {
      console.error(err);
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.97) 0%, rgba(2,6,23,0.99) 100%)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 50px rgba(251,191,36,0.1)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header Banner */}
        <div className="h-20 bg-gradient-to-r from-casino-gold/20 via-purple-500/10 to-casino-gold/20 relative flex items-end px-5 pb-2">
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 10px)" }}
          />
          <p className="text-[10px] uppercase tracking-[0.2em] text-casino-gold/70 font-bold relative">
            📨 Solicitud de Amistad
          </p>
        </div>

        {/* Avatar */}
        <div className="flex justify-center -mt-10 relative z-10">
          <div className={`w-20 h-20 rounded-2xl bg-casino-surface-light flex items-center justify-center text-2xl font-black border-4 border-casino-bg shadow-xl ${
            isHighElo ? 'text-casino-gold' : 'text-gray-300'
          } overflow-hidden`}>
            {request.avatar_url ? (
              <img src={request.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
        </div>

        {/* Player Info */}
        <div className="px-6 pt-3 pb-5 space-y-4">
          {/* Name & Division */}
          <div className="text-center">
            <h3 className={`text-lg font-bold ${isHighElo ? 'text-casino-gold' : 'text-white'}`}>
              {request.username}
            </h3>
            <div className={`inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full text-xs font-semibold ${div.cssClass}`}>
              {div.icon} {div.label}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Nivel" value={`${request.level}`} icon="⭐" />
            <StatBox label="ELO" value={`${request.elo}`} icon="🏆" />
            <StatBox label="XP" value={request.xp >= 1000 ? `${(request.xp / 1000).toFixed(1)}k` : `${request.xp}`} icon="✨" />
          </div>

          {/* W/L Record */}
          <div className="glass-panel px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs">Récord (W/L)</span>
              <span className="text-white text-sm font-bold">{request.wins}W / {request.losses}L</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-casino-emerald to-emerald-400 transition-all"
                  style={{ width: `${winRate}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${winRate >= 50 ? 'text-casino-emerald' : 'text-red-400'}`}>
                {winRate}%
              </span>
            </div>
          </div>

          {/* Done feedback */}
          {done ? (
            <div className={`py-3 rounded-xl text-center font-bold text-sm animate-fade-in ${
              done === 'accepted'
                ? 'bg-casino-emerald/20 text-casino-emerald border border-casino-emerald/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {done === 'accepted' ? '🤝 ¡Ahora son amigos!' : '✕ Solicitud rechazada'}
            </div>
          ) : (
            /* Action Buttons */
            <div className="flex gap-3">
              {/* Reject */}
              <button
                onClick={() => handleAction('rejected')}
                disabled={loading !== null}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 font-bold text-sm border border-white/10 hover:border-red-500/30 transition-all active:scale-[0.98] disabled:opacity-40"
              >
                {loading === 'reject' ? '...' : '✕ Rechazar'}
              </button>

              {/* Accept */}
              <button
                onClick={() => handleAction('accepted')}
                disabled={loading !== null}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-casino-gold to-yellow-500 text-black font-bold text-sm hover:from-yellow-400 hover:to-casino-gold transition-all active:scale-[0.98] disabled:opacity-40 shadow-lg shadow-casino-gold/20"
              >
                {loading === 'accept' ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Aceptando...
                  </span>
                ) : '🤝 Aceptar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="glass-panel p-2.5 text-center">
      <div className="text-sm mb-0.5">{icon}</div>
      <div className="text-white font-bold text-sm">{value}</div>
      <div className="text-gray-500 text-[9px] uppercase tracking-wider">{label}</div>
    </div>
  );
}
