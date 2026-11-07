import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { triggerHaptic } from '../../utils/haptics';
import {
  IncomingRequest,
  resolveAvatarUrl,
  getDivisionFromElo,
  calculateLevelFromXp,
} from './socialUtils';

interface FriendRequestModalProps {
  request: IncomingRequest | null;
  onClose: () => void;
  onResponded: () => void;
}

export function FriendRequestModal({
  request,
  onClose,
  onResponded,
}: FriendRequestModalProps) {
  const { user } = useAuth();
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null);
  const [responded, setResponded] = useState<'accepted' | 'rejected' | null>(null);

  useEffect(() => {
    if (request) {
      setActionLoading(null);
      setResponded(null);
    }
  }, [request?.id]);

  if (!request) return null;

  const sender = request.sender;
  const div = getDivisionFromElo(sender.elo || 1000);
  const level = calculateLevelFromXp(sender.xp || 0);
  const wins = sender.wins ?? 0;
  const losses = sender.losses ?? 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const avatarUri = resolveAvatarUrl(sender.equipped_avatar || sender.avatar_url);

  const handleAction = async (action: 'accepted' | 'rejected') => {
    if (!user) return;
    triggerHaptic(action === 'accepted' ? 'success' : 'light');
    setActionLoading(action === 'accepted' ? 'accept' : 'reject');
    try {
      const { data: result, error: rpcError } = await supabase.rpc('respond_friend_request', {
        p_request_id: request.id,
        p_user_id: user.id,
        p_action: action,
      });

      if (rpcError) {
        setActionLoading(null);
        return;
      }
      if (
        typeof result === 'object' &&
        result !== null &&
        result.success === false &&
        result.status !== 'already_friends'
      ) {
        setActionLoading(null);
        return;
      }

      setResponded(action);
      onResponded();
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.warn('Error respondiendo solicitud de amistad:', err);
      setActionLoading(null);
    }
  };

  return (
    <Modal visible={Boolean(request)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/85 justify-center items-center px-4"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-slate-950 overflow-hidden shadow-2xl"
        >
          {/* Header Banner */}
          <View className="relative px-6 pt-5 pb-3 items-center border-b border-white/[0.06] bg-amber-500/[0.06]">
            <Pressable
              onPress={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 border border-white/10 items-center justify-center"
            >
              <X color="#d1d5db" size={14} />
            </Pressable>
            <Text className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90">
              📨 Solicitud de Amistad
            </Text>
          </View>

          {/* Avatar + Identity */}
          <View className="px-6 pt-5 pb-4 items-center">
            <View className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-amber-400/30 items-center justify-center overflow-hidden mb-3">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <Text className="text-3xl font-black text-amber-400">
                  {sender.username?.charAt(0).toUpperCase() || 'J'}
                </Text>
              )}
            </View>

            <Text className="text-lg font-black text-white">{sender.username}</Text>
            <Text className="text-xs text-gray-400 mt-0.5">quiere ser tu amigo</Text>

            <View
              className={`mt-2 px-3 py-0.5 rounded-full border ${div.bgClass} ${div.borderClass}`}
            >
              <Text className={`text-[11px] font-bold ${div.textClass}`}>
                {div.icon} {div.label}
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View className="px-6 pb-4">
            <View className="flex-row gap-2">
              <View className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 items-center">
                <Text className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">
                  Nivel
                </Text>
                <Text className="text-white font-black text-base mt-0.5">{level}</Text>
              </View>
              <View className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 items-center">
                <Text className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">
                  ELO
                </Text>
                <Text className="text-amber-400 font-black text-base mt-0.5">{sender.elo}</Text>
              </View>
              <View className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 items-center">
                <Text className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">
                  XP
                </Text>
                <Text className="text-purple-400 font-black text-base mt-0.5">
                  {sender.xp || 0}
                </Text>
              </View>
            </View>

            <View className="mt-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 flex-row items-center justify-around">
              <View className="items-center">
                <Text className="text-emerald-400 font-black text-sm">{wins}</Text>
                <Text className="text-[9px] text-gray-500 uppercase font-bold">Victorias</Text>
              </View>
              <View className="w-px h-6 bg-white/[0.06]" />
              <View className="items-center">
                <Text className="text-red-400 font-black text-sm">{losses}</Text>
                <Text className="text-[9px] text-gray-500 uppercase font-bold">Derrotas</Text>
              </View>
              <View className="w-px h-6 bg-white/[0.06]" />
              <View className="items-center">
                <Text
                  className={`font-black text-sm ${
                    winRate >= 50 ? 'text-emerald-400' : 'text-gray-400'
                  }`}
                >
                  {winRate}%
                </Text>
                <Text className="text-[9px] text-gray-500 uppercase font-bold">Win Rate</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="px-6 pb-5">
            {responded ? (
              <View
                className={`py-3 rounded-xl border items-center ${
                  responded === 'accepted'
                    ? 'bg-emerald-500/15 border-emerald-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    responded === 'accepted' ? 'text-emerald-400' : 'text-gray-400'
                  }`}
                >
                  {responded === 'accepted' ? '🤝 ¡Ahora son amigos!' : 'Solicitud rechazada'}
                </Text>
              </View>
            ) : (
              <View className="flex-row gap-2.5">
                <Pressable
                  onPress={() => handleAction('rejected')}
                  disabled={actionLoading !== null}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 items-center justify-center flex-row gap-1.5"
                >
                  {actionLoading === 'reject' ? (
                    <ActivityIndicator size="small" color="#9ca3af" />
                  ) : (
                    <Text className="text-gray-300 font-bold text-sm">✕ Rechazar</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => handleAction('accepted')}
                  disabled={actionLoading !== null}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 active:bg-emerald-400 items-center justify-center flex-row gap-1.5"
                >
                  {actionLoading === 'accept' ? (
                    <ActivityIndicator size="small" color="#020617" />
                  ) : (
                    <Text className="text-slate-950 font-black text-sm">🤝 Aceptar</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
