import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAudio } from '../../hooks/useAudio';
import { triggerHaptic } from '../../utils/haptics';
import { ArrowLeft, Send, Check, CheckCheck, X } from 'lucide-react-native';

export interface ChatFriend {
  id: string;
  username: string;
  elo: number;
  avatar_url?: string | null;
  isOnline?: boolean;
}

interface MessageItem {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  deleted_at?: string | null;
}

interface PrivateChatModalProps {
  friend: ChatFriend | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PrivateChatModal({ friend, isOpen, onClose }: PrivateChatModalProps) {
  const { user } = useAuth();
  const { playSfx } = useAudio();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // ── Fetch de mensajes ──────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!user || !friend) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, is_read, deleted_at')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching chat messages:', error);
      } else if (data) {
        // Regla 5.3: Evidenciar datos reales de la API
        console.log('Chat messages from API:', data);
        setMessages(data as MessageItem[]);

        // Marcar como leídos los mensajes recibidos
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('sender_id', friend.id)
          .eq('is_read', false);
      }
    } catch (e) {
      console.error('Chat error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, friend]);

  useEffect(() => {
    if (isOpen && friend) {
      setLoading(true);
      fetchMessages();

      // Suscripción Realtime a nuevos mensajes
      const channelName = `private_chat_${user?.id}_${friend.id}_${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user?.id}`,
          },
          async (payload) => {
            if (payload.new.sender_id === friend.id) {
              setMessages((prev) => [...prev, payload.new as MessageItem]);
              triggerHaptic('light');
              try {
                playSfx('cardPlay', { volumeMultiplier: 0.5 });
              } catch (_) {}

              // Marcar leído inmediatamente
              await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', payload.new.id);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${user?.id}`,
          },
          (payload) => {
            if (payload.new.receiver_id === friend.id) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === payload.new.id)) return prev;
                return [...prev, payload.new as MessageItem];
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, friend, fetchMessages, user?.id, playSfx]);

  // ── Enviar Mensaje ─────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !user || !friend || isSending) return;

    setIsSending(true);
    triggerHaptic('light');

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      sender_id: user.id,
      receiver_id: friend.id,
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: friend.id,
          content: text,
          is_read: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
      } else if (data) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as MessageItem) : m)));
      }
    } catch (e) {
      console.error('Send error:', e);
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!isOpen || !friend) return null;

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-slate-950"
      >
        {/* ── Top Bar ─────────────────────────────────────────── */}
        <View className="pt-12 px-4 pb-3 bg-slate-900 border-b border-slate-800 flex-row items-center justify-between">
          <Pressable
            onPress={onClose}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 active:bg-slate-700"
          >
            <ArrowLeft color="#fbbf24" size={18} />
          </Pressable>

          <View className="flex-row items-center flex-1 mx-3">
            <View className="relative mr-2.5">
              {friend.avatar_url ? (
                <Image source={{ uri: friend.avatar_url }} className="w-10 h-10 rounded-full" />
              ) : (
                <View className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 items-center justify-center">
                  <Text className="text-white">👤</Text>
                </View>
              )}
              <View
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                  friend.isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              />
            </View>

            <View className="flex-1">
              <Text className="text-white font-bold text-sm" numberOfLines={1}>
                {friend.username}
              </Text>
              <Text className="text-amber-400 text-[10px] font-semibold">
                ELO: {friend.elo} •{' '}
                <Text className={friend.isOnline ? 'text-emerald-400' : 'text-slate-500'}>
                  {friend.isOnline ? 'En línea' : 'Desconectado'}
                </Text>
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 active:bg-slate-700"
          >
            <X color="#94a3b8" size={18} />
          </Pressable>
        </View>

        {/* ── Lista de Mensajes ───────────────────────────────── */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#fbbf24" />
            <Text className="text-slate-400 text-xs mt-3">Cargando conversación...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            ListEmptyComponent={() => (
              <View className="py-20 items-center">
                <Text className="text-slate-500 text-xs text-center">
                  Inicia la conversación con {friend.username}. ¡Escribe un mensaje abajo!
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isMine = item.sender_id === user?.id;

              return (
                <View
                  className={`mb-2.5 max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    isMine
                      ? 'self-end bg-amber-500 rounded-tr-none'
                      : 'self-start bg-slate-900 border border-slate-800 rounded-tl-none'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      isMine ? 'text-slate-950 font-semibold' : 'text-slate-200'
                    }`}
                  >
                    {item.deleted_at ? 'Mensaje eliminado' : item.content}
                  </Text>

                  <View className="flex-row items-center justify-end gap-1 mt-1">
                    <Text
                      className={`text-[9px] ${
                        isMine ? 'text-slate-800 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {formatMessageTime(item.created_at)}
                    </Text>
                    {isMine &&
                      (item.is_read ? (
                        <CheckCheck color="#020617" size={12} />
                      ) : (
                        <Check color="#334155" size={12} />
                      ))}
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* ── Input Bar ───────────────────────────────────────── */}
        <View className="p-3 bg-slate-900 border-t border-slate-800 flex-row items-center gap-2">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#64748b"
            multiline
            maxLength={500}
            className="flex-1 bg-slate-800 text-white rounded-2xl px-4 py-2.5 text-sm max-h-24 border border-slate-700"
          />
          <Pressable
            disabled={!inputText.trim() || isSending}
            onPress={handleSend}
            className={`w-11 h-11 rounded-2xl items-center justify-center ${
              !inputText.trim() || isSending ? 'bg-slate-800' : 'bg-amber-500 active:bg-amber-600'
            }`}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#020617" />
            ) : (
              <Send
                color={!inputText.trim() ? '#64748b' : '#020617'}
                size={18}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
