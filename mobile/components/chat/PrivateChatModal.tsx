import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Globe } from 'lucide-react-native';
import { Image } from 'expo-image';
import { ChatView } from './ChatView';
import { resolveAvatarUrl } from '../social/socialUtils';

export interface PrivateChatFriend {
  id: string;
  username: string;
  avatar_url?: string | null;
  equipped_avatar?: string | null;
  elo: number;
  level: number;
  isOnline?: boolean;
  isInRoom?: boolean;
}

interface PrivateChatModalProps {
  visible: boolean;
  friend: PrivateChatFriend | null;
  onClose: () => void;
  onMessagesRead?: () => void;
  onAvatarClick?: (playerId: string) => void;
}

export function PrivateChatModal({
  visible,
  friend,
  onClose,
  onMessagesRead,
  onAvatarClick,
}: PrivateChatModalProps) {
  const insets = useSafeAreaInsets();
  const isGlobal = !friend;
  const avatarUri = friend
    ? resolveAvatarUrl(friend.equipped_avatar || friend.avatar_url)
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: '#020617',
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 8),
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/90">
          <View className="flex-row items-center gap-3 flex-1">
            <Pressable
              onPress={onClose}
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 items-center justify-center"
            >
              <ArrowLeft color="#e5e7eb" size={18} />
            </Pressable>

            {isGlobal ? (
              <View className="flex-row items-center gap-2.5">
                <View className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 items-center justify-center">
                  <Globe color="#fbbf24" size={20} />
                </View>
                <View>
                  <Text className="text-white font-black text-base">Chat Global</Text>
                  <Text className="text-emerald-400 text-[11px] font-semibold">
                    Sala pública en vivo
                  </Text>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  if (friend && onAvatarClick) {
                    onClose();
                    onAvatarClick(friend.id);
                  }
                }}
                className="flex-row items-center gap-2.5 flex-1"
              >
                <View className="relative">
                  <View className="w-10 h-10 rounded-full bg-slate-800 border border-amber-500/40 items-center justify-center overflow-hidden">
                    {avatarUri ? (
                      <Image
                        source={{ uri: avatarUri }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : (
                      <Text className="text-amber-400 font-black text-sm">
                        {friend.username?.charAt(0).toUpperCase() || 'J'}
                      </Text>
                    )}
                  </View>
                  <View
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${
                      friend.isOnline && friend.isInRoom
                        ? 'bg-purple-500'
                        : friend.isOnline
                        ? 'bg-emerald-400'
                        : 'bg-gray-600'
                    }`}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-black text-base" numberOfLines={1}>
                    {friend.username}
                  </Text>
                  <Text
                    className={`text-[11px] font-semibold ${
                      friend.isOnline && friend.isInRoom
                        ? 'text-purple-400'
                        : friend.isOnline
                        ? 'text-emerald-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {friend.isOnline && friend.isInRoom
                      ? '🎮 En partida'
                      : friend.isOnline
                      ? 'En línea'
                      : `Nv.${friend.level || 1} • ${friend.elo} ELO`}
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>

        <View className="flex-1 p-2">
          <ChatView
            receiverId={friend?.id || null}
            receiverName={friend?.username}
            receiverAvatar={friend?.equipped_avatar || friend?.avatar_url}
            isReceiverOnline={Boolean(friend?.isOnline)}
            isReceiverInRoom={Boolean(friend?.isInRoom)}
            showPartnerHeader={false}
            onMessagesRead={onMessagesRead}
            onAvatarClick={onAvatarClick}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
