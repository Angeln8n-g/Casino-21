import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { X, MessageCircle } from 'lucide-react-native';
import { triggerHaptic } from '../../utils/haptics';
import {
  SearchPlayerData,
  resolveAvatarUrl,
  getDivisionFromElo,
  calculateLevelFromXp,
} from './socialUtils';

interface PlayerProfileModalProps {
  player: SearchPlayerData | null;
  onClose: () => void;
  onSendRequest: (playerId: string) => Promise<void>;
  onAcceptRequest: (playerId: string, requestId?: string) => Promise<void>;
  onOpenChat?: (player: SearchPlayerData) => void;
}

export function PlayerProfileModal({
  player,
  onClose,
  onSendRequest,
  onAcceptRequest,
  onOpenChat,
}: PlayerProfileModalProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState(player?.relationshipStatus || 'none');

  useEffect(() => {
    if (player) {
      setStatus(player.relationshipStatus);
      setActionLoading(false);
    }
  }, [player?.id, player?.relationshipStatus]);

  if (!player) return null;

  const div = getDivisionFromElo(player.elo || 1000);
  const level = calculateLevelFromXp(player.xp || 0);
  const wins = player.wins ?? 0;
  const losses = player.losses ?? 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const avatarUri = resolveAvatarUrl(player.equipped_avatar || player.avatar_url);

  const handleSend = async () => {
    triggerHaptic('light');
    setActionLoading(true);
    try {
      await onSendRequest(player.id);
      setStatus('pending_sent');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    triggerHaptic('success');
    setActionLoading(true);
    try {
      await onAcceptRequest(player.id, player.requestId);
      setStatus('friends');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal visible={Boolean(player)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/85 justify-center items-center px-4"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl border border-[#2A2722] bg-[#1A1815] overflow-hidden max-h-[88%]"
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
                  {player.username?.charAt(0).toUpperCase() || 'J'}
                </Text>
              )}

              <Pressable
                onPress={onClose}
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 border border-white/10 items-center justify-center"
              >
                <X color="#d1d5db" size={16} />
              </Pressable>
            </View>

            {/* Info Body */}
            <View className="p-5 gap-4">
              <View>
                <Text className="text-[10px] text-purple-400 uppercase tracking-widest font-black mb-1">
                  JUGADOR
                </Text>
                <Text className="text-2xl font-black text-white">{player.username}</Text>
              </View>

              {/* Quick Stats */}
              <View className="flex-row gap-3">
                <View className="flex-1 bg-[#0F0E0C] border border-[#2A2722] p-3 rounded-2xl items-center">
                  <Text className="text-[9px] text-gray-500 uppercase font-black tracking-wider">
                    Nivel
                  </Text>
                  <Text className="text-white font-black text-xl mt-0.5">{level}</Text>
                </View>
                <View className="flex-1 bg-[#0F0E0C] border border-[#2A2722] p-3 rounded-2xl items-center">
                  <Text className="text-[9px] text-gray-500 uppercase font-black tracking-wider">
                    ELO
                  </Text>
                  <Text className="text-amber-400 font-black text-xl mt-0.5">{player.elo}</Text>
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
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View className="p-4 border-t border-[#2A2722] bg-[#0F0E0C]/60 gap-2">
            {status === 'friends' ? (
              <View className="flex-row gap-2">
                <View className="flex-1 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 items-center justify-center">
                  <Text className="text-emerald-400 text-xs font-black uppercase tracking-wider">
                    ✓ Ya son Amigos
                  </Text>
                </View>
                {onOpenChat ? (
                  <Pressable
                    onPress={() => {
                      onClose();
                      onOpenChat(player);
                    }}
                    className="px-4 py-3 rounded-2xl bg-amber-400/15 border border-amber-400/30 items-center justify-center flex-row gap-1.5"
                  >
                    <MessageCircle color="#fbbf24" size={16} />
                    <Text className="text-amber-400 text-xs font-black uppercase">Chat</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : status === 'pending_sent' ? (
              <View className="w-full py-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 items-center justify-center">
                <Text className="text-amber-400 text-xs font-black uppercase tracking-wider">
                  ⏳ Solicitud Enviada
                </Text>
              </View>
            ) : status === 'pending_received' ? (
              <Pressable
                onPress={handleAccept}
                disabled={actionLoading}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 active:bg-emerald-400 items-center justify-center"
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#020617" />
                ) : (
                  <Text className="text-slate-950 font-black text-xs uppercase tracking-wider">
                    🤝 Aceptar Solicitud de Amistad
                  </Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSend}
                disabled={actionLoading}
                className="w-full py-3.5 rounded-2xl bg-[#FACC15] active:bg-yellow-300 items-center justify-center"
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#020617" />
                ) : (
                  <Text className="text-[#0F0E0C] font-black text-xs uppercase tracking-wider">
                    ✉️ Enviar Solicitud
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
