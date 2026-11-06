import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAudio } from '../../hooks/useAudio';
import { triggerHaptic } from '../../utils/haptics';
import { ArrowLeft, Send, Check, CheckCheck, X, Globe } from 'lucide-react-native';

const GLOBAL_ROOM_ID = 'GLOBAL';

export interface ChatFriend {
  id: string; // Usa 'GLOBAL' para el Chat Global de la comunidad
  username: string;
  elo: number;
  avatar_url?: string | null;
  isOnline?: boolean;
}

interface MessageItem {
  id: string;
  sender_id: string;
  receiver_id?: string | null;
  room_id?: string | null;
  content: string;
  created_at: string;
  is_read?: boolean;
  deleted_at?: string | null;
  edited_at?: string | null;
  profiles?: {
    username?: string;
    avatar_url?: string | null;
    equipped_avatar?: string | null;
    level?: number;
    elo?: number;
  } | null;
}

interface PrivateChatModalProps {
  friend: ChatFriend | null;
  isOpen: boolean;
  onClose: () => void;
}

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

export function PrivateChatModal({ friend, isOpen, onClose }: PrivateChatModalProps) {
  // Todos los hooks al inicio antes de cualquier return condicional
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { playSfx } = useAudio();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'degraded'>(
    'connecting'
  );

  const flatListRef = useRef<FlatList>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const prevCountRef = useRef<number>(0);

  const isGlobalChat = friend?.id === GLOBAL_ROOM_ID;

  // ── Fetch de mensajes (soporta modo silencioso para polling de sincronización de 3s igual que Web) ──
  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!user || !friend) return;
      if (!silent) setLoading(true);

      try {
        if (friend.id === GLOBAL_ROOM_ID) {
          let { data, error } = await supabase
            .from('chat_messages')
            .select(
              `
              id, sender_id, room_id, content, created_at, timestamp,
              profiles:sender_id (username, avatar_url, equipped_avatar, level, elo)
            `
            )
            .eq('room_id', GLOBAL_ROOM_ID)
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) {
            const fallback = await supabase
              .from('chat_messages')
              .select(
                `
                id, sender_id, room_id, content, timestamp,
                profiles:sender_id (username, avatar_url, equipped_avatar, level, elo)
              `
              )
              .eq('room_id', GLOBAL_ROOM_ID)
              .order('timestamp', { ascending: false })
              .limit(50);
            data = fallback.data as any;
            error = fallback.error as any;
          }

          if (!error && data) {
            const ordered = [...(data as any[])].reverse().map((m) => ({
              ...m,
              created_at: m.created_at || m.timestamp || new Date().toISOString(),
            })) as MessageItem[];
            if (!silent) {
              console.log('Chat messages from API:', ordered);
            }
            setMessages(ordered);
          }
        } else {
          const { data, error } = await supabase
            .from('messages')
            .select(
              'id, sender_id, receiver_id, content, created_at, is_read, deleted_at, edited_at'
            )
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`
            )
            .order('created_at', { ascending: true })
            .limit(100);

          if (!error && data) {
            if (!silent) {
              console.log('Chat messages from API:', data);
            }
            setMessages(data as MessageItem[]);

            // Marcar como leídos los mensajes recibidos que aún estén sin leer
            const hasUnread = (data as MessageItem[]).some(
              (m) => m.receiver_id === user.id && m.sender_id === friend.id && !m.is_read
            );
            if (hasUnread) {
              await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('receiver_id', user.id)
                .eq('sender_id', friend.id)
                .eq('is_read', false);
            }
          }
        }
      } catch (e) {
        if (!silent) console.error('Chat sync error:', e);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user, friend]
  );

  // ── Suscripción Realtime + Presencia ("Escribiendo...") + Poll de Respaldo cada 3s (idéntico a ChatWindow.tsx Web) ──
  useEffect(() => {
    if (!isOpen || !friend || !user) return;

    setMessages([]);
    setOtherUserTyping(false);
    setRealtimeStatus('connecting');
    prevCountRef.current = 0;
    fetchMessages(false);

    const conversationKey =
      friend.id === GLOBAL_ROOM_ID
        ? `chat_global_${GLOBAL_ROOM_ID}`
        : `chat_private_${[user.id, friend.id].sort().join('_')}`;

    const dbChannel = supabase.channel(`${conversationKey}_mobile_db_${Date.now()}`);
    const presenceChannel = supabase.channel(`${conversationKey}_presence`);
    presenceChannelRef.current = presenceChannel;

    if (friend.id === GLOBAL_ROOM_ID) {
      dbChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${GLOBAL_ROOM_ID}`,
        },
        async (payload) => {
          const { data: senderProf } = await supabase
            .from('profiles')
            .select('username, avatar_url, equipped_avatar, level, elo')
            .eq('id', payload.new.sender_id)
            .single();

          const incoming: MessageItem = {
            ...(payload.new as any),
            created_at:
              payload.new.created_at || payload.new.timestamp || new Date().toISOString(),
            profiles: senderProf || null,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });

          if (payload.new.sender_id !== user.id) {
            triggerHaptic('light');
            playSfx('cardPlay', { volumeMultiplier: 0.45 });
          }
        }
      );
    } else {
      dbChannel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`,
          },
          async (payload) => {
            if (payload.new.sender_id === friend.id) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === payload.new.id)) return prev;
                return [...prev, payload.new as MessageItem];
              });
              triggerHaptic('light');
              playSfx('cardPlay', { volumeMultiplier: 0.45 });

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
            filter: `sender_id=eq.${user.id}`,
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
        );
    }

    dbChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setRealtimeStatus('degraded');
      }
    });

    // Indicador "Escribiendo..." sincronizado con el mismo canal de presencia de la Web
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const typing = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.user_id !== user.id && p.is_typing)
        );
        setOtherUserTyping(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: user.id, is_typing: false });
        }
      });

    // Bucle de sincronización de respaldo cada 3s (idéntico a ChatWindow.tsx en Web)
    const pollInterval = setInterval(() => {
      fetchMessages(true);
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      presenceChannelRef.current = null;
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [isOpen, friend?.id, user?.id, fetchMessages, playSfx]);

  // Auto-scroll cuando aumenta el número de mensajes
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: prevCountRef.current > 0 }), 80);
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const handleInputChange = (val: string) => {
    setInputText(val);
    if (!user || !presenceChannelRef.current) return;

    if (!isTypingRef.current && val.trim().length > 0) {
      isTypingRef.current = true;
      presenceChannelRef.current.track({ user_id: user.id, is_typing: true }).catch(() => {});
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      presenceChannelRef.current?.track({ user_id: user.id, is_typing: false }).catch(() => {});
    }, 2000);
  };

  // ── Enviar Mensaje ─────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !user || !friend || isSending) return;

    setIsSending(true);
    triggerHaptic('light');

    isTypingRef.current = false;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    presenceChannelRef.current?.track({ user_id: user.id, is_typing: false }).catch(() => {});

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      sender_id: user.id,
      receiver_id: isGlobalChat ? null : friend.id,
      room_id: isGlobalChat ? GLOBAL_ROOM_ID : null,
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
      profiles: {
        username: profile?.username || 'Tú',
        avatar_url: profile?.equipped_avatar || profile?.avatar_url || null,
        level: profile?.level || 1,
        elo: profile?.elo || 1000,
      },
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    try {
      if (isGlobalChat) {
        await supabase.rpc('add_player_xp', { p_id: user.id, p_xp_amount: 2 });
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            sender_id: user.id,
            room_id: GLOBAL_ROOM_ID,
            content: text,
          })
          .select('id, sender_id, room_id, content, created_at, timestamp')
          .single();

        if (!error && data) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...(data as any),
                    created_at:
                      (data as any).created_at ||
                      (data as any).timestamp ||
                      new Date().toISOString(),
                    profiles: optimisticMsg.profiles,
                  }
                : m
            )
          );
        }
      } else {
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

        if (!error && data) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as MessageItem) : m)));
        }
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
    <Modal
      visible={Boolean(isOpen && friend)}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#020617' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {/* ── Top Bar ─────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: Math.max(insets.top, 16) + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: '#0f172a',
          borderBottomWidth: 1,
          borderBottomColor: '#1e293b',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          onPress={onClose}
          style={{
            padding: 8,
            borderRadius: 12,
            backgroundColor: '#1e293b',
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <ArrowLeft color="#fbbf24" size={18} />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginHorizontal: 12 }}>
          <View style={{ position: 'relative', marginRight: 10 }}>
            {isGlobalChat ? (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(245, 158, 11, 0.45)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Globe color="#fbbf24" size={20} />
              </View>
            ) : friend.avatar_url ? (
              <Image
                source={{ uri: friend.avatar_url }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#1e293b',
                  borderWidth: 1,
                  borderColor: '#334155',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 15 }}>
                  {friend.username?.charAt(0)?.toUpperCase() || '👤'}
                </Text>
              </View>
            )}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 11,
                height: 11,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: '#0f172a',
                backgroundColor:
                  isGlobalChat || friend.isOnline
                    ? '#10b981'
                    : realtimeStatus === 'connected'
                    ? '#64748b'
                    : '#f59e0b',
              }}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}
              numberOfLines={1}
            >
              {isGlobalChat ? 'Chat Global K21' : friend.username}
            </Text>
            {otherUserTyping ? (
              <Text style={{ color: '#22d3ee', fontSize: 11, fontWeight: '700' }}>
                Escribiendo...
              </Text>
            ) : isGlobalChat ? (
              <Text style={{ color: '#34d399', fontSize: 10, fontWeight: '600' }}>
                Sala pública en vivo (+2 XP por mensaje)
              </Text>
            ) : (
              <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '600' }}>
                ELO: {friend.elo} •{' '}
                <Text style={{ color: friend.isOnline ? '#34d399' : '#64748b' }}>
                  {friend.isOnline ? 'En línea' : 'Desconectado'}
                </Text>
              </Text>
            )}
          </View>
        </View>

        <Pressable
          onPress={onClose}
          style={{
            padding: 8,
            borderRadius: 12,
            backgroundColor: '#1e293b',
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <X color="#94a3b8" size={18} />
        </Pressable>
      </View>

      {/* ── Lista de Mensajes ───────────────────────────────── */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#fbbf24" />
          <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 12 }}>
            Sincronizando conversación...
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, idx) => item.id || `${item.created_at}-${idx}`}
          style={{ flex: 1 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ListEmptyComponent={() => (
            <View style={{ paddingVertical: 64, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center' }}>
                {isGlobalChat
                  ? 'Sé el primero en saludar en el Chat Global.'
                  : `Inicia la conversación con ${friend.username}. ¡Escribe un mensaje abajo!`}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isMine = item.sender_id === user?.id;
            const senderName = item.profiles?.username || friend.username;
            const media = !item.deleted_at && isMediaUrl(item.content);

            return (
              <View
                style={{
                  marginBottom: 10,
                  maxWidth: '82%',
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  alignItems: isMine ? 'flex-end' : 'flex-start',
                }}
              >
                {isGlobalChat && !isMine && (
                  <Text
                    style={{
                      color: '#fbbf24',
                      fontSize: 10,
                      fontWeight: '700',
                      marginBottom: 2,
                      marginLeft: 4,
                    }}
                  >
                    {senderName}
                  </Text>
                )}

                <View
                  style={{
                    borderRadius: 16,
                    borderTopRightRadius: isMine ? 4 : 16,
                    borderTopLeftRadius: isMine ? 16 : 4,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: isMine ? '#f59e0b' : '#0f172a',
                    borderWidth: isMine ? 0 : 1,
                    borderColor: '#1e293b',
                  }}
                >
                  {media ? (
                    <Image
                      source={{ uri: item.content }}
                      style={{ width: 110, height: 110 }}
                      contentFit="contain"
                    />
                  ) : (
                    <Text
                      style={{
                        fontSize: 13,
                        color: isMine ? '#020617' : '#e2e8f0',
                        fontWeight: isMine ? '600' : '400',
                        fontStyle: item.deleted_at ? 'italic' : 'normal',
                      }}
                    >
                      {item.deleted_at ? 'Mensaje eliminado' : item.content}
                    </Text>
                  )}

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        color: isMine ? '#1e293b' : '#64748b',
                        fontWeight: '600',
                      }}
                    >
                      {formatMessageTime(item.created_at)}
                      {item.edited_at && !item.deleted_at ? ' • editado' : ''}
                    </Text>
                    {isMine &&
                      !isGlobalChat &&
                      (item.is_read ? (
                        <CheckCheck color="#020617" size={12} />
                      ) : (
                        <Check color="#334155" size={12} />
                      ))}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ── Input Bar ───────────────────────────────────────── */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: '#0f172a',
          borderTopWidth: 1,
          borderTopColor: '#1e293b',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <TextInput
          value={inputText}
          onChangeText={handleInputChange}
          onSubmitEditing={handleSend}
          placeholder={
            isGlobalChat ? 'Escribe en el Chat Global...' : 'Escribe un mensaje...'
          }
          placeholderTextColor="#64748b"
          multiline
          maxLength={500}
          style={{
            flex: 1,
            backgroundColor: '#1e293b',
            color: '#ffffff',
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 13,
            maxHeight: 96,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        />
        <Pressable
          disabled={!inputText.trim() || isSending}
          onPress={handleSend}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              !inputText.trim() || isSending ? '#1e293b' : '#f59e0b',
          }}
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
  </View>
</Modal>
  );
}
