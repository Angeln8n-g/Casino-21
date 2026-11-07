import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { X, MessageCircle, Swords, Eye, Trash2, Send } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { socketService } from '../../services/socket';
import { useAuth } from '../../hooks/useAuth';
import { useGame } from '../../hooks/useGame';
import { appEvents } from '../../utils/events';
import { triggerHaptic } from '../../utils/haptics';
import {
  FriendData,
  resolveAvatarUrl,
  getDivisionFromElo,
  calculateLevelFromXp,
} from './socialUtils';

const PRESET_MESSAGES = [
  '⚔️ ¡Hey, jugamos!',
  '🃏 ¿Echamos una partida rápida?',
  '🔥 ¡Te reto a un duelo de 21!',
  '🏆 ¡Ven a demostrar quién manda!',
  '👋 ¡Conéctate, te estoy esperando!',
];

interface FriendProfileModalProps {
  friend: FriendData | null;
  isOnline: boolean;
  isInRoom?: boolean;
  currentRoomId?: string | null;
  senderName: string;
  onClose: () => void;
  onOpenChat: (friend: FriendData) => void;
  onRemoveFriend?: (friend: FriendData) => void;
}

export function FriendProfileModal({
  friend,
  isOnline,
  isInRoom = false,
  currentRoomId = null,
  senderName,
  onClose,
  onOpenChat,
  onRemoveFriend,
}: FriendProfileModalProps) {
  const { user, profile } = useAuth();
  const { gameState } = useGame();
  const [challengeStatus, setChallengeStatus] = useState<
    'idle' | 'sending' | 'waiting' | 'accepted' | 'rejected' | 'expired' | 'error'
  >('idle');
  const [countdown, setCountdown] = useState(60);
  const [errorMsg, setErrorMsg] = useState('');
  const [presetMessage, setPresetMessage] = useState(PRESET_MESSAGES[0]);
  const [showPresets, setShowPresets] = useState(false);
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
      setChallengeStatus('idle');
      setCountdown(60);
      setErrorMsg('');
      setPresetMessage(PRESET_MESSAGES[0]);
      setShowPresets(false);
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
          setChallengeStatus((current) => (current === 'waiting' ? 'expired' : current));
          if (invId) {
            supabase
              .from('game_invitations')
              .update({ status: 'expired' })
              .eq('id', invId)
              .then(() => {});
          }
          if (createdRoomId) {
            closeChallengeRoom(createdRoomId, 'challenge_expired');
          }
        }
      }, 1000);
    },
    [closeChallengeRoom]
  );

  const handleSendChallenge = async (message?: string) => {
    if (!friend) return;
    triggerHaptic('light');
    setChallengeStatus('sending');
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

      const handleChallengeSent = (data: {
        roomId: string;
        invitationId: string;
        expiresAt: string;
      }) => {
        socket.off('challenge_sent', handleChallengeSent);
        socket.off('error', handleError);

        setRoomId(data.roomId);
        setInvitationId(data.invitationId);
        setChallengeStatus('waiting');
        startCountdown(data.expiresAt, data.invitationId, data.roomId);

        const onAcceptedSocket = (payload: { invitationId?: string }) => {
          if (payload?.invitationId && payload.invitationId !== data.invitationId) return;
          setChallengeStatus('accepted');
          setRoomId(null);
          if (timerRef.current) clearInterval(timerRef.current);
          triggerHaptic('success');
          setTimeout(() => {
            onClose();
          }, 800);
        };

        const onRejectedSocket = (payload: { invitationId?: string }) => {
          if (payload?.invitationId && payload.invitationId !== data.invitationId) return;
          setChallengeStatus('rejected');
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
          const channel = supabase
            .channel(`challenge_response_mobile_${data.invitationId}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_invitations',
                filter: `id=eq.${data.invitationId}`,
              },
              (payload) => {
                const newStatus = payload.new.status;
                if (newStatus === 'accepted') {
                  setChallengeStatus('accepted');
                  setRoomId(null);
                  if (timerRef.current) clearInterval(timerRef.current);
                  triggerHaptic('success');
                  setTimeout(() => {
                    onClose();
                  }, 800);
                } else if (newStatus === 'rejected') {
                  setChallengeStatus('rejected');
                  closeChallengeRoom(data.roomId, 'challenge_rejected');
                  setRoomId(null);
                  if (timerRef.current) clearInterval(timerRef.current);
                  triggerHaptic('error');
                } else if (newStatus === 'expired' || newStatus === 'cancelled') {
                  setChallengeStatus('expired');
                  closeChallengeRoom(data.roomId, 'challenge_expired');
                  setRoomId(null);
                  if (timerRef.current) clearInterval(timerRef.current);
                }
              }
            )
            .subscribe();

          channelRef.current = channel;
        }
      };

      const handleError = (msg: string) => {
        socket.off('challenge_sent', handleChallengeSent);
        socket.off('error', handleError);
        socketCleanupRef.current = null;
        setChallengeStatus('error');
        setErrorMsg(typeof msg === 'string' ? msg : 'Error al enviar invitación');
      };

      socketCleanupRef.current = () => {
        socket.off('challenge_sent', handleChallengeSent);
        socket.off('error', handleError);
      };

      socket.on('challenge_sent', handleChallengeSent);
      socket.on('error', handleError);

      socket.emit('send_challenge', {
        receiverId: friend.id,
        playerName: resolvedPlayerName,
        betAmount: 0,
        ...(message ? { challengeMessage: message } : {}),
      });
    } catch (err: any) {
      setChallengeStatus('error');
      setErrorMsg(err?.message || 'Error conectando al servidor');
    }
  };

  const handleCancelChallenge = async () => {
    triggerHaptic('light');
    if (challengeStatus === 'waiting') {
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

  const handleSpectate = () => {
    if (!currentRoomId) return;
    triggerHaptic('light');
    onClose();
    appEvents.emit('join_game_from_invite', {
      roomId: currentRoomId,
      isTournament: currentRoomId.toUpperCase().startsWith('T'),
      isSpectator: true,
    });
  };

  const handleConfirmRemove = () => {
    if (!friend || !onRemoveFriend) return;
    Alert.alert(
      'Eliminar amigo',
      `¿Seguro que deseas eliminar a ${friend.username} de tus amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            onClose();
            onRemoveFriend(friend);
          },
        },
      ]
    );
  };

  if (!friend) return null;

  const div = getDivisionFromElo(friend.elo || 1000);
  const level = calculateLevelFromXp(friend.xp || 0);
  const wins = friend.wins ?? 0;
  const losses = friend.losses ?? 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const avatarUri = resolveAvatarUrl(friend.equipped_avatar || friend.avatar_url);

  return (
    <Modal
      visible={Boolean(friend)}
      transparent
      animationType="fade"
      onRequestClose={handleCancelChallenge}
    >
      <Pressable
        onPress={challengeStatus === 'waiting' ? undefined : handleCancelChallenge}
        className="flex-1 bg-black/85 justify-center items-center px-4"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl border border-[#2A2722] bg-[#1A1815] overflow-hidden max-h-[90%]"
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero Avatar Area */}
            <View
              style={{ height: 220 }}
              className="w-full bg-[#0F0E0C] items-center justify-center relative border-b border-[#2A2722]"
            >
              {/* Division Badge */}
              <View
                className={`absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg border ${div.bgClass} ${div.borderClass}`}
              >
                <Text className={`text-[10px] font-black uppercase tracking-widest ${div.textClass}`}>
                  {div.icon} {div.label}
                </Text>
              </View>

              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <Text className="text-7xl font-black text-amber-400">
                  {friend.username?.charAt(0).toUpperCase() || 'J'}
                </Text>
              )}

              {/* Top-Right Controls: Remove Friend + Close */}
              <View className="absolute top-3 right-3 z-20 flex-row items-center gap-2">
                {onRemoveFriend && challengeStatus === 'idle' ? (
                  <Pressable
                    onPress={handleConfirmRemove}
                    className="w-8 h-8 rounded-full bg-red-950/75 border border-red-500/30 items-center justify-center"
                  >
                    <Trash2 color="#f87171" size={14} />
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={handleCancelChallenge}
                  className="w-8 h-8 rounded-full bg-black/60 border border-white/10 items-center justify-center"
                >
                  <X color="#d1d5db" size={16} />
                </Pressable>
              </View>
            </View>

            {/* Info Body */}
            <View className="p-5 gap-4">
              {/* Identity + Status */}
              <View>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[10px] text-purple-400 uppercase tracking-widest font-black">
                    AMIGO
                  </Text>
                  <View className="flex-row items-center gap-1.5 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/5">
                    <View
                      className={`w-2 h-2 rounded-full ${
                        isOnline && isInRoom
                          ? 'bg-purple-500'
                          : isOnline
                          ? 'bg-emerald-400'
                          : 'bg-gray-600'
                      }`}
                    />
                    <Text
                      className={`text-[10px] font-bold ${
                        isOnline && isInRoom
                          ? 'text-purple-400'
                          : isOnline
                          ? 'text-emerald-400'
                          : 'text-gray-500'
                      }`}
                    >
                      {isOnline && isInRoom
                        ? 'En partida'
                        : isOnline
                        ? 'En línea'
                        : 'Desconectado'}
                    </Text>
                  </View>
                </View>

                <Text className="text-2xl font-black text-white">{friend.username}</Text>
              </View>

              {/* Quick Stats Grid */}
              <View className="flex-row gap-2.5">
                <View className="flex-1 bg-[#0F0E0C] border border-[#2A2722] p-3 rounded-2xl items-center">
                  <Text className="text-[9px] text-gray-500 uppercase font-black tracking-wider">
                    Nivel
                  </Text>
                  <Text className="text-white font-black text-lg mt-0.5">{level}</Text>
                </View>
                <View className="flex-1 bg-[#0F0E0C] border border-[#2A2722] p-3 rounded-2xl items-center">
                  <Text className="text-[9px] text-gray-500 uppercase font-black tracking-wider">
                    ELO
                  </Text>
                  <Text className="text-amber-400 font-black text-lg mt-0.5">{friend.elo}</Text>
                </View>
                <View className="flex-1 bg-[#0F0E0C] border border-[#2A2722] p-3 rounded-2xl items-center">
                  <Text className="text-[9px] text-gray-500 uppercase font-black tracking-wider">
                    XP
                  </Text>
                  <Text className="text-purple-400 font-black text-lg mt-0.5">
                    {friend.xp || 0}
                  </Text>
                </View>
              </View>

              {/* Record & Win Rate */}
              <View className="bg-[#0F0E0C] border border-[#2A2722] p-4 rounded-2xl gap-2.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[9px] text-gray-500 uppercase font-black tracking-wider">
                    Récord (W/L)
                  </Text>
                  <Text className="text-white text-xs font-black">
                    {wins}W / {losses}L
                  </Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <View className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden border border-[#2A2722]">
                    <View
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${winRate}%` }}
                    />
                  </View>
                  <Text
                    className={`text-xs font-black ${
                      winRate >= 50 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {winRate}% WR
                  </Text>
                </View>
                <Text className="text-[10px] text-gray-500 font-bold text-center">
                  Total de partidas: <Text className="text-gray-300">{totalGames}</Text>
                </Text>
              </View>

              {/* Status Feedback Section */}
              {challengeStatus === 'waiting' ? (
                <View className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/25">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-black text-amber-400">
                      ⏳ Esperando respuesta...
                    </Text>
                    <Text className="text-xs font-mono font-bold text-amber-400">
                      {countdown}s
                    </Text>
                  </View>
                  <View className="h-1.5 bg-[#0F0E0C] rounded-full overflow-hidden border border-[#2A2722]">
                    <View
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${(countdown / 60) * 100}%` }}
                    />
                  </View>
                  <Pressable
                    onPress={handleCancelChallenge}
                    className="mt-3 py-1.5 items-center"
                  >
                    <Text className="text-xs font-bold text-gray-400">
                      Cancelar invitación
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {challengeStatus === 'accepted' ? (
                <View className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 items-center">
                  <Text className="text-emerald-400 text-xs font-black text-center">
                    🎉 ¡Aceptó el desafío! Iniciando partida...
                  </Text>
                </View>
              ) : null}

              {challengeStatus === 'rejected' ? (
                <View className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 items-center">
                  <Text className="text-red-400 text-xs font-black text-center">
                    😔 Rechazó la invitación
                  </Text>
                </View>
              ) : null}

              {challengeStatus === 'expired' ? (
                <View className="p-3 rounded-2xl bg-white/5 border border-white/10 items-center">
                  <Text className="text-gray-400 text-xs font-black text-center">
                    ⏰ La invitación expiró
                  </Text>
                </View>
              ) : null}

              {challengeStatus === 'error' ? (
                <View className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 items-center">
                  <Text className="text-red-400 text-xs font-black text-center">{errorMsg}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Contextual Action Footer */}
          {challengeStatus === 'idle' ||
          challengeStatus === 'rejected' ||
          challengeStatus === 'expired' ||
          challengeStatus === 'error' ? (
            <View className="p-4 border-t border-[#2A2722] bg-[#0F0E0C]/60 gap-2.5">
              {!isOnline ? (
                /* Offline: Push Invite Preset Selector + Chat + Invitar */
                <View className="gap-2">
                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      setShowPresets((v) => !v);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F0E0C] border border-[#2A2722] flex-row items-center justify-between"
                  >
                    <Text numberOfLines={1} className="text-xs font-bold text-gray-200 flex-1 pr-2">
                      {presetMessage}
                    </Text>
                    <Text className="text-[10px] text-gray-500">
                      {showPresets ? '▲' : '▼'}
                    </Text>
                  </Pressable>

                  {showPresets ? (
                    <View className="rounded-xl bg-[#0F0E0C] border border-[#2A2722] overflow-hidden">
                      {PRESET_MESSAGES.map((msg) => (
                        <Pressable
                          key={msg}
                          onPress={() => {
                            triggerHaptic('light');
                            setPresetMessage(msg);
                            setShowPresets(false);
                          }}
                          className={`px-3.5 py-2 border-b border-white/[0.04] ${
                            presetMessage === msg ? 'bg-amber-400/15' : ''
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              presetMessage === msg ? 'text-amber-400' : 'text-gray-300'
                            }`}
                          >
                            {msg}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => {
                        onClose();
                        onOpenChat(friend);
                      }}
                      className="flex-1 py-3 rounded-2xl bg-[#0F0E0C] border border-[#2A2722] flex-row items-center justify-center gap-1.5"
                    >
                      <MessageCircle color="#d1d5db" size={16} />
                      <Text className="text-gray-200 text-xs font-bold">Chat</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleSendChallenge(presetMessage)}
                      className="flex-1 py-3 rounded-2xl bg-purple-600 active:bg-purple-500 flex-row items-center justify-center gap-1.5"
                    >
                      <Send color="#ffffff" size={15} />
                      <Text className="text-white text-xs font-black uppercase tracking-wider">
                        Invitar
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : isInRoom ? (
                /* Online & In Match: Notify Waiting + Chat + Spectate */
                <View className="gap-2">
                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      socketService.notifyFriendWaiting(friend.id);
                    }}
                    className="w-full py-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 items-center justify-center"
                  >
                    <Text className="text-purple-300 text-xs font-bold">
                      ⏳ Notificar que lo espero
                    </Text>
                  </Pressable>

                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => {
                        onClose();
                        onOpenChat(friend);
                      }}
                      className="flex-1 py-3 rounded-2xl bg-[#0F0E0C] border border-[#2A2722] flex-row items-center justify-center gap-1.5"
                    >
                      <MessageCircle color="#d1d5db" size={16} />
                      <Text className="text-gray-200 text-xs font-bold">Chat</Text>
                    </Pressable>

                    {currentRoomId ? (
                      <Pressable
                        onPress={handleSpectate}
                        className="flex-1 py-3 rounded-2xl bg-purple-600 active:bg-purple-500 flex-row items-center justify-center gap-1.5"
                      >
                        <Eye color="#ffffff" size={16} />
                        <Text className="text-white text-xs font-black uppercase tracking-wider">
                          Espectar
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : (
                /* Online & Free: Notify Connected + Chat + Desafiar */
                <View className="gap-2">
                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      socketService.notifyFriendConnected(friend.id);
                    }}
                    className="w-full py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center"
                  >
                    <Text className="text-emerald-400 text-xs font-bold">
                      👋 Notificar que me conecté
                    </Text>
                  </Pressable>

                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => {
                        onClose();
                        onOpenChat(friend);
                      }}
                      className="flex-1 py-3 rounded-2xl bg-[#0F0E0C] border border-[#2A2722] flex-row items-center justify-center gap-1.5"
                    >
                      <MessageCircle color="#d1d5db" size={16} />
                      <Text className="text-gray-200 text-xs font-bold">Chat</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleSendChallenge()}
                      className="flex-1 py-3 rounded-2xl bg-[#FACC15] active:bg-yellow-300 flex-row items-center justify-center gap-1.5"
                    >
                      <Swords color="#0F0E0C" size={16} />
                      <Text className="text-[#0F0E0C] text-xs font-black uppercase tracking-wider">
                        Desafiar
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ) : null}

          {challengeStatus === 'sending' ? (
            <View className="p-4 border-t border-[#2A2722] bg-[#0F0E0C]/60 items-center flex-row justify-center gap-2">
              <ActivityIndicator size="small" color="#fbbf24" />
              <Text className="text-amber-400 text-xs font-bold">Creando sala...</Text>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
