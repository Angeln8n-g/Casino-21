import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { getDivisionFromElo } from './ProfileHeader';
import { socketService } from '../services/socket';
import { ChatWindow } from './ChatWindow';

export interface FriendForModal {
  id: string;
  username: string;
  avatar_url?: string | null;
  equipped_avatar?: string | null;
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
  const [challengeRoomId, setChallengeRoomId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const closeChallengeRoom = async (roomId?: string | null, reason: 'challenge_cancelled' | 'challenge_rejected' | 'challenge_expired' = 'challenge_cancelled') => {
    if (!roomId) return;
    try {
      const socket = await socketService.connect();
      socket.emit('cancel_room', { roomId, reason });
    } catch (err) {
      console.warn('No se pudo cerrar la sala del desafío:', err);
    }
  };

  const startCountdown = (invId: string, roomId: string) => {
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
        supabase.from('game_invitations').update({ status: 'expired' }).eq('id', invId).then(() => {});
        closeChallengeRoom(roomId, 'challenge_expired');
      }
    }, 250);
  };

  const handleChallenge = async () => {
    if (!user) return;
    setChallengeState('waiting');

    try {
      const socket = await socketService.connect();
      const playerName = user.user_metadata?.username || user.email?.split('@')[0] || 'Jugador';
      
      const { invitationId, roomId } = await new Promise<{ invitationId: string; roomId: string }>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout creating challenge")), 10000);
        socket.once('challenge_sent', ({ roomId, invitationId }: { roomId: string; invitationId: string }) => {
          clearTimeout(timeout);
          resolve({ invitationId, roomId });
        });
        socket.emit('send_challenge', {
          receiverId: friend.id,
          playerName,
          betAmount: 0
        });
      });

      setInvitationId(invitationId);
      setChallengeRoomId(roomId);

      startCountdown(invitationId, roomId);

      const channel = supabase
        .channel(`invitation_${invitationId}_${Math.random()}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'game_invitations', filter: `id=eq.${invitationId}` },
          (payload) => {
            if (payload.new.status === 'accepted') {
              if (timerRef.current) clearInterval(timerRef.current);
              setChallengeState('accepted');
              setChallengeRoomId(null);
              supabase.removeChannel(channel);
              setTimeout(() => {
                onClose();
              }, 1250);
            } else if (payload.new.status === 'rejected' || payload.new.status === 'cancelled' || payload.new.status === 'expired') {
              if (timerRef.current) clearInterval(timerRef.current);
              setChallengeState('expired');
              closeChallengeRoom(roomId, payload.new.status === 'rejected' ? 'challenge_rejected' : 'challenge_expired');
              setChallengeRoomId(null);
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
    await closeChallengeRoom(challengeRoomId, 'challenge_cancelled');
    setChallengeState('idle');
    setInvitationId(null);
    setChallengeRoomId(null);
  };

  const [showChat, setShowChat] = useState(false);

  const handleChat = () => {
    setShowChat(true);
  };

  // ── Seconds remaining label ──────────────────────────────────
  const secondsLeft = Math.ceil((progress / 100) * (CHALLENGE_DURATION_MS / 1000));

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className={`relative w-full max-w-sm rounded-2xl border border-white/[0.08] overflow-hidden animate-fade-in transition-all duration-300 ${
          showChat ? 'h-[550px] max-h-[85vh] flex flex-col' : ''
        }`}
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

        {showChat ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-black/40 border-b border-white/5 shrink-0 min-h-[56px] pr-12">
              <button
                onClick={() => setShowChat(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                title="Volver al perfil"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>

              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-casino-surface-light flex items-center justify-center text-xs font-bold text-gray-400 shrink-0 border border-white/5 overflow-hidden">
                  {friend.equipped_avatar ? (
                    <img src={friend.equipped_avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : friend.avatar_url ? (
                    <img src={friend.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    friend.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0B101A] transition-colors shadow-sm ${
                  friend.isOnline
                    ? isInRoom ? 'bg-purple-500' : 'bg-casino-emerald'
                    : 'bg-gray-600'
                }`} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{friend.username}</p>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                  {friend.isOnline ? (isInRoom ? 'En partida' : 'En línea') : 'Desconectado'}
                </p>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-hidden p-4 pt-2">
              <ChatWindow receiverId={friend.id} />
            </div>
          </div>
        ) : (
          <>
            {/* Large Full-Width Avatar Cover */}
            <div className="w-full h-52 relative overflow-hidden bg-slate-900 border-b border-white/[0.05]">
              {friend.equipped_avatar ? (
                <img 
                  src={friend.equipped_avatar} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-5xl font-black text-casino-gold">${friend.username.charAt(0).toUpperCase()}</div>`;
                  }}
                />
              ) : friend.avatar_url ? (
                <img 
                  src={friend.avatar_url} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-5xl font-black text-casino-gold">${friend.username.charAt(0).toUpperCase()}</div>`;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl font-black text-casino-gold bg-casino-surface-light">
                  {friend.username.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Cover Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-black/35 pointer-events-none" />

              {/* Status Badge */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                <div className={`w-2 h-2 rounded-full ${
                  friend.isOnline
                    ? isInRoom ? 'bg-purple-500 animate-pulse' : 'bg-casino-emerald'
                    : 'bg-gray-500'
                }`} />
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-300 select-none">
                  {friend.isOnline ? (isInRoom ? 'En partida' : 'En línea') : 'Desconectado'}
                </span>
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
                <div className="space-y-3">
                  <div className="py-3 rounded-xl text-center text-sm text-gray-500 bg-white/[0.02] border border-white/5">
                    ⚫ Jugador desconectado
                  </div>
                  <button
                    onClick={handleChat}
                    className="w-full py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white font-bold text-sm border border-white/10 hover:border-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                  </button>
                </div>
              )}

              {friend.isOnline && isInRoom && (
                <div className="space-y-3">
                  <div className="py-3 rounded-xl text-center bg-purple-500/10 border border-purple-500/20 space-y-1">
                    <p className="text-purple-400 font-bold text-sm">🎮 En partida activa</p>
                    <p className="text-gray-500 text-xs">Podrás desafiarle cuando termine</p>
                  </div>
                  <button
                    onClick={handleChat}
                    className="w-full py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white font-bold text-sm border border-white/10 hover:border-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                  </button>
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
          </>
        )}
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
