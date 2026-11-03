import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { ChatMessage } from '../../hooks/useGame';
import { X, Send, MessageSquare } from 'lucide-react-native';

interface GameChatModalProps {
  visible: boolean;
  messages: ChatMessage[];
  localPlayerId?: string | null;
  quickEmotes?: string[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

const DEFAULT_QUICK_EMOJIS = ['😀', '😮', '🔥', '👏', '💀', '🎉', '💩', '😎'];

const isMediaUrl = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  const str = text.trim();
  return (
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.includes('/storage/v1/object/public/') ||
    /\.(gif|webp|png|jpg|jpeg)$/i.test(str)
  );
};

export function GameChatModal({
  visible,
  messages,
  localPlayerId,
  quickEmotes,
  onSendMessage,
  onClose,
}: GameChatModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [visible, messages.length]);

  if (!visible) return null;

  const emotesToRender =
    quickEmotes && quickEmotes.length > 0 ? quickEmotes.slice(0, 8) : DEFAULT_QUICK_EMOJIS;

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        StyleSheet.absoluteFillObject,
        {
          width: windowWidth,
          height: windowHeight,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'flex-end',
          zIndex: 999999,
          elevation: 999999,
        },
      ]}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose} />

      <View
        style={{
          width: windowWidth,
          maxHeight: windowHeight * 0.78,
          backgroundColor: '#0f172a',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.15)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 16,
          paddingBottom: 28,
        }}
      >
        {/* Header (idéntico a GameChat.tsx en Web) */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MessageSquare color="#fbbf24" size={18} />
            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
              Chat de Sala
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={{
              padding: 6,
              backgroundColor: '#1e293b',
              borderRadius: 999,
            }}
          >
            <X color="#cbd5e1" size={18} />
          </Pressable>
        </View>

        {/* Lista de Mensajes */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, idx) => item.id || `${item.timestamp}-${idx}`}
          style={{ maxHeight: 280, marginBottom: 12 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 36 }}>
              <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center' }}>
                No hay mensajes de los jugadores aún.
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            if (item.isSystem) {
              return (
                <View style={{ alignItems: 'center', marginVertical: 4 }}>
                  <Text
                    style={{
                      color: '#64748b',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      textAlign: 'center',
                    }}
                  >
                    {item.text}
                  </Text>
                </View>
              );
            }

            const isMe = Boolean(localPlayerId && item.senderId === localPlayerId);
            const media = isMediaUrl(item.text);

            return (
              <View
                style={{
                  marginBottom: 10,
                  maxWidth: '86%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 3,
                  }}
                >
                  <Text
                    style={{
                      color: item.isSpectator ? '#60a5fa' : '#fbbf24',
                      fontWeight: '700',
                      fontSize: 10,
                    }}
                  >
                    {item.senderName} {item.isSpectator ? '(Espectador)' : ''}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 9 }}>
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {media ? (
                  <View
                    style={{
                      padding: 6,
                      borderRadius: 14,
                      backgroundColor: 'rgba(0, 0, 0, 0.45)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.12)',
                    }}
                  >
                    <Image
                      source={{ uri: item.text }}
                      style={{ width: 96, height: 96 }}
                      contentFit="contain"
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 14,
                      borderTopRightRadius: isMe ? 4 : 14,
                      borderTopLeftRadius: isMe ? 14 : 4,
                      backgroundColor: isMe
                        ? 'rgba(245, 158, 11, 0.22)'
                        : 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: isMe
                        ? 'rgba(245, 158, 11, 0.38)'
                        : 'rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <Text style={{ color: isMe ? '#ffffff' : '#e5e7eb', fontSize: 13 }}>
                      {item.text}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />

        {/* Barra de Emotes Rápidos */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 12,
            paddingHorizontal: 2,
          }}
        >
          {emotesToRender.map((emoji, idx) => {
            const media = isMediaUrl(emoji);
            return (
              <Pressable
                key={`${emoji}-${idx}`}
                onPress={() => onSendMessage(emoji)}
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: '#1e293b',
                  borderWidth: 1,
                  borderColor: '#334155',
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {media ? (
                  <Image
                    source={{ uri: emoji }}
                    style={{ width: 24, height: 24 }}
                    contentFit="contain"
                  />
                ) : (
                  <Text style={{ fontSize: 16 }}>{emoji}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Input de Mensaje */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#020617',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)',
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#64748b"
            style={{
              flex: 1,
              color: '#ffffff',
              fontSize: 13,
              paddingVertical: 8,
              marginRight: 8,
            }}
          />
          <Pressable
            disabled={!inputText.trim()}
            onPress={handleSend}
            style={{
              backgroundColor: inputText.trim() ? '#f59e0b' : '#1e293b',
              padding: 9,
              borderRadius: 10,
            }}
          >
            <Send color={inputText.trim() ? '#020617' : '#64748b'} size={15} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
