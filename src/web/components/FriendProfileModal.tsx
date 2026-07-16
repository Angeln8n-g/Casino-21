import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

const PRESET_MESSAGES = [
  { emoji: '⚔️', text: '¡Hey, jugamos!' },
  { emoji: '🔥', text: '¿Te soportas una partida?' },
  { emoji: '🏆', text: '¿Tienes miedo o qué?' },
  { emoji: '🎲', text: 'Una rápida, ¿qué dices?' },
  { emoji: '💪', text: 'Vamos a ver quién es mejor' },
  { emoji: '🤝', text: '¿Partida amigable?' }
];

export function FriendProfileModal({ friend, onClose, onOpenChat }: FriendProfileModalProps) {
  const { user } = useAuth();
  const div = getDivisionFromElo(friend.elo);
  const totalGames = friend.wins + friend.losses;
  const winRate = totalGames > 0 ? Math.round((friend.wins / totalGames) * 100) : 0;
  const isHighElo = friend.elo >= 1500;
  const isInRoom = !!friend.roomId;

  // ── Challenge state ───────────────────────────────────────────
  const [challengeState, setChallengeState] = useState<'idle' | 'waiting' | 'accepted' | 'expired' | 'rejected'>('idle');
  const [progress, setProgress] = useState(100); // 100% → 0% over 60s
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [challengeRoomId, setChallengeRoomId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState(PRESET_MESSAGES[0].text);
  const [challengeDuration, setChallengeDuration] = useState(CHALLENGE_DURATION_MS);
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

  const startCountdown = (invId: string, roomId: string, expiresAt?: string) => {
    const expiresTime = expiresAt ? new Date(expiresAt).getTime() : Date.now() + CHALLENGE_DURATION_MS;
    const duration = expiresTime - Date.now();
    setChallengeDuration(duration);

    startTimeRef.current = Date.now();
    setProgress(100);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remainingPct = Math.max(0, 100 - (elapsed / duration) * 100);
      
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
      
      const { invitationId, roomId, expiresAt } = await new Promise<{ invitationId: string; roomId: string; expiresAt?: string }>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout creating challenge")), 10000);
        socket.once('challenge_sent', ({ roomId, invitationId, expiresAt }: { roomId: string; invitationId: string; expiresAt?: string }) => {
          clearTimeout(timeout);
          resolve({ invitationId, roomId, expiresAt });
        });
        socket.emit('send_challenge', {
          receiverId: friend.id,
          playerName,
          betAmount: 0,
          challengeMessage: !friend.isOnline ? selectedMessage : undefined
        });
      });

      setInvitationId(invitationId);
      setChallengeRoomId(roomId);

      startCountdown(invitationId, roomId, expiresAt);

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
            } else if (payload.new.status === 'rejected') {
              if (timerRef.current) clearInterval(timerRef.current);
              setChallengeState('rejected');
              closeChallengeRoom(roomId, 'challenge_rejected');
              setChallengeRoomId(null);
              supabase.removeChannel(channel);
            } else if (payload.new.status === 'cancelled' || payload.new.status === 'expired') {
              if (timerRef.current) clearInterval(timerRef.current);
              setChallengeState('expired');
              closeChallengeRoom(roomId, 'challenge_expired');
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
  const secondsLeft = Math.ceil((progress / 100) * (challengeDuration / 1000));

  const formatTimeLeft = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  const content = (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      <div
        className={`relative w-full max-w-sm rounded-3xl border border-[#2A2722] overflow-hidden shadow-2xl transition-all duration-300 bg-[#1A1815] ${
          showChat ? 'h-[550px] max-h-[85vh] flex flex-col' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.85), 0 0 50px rgba(250,204,21,0.05)',
        }}
      >
        {/* Close button - only absolute when NOT in chat, otherwise chat header handles it */}
        {!showChat && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-gray-400 hover:text-white transition-all z-20 border border-white/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {showChat ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#0F0E0C] border-b border-[#2A2722] shrink-0 min-h-[56px] pr-12">
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
                <div className="w-8 h-8 rounded-full bg-[#1A1815] flex items-center justify-center text-xs font-bold text-gray-400 shrink-0 border border-white/5 overflow-hidden">
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

              {/* Close Button in Chat view */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all z-20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-hidden p-4 pt-2 bg-[#1A1815]">
              <ChatWindow receiverId={friend.id} />
            </div>
          </div>
        ) : (
          <>
            {/* Avatar Image Area (Styled like Store Card Preview) */}
            <div className="relative w-full aspect-square overflow-hidden flex items-center justify-center bg-[#0F0E0C] shrink-0 border-b border-[#2A2722]">
              {/* Status Badge Over Image */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0F0E0C]/80 backdrop-blur-md border border-[#2A2722]">
                <div className={`w-2 h-2 rounded-full ${
                  friend.isOnline
                    ? isInRoom ? 'bg-purple-500 animate-pulse' : 'bg-casino-emerald'
                    : 'bg-gray-500'
                }`} />
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-300 select-none">
                  {friend.isOnline ? (isInRoom ? 'En partida' : 'En línea') : 'Desconectado'}
                </span>
              </div>

              {friend.equipped_avatar ? (
                <img 
                  src={friend.equipped_avatar} 
                  alt="Avatar" 
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-8xl font-black text-casino-gold bg-[#1A1815]">${friend.username.charAt(0).toUpperCase()}</div>`;
                  }}
                />
              ) : friend.avatar_url ? (
                <img 
                  src={friend.avatar_url} 
                  alt="Avatar" 
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-8xl font-black text-casino-gold bg-[#1A1815]">${friend.username.charAt(0).toUpperCase()}</div>`;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl font-black text-casino-gold bg-[#1A1815] transition-transform duration-700 hover:scale-110">
                  {friend.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Player Info */}
            <div className="p-6 space-y-6">
              {/* Identity Header */}
              <div className="flex flex-col">
                <span className="text-[10px] text-[#A78BFA] uppercase tracking-widest font-black mb-1">
                  AMIGO
                </span>
                <h3 className={`text-2xl font-display font-black leading-none ${isHighElo ? 'text-casino-gold' : 'text-white'}`}>
                  {friend.username}
                </h3>
                <div className="flex mt-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[9px] font-black uppercase tracking-wider bg-[#0F0E0C]/80 ${div.cssClass.replace('division-', 'border-').replace('text-', '')}`}>
                    {div.icon} {div.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Nivel" value={`${friend.level}`} icon="⭐" />
                <StatBox label="ELO" value={`${friend.elo}`} icon="🏆" />
                <StatBox label="XP" value={friend.xp >= 1000 ? `${(friend.xp / 1000).toFixed(1)}k` : `${friend.xp}`} icon="✨" />
              </div>

              <div className="bg-[#0F0E0C] border border-[#2A2722] p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Récord (W/L)</span>
                  <span className="text-white text-sm font-bold">{friend.wins}W / {friend.losses}L</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-black/60 overflow-hidden border border-[#2A2722]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-casino-emerald to-emerald-400"
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${winRate >= 50 ? 'text-casino-emerald animate-pulse' : 'text-red-400'}`}>
                    {winRate}% WR
                  </span>
                </div>
              </div>

              {/* Action Zone */}
              {!friend.isOnline && (
                <div className="space-y-4">
                  {challengeState === 'idle' && (
                    <>
                      {/* Selector de mensaje pre-configurado */}
                      <div className="text-left space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                          Mensaje de Invitación (Push)
                        </label>
                        <div className="relative">
                          <select
                            value={selectedMessage}
                            onChange={(e) => setSelectedMessage(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#0F0E0C] border border-[#2A2722] text-white text-xs font-medium focus:outline-none focus:border-casino-gold/50 appearance-none cursor-pointer"
                          >
                            {PRESET_MESSAGES.map((msg) => (
                              <option key={msg.text} value={msg.text} className="bg-[#0F0E0C]">
                                {msg.emoji} {msg.text}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-[10px]">
                            ▼
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleChat}
                          className="flex-1 py-2.5 rounded-2xl bg-[#0F0E0C] border border-[#2A2722] text-gray-300 hover:bg-[#1A1815] transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Chat
                        </button>
                        <button
                          onClick={handleChallenge}
                          className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-casino-gold to-yellow-500 text-black hover:from-yellow-400 hover:to-casino-gold transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.3)] border border-transparent"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m18 16 4-4-4-4M6 8l-4 4 4 4m8.5-12-5 16" />
                          </svg>
                          Invitar
                        </button>
                      </div>
                    </>
                  )}

                  {challengeState === 'waiting' && (
                    <div className="space-y-3">
                      <div className="bg-[#0F0E0C] border border-[#2A2722] p-4 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-white text-xs font-bold">⏳ Esperando oponente...</p>
                          <span className={`text-xs font-mono font-bold tabular-nums ${
                            secondsLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-casino-gold'
                          }`}>
                            {formatTimeLeft(secondsLeft)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-black/60 overflow-hidden border border-[#2A2722]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              secondsLeft <= 10
                                ? 'bg-gradient-to-r from-red-500 to-red-400'
                                : 'bg-gradient-to-r from-casino-gold to-yellow-400'
                            }`}
                            style={{ width: `${progress}%`, transition: 'width 0.25s linear' }}
                          />
                        </div>
                        <p className="text-gray-500 text-[10px] text-center">
                          Invitación push enviada a <span className="text-gray-300">{friend.username}</span>
                        </p>
                      </div>
                      <button
                        onClick={handleCancelChallenge}
                        className="w-full py-2.5 rounded-2xl bg-red-950/10 border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500/20 font-bold text-xs uppercase tracking-widest transition-all"
                      >
                        Cancelar invitación
                      </button>
                    </div>
                  )}

                  {challengeState === 'accepted' && (
                    <div className="py-3 rounded-xl text-center bg-casino-emerald/10 border border-casino-emerald/30 animate-pulse">
                      <p className="text-casino-emerald font-bold text-sm">🎮 ¡Invitación aceptada! Entrando...</p>
                    </div>
                  )}

                  {challengeState === 'expired' && (
                    <div className="space-y-2">
                      <div className="py-3 rounded-xl text-center bg-red-500/10 border border-red-500/20">
                        <p className="text-red-400 font-bold text-sm">⏱ Sin respuesta</p>
                        <p className="text-gray-500 text-xs mt-0.5">La invitación ha expirado</p>
                      </div>
                      <button
                        onClick={() => { setChallengeState('idle'); setInvitationId(null); }}
                        className="w-full py-2.5 rounded-2xl bg-[#0F0E0C] border border-[#2A2722] text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        Intentar de nuevo
                      </button>
                    </div>
                  )}

                  {challengeState === 'rejected' && (
                    <div className="space-y-2">
                      <div className="py-3 rounded-xl text-center bg-red-500/10 border border-red-500/20">
                        <p className="text-red-400 font-bold text-sm">❌ Invitación rechazada</p>
                        <p className="text-gray-500 text-xs mt-0.5">El jugador ha rechazado la partida</p>
                      </div>
                      <button
                        onClick={() => { setChallengeState('idle'); setInvitationId(null); }}
                        className="w-full py-2.5 rounded-2xl bg-[#0F0E0C] border border-[#2A2722] text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        Intentar de nuevo
                      </button>
                    </div>
                  )}
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
                    className="w-full py-2.5 rounded-2xl bg-[#0F0E0C] border border-[#2A2722] text-gray-300 hover:bg-[#1A1815] transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
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
                        className="flex-1 py-2.5 rounded-2xl bg-[#0F0E0C] border border-[#2A2722] text-gray-300 hover:bg-[#1A1815] transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat
                      </button>
                      <button
                        onClick={handleChallenge}
                        className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-casino-gold to-yellow-500 text-black hover:from-yellow-400 hover:to-casino-gold transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.3)] border border-transparent"
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
                      <div className="bg-[#0F0E0C] border border-[#2A2722] p-4 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-white text-xs font-bold">⏳ Esperando respuesta...</p>
                          <span className={`text-xs font-mono font-bold tabular-nums ${
                            secondsLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-casino-gold'
                          }`}>
                            {formatTimeLeft(secondsLeft)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-black/60 overflow-hidden border border-[#2A2722]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              secondsLeft <= 10
                                ? 'bg-gradient-to-r from-red-500 to-red-400'
                                : 'bg-gradient-to-r from-casino-gold to-yellow-400'
                            }`}
                            style={{ width: `${progress}%`, transition: 'width 0.25s linear' }}
                          />
                        </div>
                        <p className="text-gray-500 text-[10px] text-center">
                          Invitación enviada a <span className="text-gray-300">{friend.username}</span>
                        </p>
                      </div>
                      <button
                        onClick={handleCancelChallenge}
                        className="w-full py-2.5 rounded-2xl bg-red-950/10 border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500/20 font-bold text-xs uppercase tracking-widest transition-all"
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
                        className="w-full py-2.5 rounded-2xl bg-[#0F0E0C] border border-[#2A2722] text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        Intentar de nuevo
                      </button>
                    </div>
                  )}

                  {challengeState === 'rejected' && (
                    <div className="space-y-2">
                      <div className="py-3 rounded-xl text-center bg-red-500/10 border border-red-500/20">
                        <p className="text-red-400 font-bold text-sm">❌ Desafío rechazado</p>
                        <p className="text-gray-500 text-xs mt-0.5">El jugador ha rechazado la partida</p>
                      </div>
                      <button
                        onClick={() => { setChallengeState('idle'); setInvitationId(null); }}
                        className="w-full py-2.5 rounded-2xl bg-[#0F0E0C] border border-[#2A2722] text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
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

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}


function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-[#0F0E0C] border border-[#2A2722] p-3 text-center rounded-2xl flex flex-col items-center">
      <span className="text-sm mb-1">{icon}</span>
      <span className="text-white font-bold text-sm leading-none tabular-nums">{value}</span>
      <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider mt-1.5">{label}</span>
    </div>
  );
}
