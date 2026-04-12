import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { getDivisionFromElo } from './ProfileHeader';
import { socketService } from '../services/socket';

export interface FriendForModal {
  id: string;
  username: string;
  avatar_url?: string | null;
  elo: number;
  level: number;
  wins: number;
  losses: number;
  xp: number;
  isOnline: boolean;
  roomId?: string | null; // null/undefined = not in room
}

interface FriendProfileModalProps {
  friend: FriendForModal;
  onClose: () => void;
  onOpenChat: () => void;
}

const CHALLENGE_DURATION_MS = 60_000;

export function FriendProfileModal({ friend, onClose, onOpenChat }: FriendProfileModalProps) {
  const { user } = useAuth();
  const div = getDivisionFromElo(friend.elo);
  const totalGames = friend.wins + friend.losses;
  const winRate = totalGames > 0 ? Math.round((friend.wins / totalGames) * 100) : 0;
  const isHighElo = friend.elo >= 1500;
  const isInRoom = !!friend.roomId;

  // ── Challenge state ───────────────────────────────────────────
  const [challengeState, setChallengeState] = useState<'idle' | 'waiting' | 'accepted' | 'expired'>('idle');
  const [progress, setProgress] = useState(100); // 100% → 0% over 60s
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = () => {
    startTimeRef.current = Date.now();
    setProgress(100);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remainingPct = Math.max(0, 100 - (elapsed / CHALLENGE_DURATION_MS) * 100);
      
      setProgress(remainingPct);
      
      if (remainingPct <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setChallengeState('expired');
        // Auto-cancel the invitation
        if (invitationId) {
          supabase.from('game_invitations').update({ status: 'expired' }).eq('id', invitationId).then(() => {});
        }
      }
    }, 250);
  };

  const handleChallenge = async () => {
    if (!user) return;
    setChallengeState('waiting');

    try {
      // 1. Connect to socket and create a private room
      const socket = await socketService.connect();
      
      // We wrap the wait in a Promise
      const roomId = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout creating room")), 10000);
        
        socket.once('room_created', ({ roomId }: { roomId: string }) => {
          clearTimeout(timeout);
          resolve(roomId);
        });

        socket.emit('create_room', { 
          playerName: user.email?.split('@')[0] || 'Jugador',
          mode: '1v1'
        });
      });

      const expiresAt = new Date(Date.now() + CHALLENGE_DURATION_MS).toISOString();

      // 2. Create game invitation in DB with the ROOM ID
      const { data, error } = await supabase
        .from('game_invitations')
        .insert({
          sender_id: user.id,
          receiver_id: friend.id,
          status: 'pending',
          expires_at: expiresAt,
          room_id: roomId, // CRITICAL: Now we have a room!
        })
        .select('id')
        .single();

      if (error) throw error;
      setInvitationId(data.id);

      // 3. Create rich notification
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username, elo, level, wins, losses, xp')
        .eq('id', user.id)
        .single();

      await supabase.from('notifications').insert({
        player_id: friend.id,
        type: 'game_invitation',
        content: `¡${senderProfile?.username || 'Un amigo'} te ha desafiado a una partida!`,
        is_read: false,
        metadata: { 
          sender_id: user.id, 
          invitation_id: data.id,
          roomId: roomId,
          senderName: senderProfile?.username,
          sender_elo: senderProfile?.elo,
          sender_level: senderProfile?.level,
          sender_wins: senderProfile?.wins,
          sender_losses: senderProfile?.losses,
          sender_xp: senderProfile?.xp,
          expiresAt: expiresAt
        },
      });

      startCountdown();

      // 4. Listen for acceptance
      const channel = supabase
        .channel(`invitation_${data.id}_${Math.random()}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'game_invitations', filter: `id=eq.${data.id}` },
          (payload) => {
            if (payload.new.status === 'accepted') {
              if (timerRef.current) clearInterval(timerRef.current);
              setChallengeState('accepted');
              supabase.removeChannel(channel);
              setTimeout(() => {
                onClose();
              }, 1250);
            } else if (payload.new.status === 'rejected' || payload.new.status === 'cancelled' || payload.new.status === 'expired') {
              if (timerRef.current) clearInterval(timerRef.current);
              setChallengeState('expired');
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.error('Error starting challenge:', err);
      setChallengeState('idle');
    }
  };

  const handleCancelChallenge = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (invitationId) {
      await supabase.from('game_invitations').update({ status: 'cancelled' }).eq('id', invitationId);
    }
    setChallengeState('idle');
    setInvitationId(null);
  };

  const handleChat = () => {
    onClose();
    onOpenChat();
  };

  // ── Seconds remaining label ──────────────────────────────────
  const secondsLeft = Math.ceil((progress / 100) * (CHALLENGE_DURATION_MS / 1000));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

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
        <div className={`h-20 relative flex items-end px-5 pb-2 ${
          friend.isOnline
            ? isInRoom
              ? 'bg-gradient-to-r from-purple-600/20 via-purple-500/10 to-purple-600/20'
              : 'bg-gradient-to-r from-casino-emerald/20 via-casino-gold/10 to-casino-emerald/20'
            : 'bg-gradient-to-r from-gray-700/20 via-gray-600/10 to-gray-700/20'
        }`}>
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 10px)" }}
          />
          <span className={`relative text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-full ${
            friend.isOnline
              ? isInRoom
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-casino-emerald/20 text-casino-emerald border border-casino-emerald/30'
              : 'bg-gray-700/30 text-gray-500 border border-gray-600/30'
          }`}>
            {friend.isOnline ? (isInRoom ? '🎮 En partida' : '🟢 En línea') : '⚫ Desconectado'}
          </span>
        </div>

        {/* Avatar */}
        <div className="flex justify-center -mt-10 relative z-10">
          <div className="relative">
            <div className={`w-20 h-20 rounded-2xl bg-casino-surface-light flex items-center justify-center text-2xl font-black border-4 border-casino-bg shadow-xl overflow-hidden ${
              isHighElo ? 'text-casino-gold' : 'text-gray-300'
            }`}>
              {friend.avatar_url ? (
                <img src={friend.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                friend.username.charAt(0).toUpperCase()
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-casino-bg ${
              friend.isOnline
                ? isInRoom ? 'bg-purple-500' : 'bg-casino-emerald'
                : 'bg-gray-600'
            }`} />
          </div>
        </div>

        {/* Player Info */}
        <div className="px-6 pt-3 pb-5 space-y-4">
          <div className="text-center">
            <h3 className={`text-lg font-bold ${isHighElo ? 'text-casino-gold' : 'text-white'}`}>
              {friend.username}
            </h3>
            <div className={`inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full text-xs font-semibold ${div.cssClass}`}>
              {div.icon} {div.label}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Nivel" value={`${friend.level}`} icon="⭐" />
            <StatBox label="ELO" value={`${friend.elo}`} icon="🏆" />
            <StatBox label="XP" value={friend.xp >= 1000 ? `${(friend.xp / 1000).toFixed(1)}k` : `${friend.xp}`} icon="✨" />
          </div>

          <div className="glass-panel px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs">Récord (W/L)</span>
              <span className="text-white text-sm font-bold">{friend.wins}W / {friend.losses}L</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-casino-emerald to-emerald-400"
                  style={{ width: `${winRate}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${winRate >= 50 ? 'text-casino-emerald' : 'text-red-400'}`}>
                {winRate}%
              </span>
            </div>
          </div>

          {/* Action Zone */}
          {!friend.isOnline && (
            <div className="py-3 rounded-xl text-center text-sm text-gray-500 bg-white/[0.02] border border-white/5">
              ⚫ Jugador desconectado
            </div>
          )}

          {friend.isOnline && isInRoom && (
            <div className="py-3 rounded-xl text-center bg-purple-500/10 border border-purple-500/20 space-y-1">
              <p className="text-purple-400 font-bold text-sm">🎮 En partida activa</p>
              <p className="text-gray-500 text-xs">Podrás desafiarle cuando termine</p>
            </div>
          )}

          {friend.isOnline && !isInRoom && (
            <div className="space-y-3">
              {challengeState === 'idle' && (
                <div className="flex gap-3">
                  <button
                    onClick={handleChat}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white font-bold text-sm border border-white/10 hover:border-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                  </button>
                  <button
                    onClick={handleChallenge}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-casino-gold to-yellow-500 text-black font-bold text-sm hover:from-yellow-400 hover:to-casino-gold transition-all active:scale-[0.98] shadow-lg shadow-casino-gold/20 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m18 16 4-4-4-4M6 8l-4 4 4 4m8.5-12-5 16" />
                    </svg>
                    Desafiar
                  </button>
                </div>
              )}

              {challengeState === 'waiting' && (
                <div className="space-y-3">
                  <div className="glass-panel p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-white text-sm font-bold">⏳ Esperando respuesta...</p>
                      <span className={`text-sm font-mono font-bold tabular-nums ${
                        secondsLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-casino-gold'
                      }`}>
                        {secondsLeft}s
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          secondsLeft <= 10
                            ? 'bg-gradient-to-r from-red-500 to-red-400'
                            : 'bg-gradient-to-r from-casino-gold to-yellow-400'
                        }`}
                        style={{ width: `${progress}%`, transition: 'width 0.25s linear' }}
                      />
                    </div>
                    <p className="text-gray-500 text-xs text-center">
                      Invitación enviada a <span className="text-gray-300">{friend.username}</span>
                    </p>
                  </div>
                  <button
                    onClick={handleCancelChallenge}
                    className="w-full py-2 rounded-xl bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 font-bold text-xs border border-white/10 hover:border-red-500/20 transition-all"
                  >
                    Cancelar desafío
                  </button>
                </div>
              )}

              {challengeState === 'accepted' && (
                <div className="py-3 rounded-xl text-center bg-casino-emerald/10 border border-casino-emerald/30 animate-pulse">
                  <p className="text-casino-emerald font-bold text-sm">🎮 ¡Desafío aceptado! Entrando...</p>
                </div>
              )}

              {challengeState === 'expired' && (
                <div className="space-y-2">
                  <div className="py-3 rounded-xl text-center bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 font-bold text-sm">⏱ Sin respuesta</p>
                    <p className="text-gray-500 text-xs mt-0.5">El desafío ha expirado</p>
                  </div>
                  <button
                    onClick={() => { setChallengeState('idle'); setInvitationId(null); }}
                    className="w-full py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white text-xs font-bold border border-white/10 transition-all"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              )}
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
