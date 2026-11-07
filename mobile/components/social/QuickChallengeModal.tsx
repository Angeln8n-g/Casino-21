import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { X, Swords } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { socketService } from '../../services/socket';
import { useAuth } from '../../hooks/useAuth';
import { useGame } from '../../hooks/useGame';
import { triggerHaptic } from '../../utils/haptics';
import { FriendData, resolveAvatarUrl } from './socialUtils';

const BET_OPTIONS = [0, 50, 100, 250, 500];

interface QuickChallengeModalProps {
  friend: FriendData | null;
  senderName: string;
  onClose: () => void;
}

export function QuickChallengeModal({
  friend,
  senderName,
  onClose,
}: QuickChallengeModalProps) {
  const { user, profile } = useAuth();
  const { gameState } = useGame();
  const userCoins = profile?.coins ?? 0;

  const [betAmount, setBetAmount] = useState<number>(0);
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'waiting' | 'accepted' | 'rejected' | 'expired' | 'error'
  >('idle');
  const [countdown, setCountdown] = useState(60);
  const [errorMsg, setErrorMsg] = useState('');
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const socketCleanupRef = useRef<(() => void) | null>(null);

  const cleanupSubscriptions = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (socketCleanupRef.current) {
      socketCleanupRef.current();
      socketCleanupRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (friend) {
      setBetAmount(0);
      setStatus('idle');
      setCountdown(60);
      setErrorMsg('');
      setInvitationId(null);
      setRoomId(null);
    } else {
      cleanupSubscriptions();
    }
    return () => {
      cleanupSubscriptions();
    };
  }, [friend?.id, cleanupSubscriptions]);

  const closeChallengeRoom = useCallback(
    async (
      targetRoomId?: string | null,
      reason: 'challenge_cancelled' | 'challenge_rejected' | 'challenge_expired' = 'challenge_cancelled'
    ) => {
      if (!targetRoomId) return;
      try {
        const socket = await socketService.connect();
        socket.emit('cancel_room', { roomId: targetRoomId, reason });
      } catch {}
    },
    []
  );

  // Cerrar el modal inmediatamente si la partida ya arrancó en segundo plano
  useEffect(() => {
    if (friend && gameState && (gameState.phase === 'playing' || gameState.phase === 'scoring')) {
      cleanupSubscriptions();
      onClose();
    }
  }, [friend, gameState?.phase, cleanupSubscriptions, onClose]);

  const startCountdown = useCallback(
    (expiresAtIso: string, invId?: string, createdRoomId?: string) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const end = new Date(expiresAtIso).getTime();

      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus((curr) => (curr === 'waiting' ? 'expired' : curr));
          if (invId) {
            supabase.from('game_invitations').update({ status: 'expired' }).eq('id', invId).then(() => {});
          }
          if (createdRoomId) {
            closeChallengeRoom(createdRoomId, 'challenge_expired');
          }
        }
      }, 1000);
    },
    [closeChallengeRoom]
  );

  const handleChallenge = async () => {
    if (!friend) return;
    triggerHaptic('light');
    setStatus('sending');
    setErrorMsg('');

    const resolvedPlayerName = (
      senderName?.trim() ||
      profile?.username?.trim() ||
      user?.user_metadata?.username?.trim() ||
      user?.email?.split('@')[0]?.trim() ||
      'Jugador'
    ).slice(0, 30);

    try {
      const socket = await socketService.connect();

      const onSent = (data: { roomId: string; invitationId: string; expiresAt: string }) => {
        socket.off('challenge_sent', onSent);
        socket.off('error', onErr);

        setRoomId(data.roomId);
        setInvitationId(data.invitationId);
        setStatus('waiting');
        startCountdown(data.expiresAt, data.invitationId, data.roomId);

        const onAcceptedSocket = (payload: { invitationId?: string }) => {
          if (payload?.invitationId && payload.invitationId !== data.invitationId) return;
          setStatus('accepted');
          setRoomId(null);
          if (timerRef.current) clearInterval(timerRef.current);
          triggerHaptic('success');
          setTimeout(() => onClose(), 800);
        };

        const onRejectedSocket = (payload: { invitationId?: string }) => {
          if (payload?.invitationId && payload.invitationId !== data.invitationId) return;
          setStatus('rejected');
          setRoomId(null);
          if (timerRef.current) clearInterval(timerRef.current);
          triggerHaptic('error');
        };

        socket.on('challenge_accepted', onAcceptedSocket);
        socket.on('challenge_rejected', onRejectedSocket);
        socketCleanupRef.current = () => {
          socket.off('challenge_accepted', onAcceptedSocket);
          socket.off('challenge_rejected', onRejectedSocket);
        };

        if (data.invitationId) {
          const ch = supabase
            .channel(`quick_challenge_mobile_${data.invitationId}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_invitations',
                filter: `id=eq.${data.invitationId}`,
              },
              (payload) => {
                const st = payload.new.status;
                if (st === 'accepted') {
                  setStatus('accepted');
                  setRoomId(null);
                  if (timerRef.current) clearInterval(timerRef.current);
                  triggerHaptic('success');
                  setTimeout(() => onClose(), 800);
                } else if (st === 'rejected') {
                  setStatus('rejected');
                  closeChallengeRoom(data.roomId, 'challenge_rejected');
                  setRoomId(null);
                  if (timerRef.current) clearInterval(timerRef.current);
                  triggerHaptic('error');
                } else if (st === 'expired' || st === 'cancelled') {
                  setStatus('expired');
                  closeChallengeRoom(data.roomId, 'challenge_expired');
                  setRoomId(null);
                  if (timerRef.current) clearInterval(timerRef.current);
                }
              }
            )
            .subscribe();
          channelRef.current = ch;
        }
      };

      const onErr = (msg: string) => {
        socket.off('challenge_sent', onSent);
        socket.off('error', onErr);
        socketCleanupRef.current = null;
        setStatus('error');
        setErrorMsg(typeof msg === 'string' ? msg : 'Error al enviar el desafío');
      };

      socketCleanupRef.current = () => {
        socket.off('challenge_sent', onSent);
        socket.off('error', onErr);
      };

      socket.on('challenge_sent', onSent);
      socket.on('error', onErr);

      socket.emit('send_challenge', {
        receiverId: friend.id,
        playerName: resolvedPlayerName,
        betAmount,
      });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message || 'Error conectando al servidor');
    }
  };

  const handleCancel = async () => {
    triggerHaptic('light');
    if (status === 'waiting') {
      if (invitationId) {
        await supabase
          .from('game_invitations')
          .update({ status: 'cancelled' })
          .eq('id', invitationId);
      }
      await closeChallengeRoom(roomId, 'challenge_cancelled');
    }
    cleanupSubscriptions();
    onClose();
  };

  if (!friend) return null;

  const avatarUri = resolveAvatarUrl(friend.equipped_avatar || friend.avatar_url);

  return (
    <Modal visible={Boolean(friend)} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable
        onPress={status === 'waiting' ? undefined : handleCancel}
        className="flex-1 bg-black/85 justify-center items-center px-4"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-xs rounded-2xl border border-white/[0.1] bg-slate-950 p-5 shadow-2xl"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2.5 flex-1 pr-2">
              <View className="w-9 h-9 rounded-full bg-slate-900 border border-white/10 items-center justify-center overflow-hidden">
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <Text className="text-sm font-black text-amber-400">
                    {friend.username?.charAt(0).toUpperCase() || 'J'}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="text-sm font-black text-white">
                  {friend.username}
                </Text>
                <Text className="text-[10px] text-gray-500 font-semibold">{friend.elo} ELO</Text>
              </View>
            </View>
            <Pressable
              onPress={handleCancel}
              className="w-7 h-7 rounded-full bg-white/5 border border-white/10 items-center justify-center"
            >
              <X color="#d1d5db" size={14} />
            </Pressable>
          </View>

          {status === 'idle' || status === 'error' ? (
            <>
              <View className="mb-4">
                <Text className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2 text-center">
                  Apuesta de Monedas
                </Text>
                <View className="flex-row flex-wrap gap-1.5 justify-center">
                  {BET_OPTIONS.map((amount) => {
                    const disabled = amount > 0 && userCoins < amount;
                    const selected = betAmount === amount;
                    return (
                      <Pressable
                        key={amount}
                        disabled={disabled}
                        onPress={() => {
                          triggerHaptic('light');
                          setBetAmount(amount);
                        }}
                        className={`px-3 py-1.5 rounded-lg border ${
                          selected
                            ? 'bg-amber-400 border-amber-400'
                            : 'bg-black/40 border-white/10'
                        } ${disabled ? 'opacity-30' : ''}`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            selected ? 'text-slate-950 font-black' : 'text-gray-300'
                          }`}
                        >
                          {amount === 0 ? 'Gratis' : `${amount} 🪙`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text className="text-[10px] text-gray-500 mt-2 text-center">
                  Tu saldo:{' '}
                  <Text className="text-amber-400 font-bold">{userCoins} 🪙</Text>
                </Text>
              </View>

              {status === 'error' ? (
                <View className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <Text className="text-red-400 text-xs text-center font-semibold">
                    {errorMsg}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleChallenge}
                className="w-full py-3 rounded-xl bg-amber-400 active:bg-amber-300 items-center justify-center flex-row gap-2"
              >
                <Swords color="#020617" size={16} />
                <Text className="text-slate-950 font-black text-sm">
                  {betAmount > 0 ? `¡Desafiar por ${betAmount} 🪙!` : '¡Desafiar!'}
                </Text>
              </Pressable>
            </>
          ) : null}

          {status === 'sending' ? (
            <View className="py-6 items-center gap-2">
              <ActivityIndicator color="#fbbf24" />
              <Text className="text-amber-400 text-xs font-bold">Creando sala...</Text>
            </View>
          ) : null}

          {status === 'waiting' ? (
            <View className="gap-3">
              <View className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-xs font-bold text-amber-400">
                    ⏳ Esperando respuesta...
                  </Text>
                  <Text className="text-xs font-mono font-bold text-amber-400">
                    {countdown}s
                  </Text>
                </View>
                <View className="h-1 bg-black/50 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${(countdown / 60) * 100}%` }}
                  />
                </View>
              </View>

              <Pressable
                onPress={handleCancel}
                className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 items-center"
              >
                <Text className="text-gray-300 text-xs font-bold">Cancelar</Text>
              </Pressable>
            </View>
          ) : null}

          {status === 'accepted' ? (
            <View className="py-4 items-center">
              <Text className="text-emerald-400 font-bold text-sm">
                🎉 ¡Aceptó! Iniciando partida...
              </Text>
            </View>
          ) : null}

          {status === 'rejected' ? (
            <View className="gap-3">
              <Text className="text-red-400 font-bold text-sm text-center py-2">
                😔 Rechazó el desafío
              </Text>
              <Pressable
                onPress={onClose}
                className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 items-center"
              >
                <Text className="text-gray-300 text-xs font-bold">Cerrar</Text>
              </Pressable>
            </View>
          ) : null}

          {status === 'expired' ? (
            <View className="gap-3">
              <Text className="text-gray-400 font-bold text-sm text-center py-2">
                ⏰ El desafío expiró
              </Text>
              <Pressable
                onPress={() => {
                  setStatus('idle');
                  setCountdown(60);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-400 active:bg-amber-300 items-center"
              >
                <Text className="text-slate-950 text-xs font-black">Reintentar</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
