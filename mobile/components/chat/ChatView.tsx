import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  AppState,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import {
  Send,
  Smile,
  Reply,
  Copy,
  Edit2,
  Trash2,
  Check,
  X,
  RotateCcw,
} from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { appEvents } from '../../utils/events';
import { triggerHaptic } from '../../utils/haptics';
import { resolveAvatarUrl } from '../social/socialUtils';

export interface ReactionGroup {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export interface EnhancedChatMessage {
  id: string;
  sender_id: string;
  receiver_id?: string;
  room_id?: string | null;
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'system';
  reply_to_id?: string | null;
  attachment_url?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  timestamp?: string;
  is_read?: boolean;
  local_status?: 'sending' | 'error' | 'sent';
  profiles?: {
    username: string;
    avatar_url?: string | null;
    equipped_avatar?: string | null;
    level: number;
    elo: number;
  };
  reply_to?: {
    content: string;
    sender_username: string;
  } | null;
  reactions?: ReactionGroup[];
}

export interface ChatViewProps {
  receiverId?: string | null;
  receiverName?: string;
  receiverAvatar?: string | null;
  isReceiverOnline?: boolean;
  isReceiverInRoom?: boolean;
  showPartnerHeader?: boolean;
  isActive?: boolean;
  onMessagesRead?: () => void;
  onAvatarClick?: (playerId: string) => void;
}

const GLOBAL_ROOM_ID = 'GLOBAL';
const PAGE_SIZE = 50;
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const RECENT_EMOJIS_KEY = 'kasino21_recent_emojis';
const MAX_RECENT_EMOJIS = 16;
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '💀', '👏', '😮', '🎉'];

const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Casino',
    icon: '🎰',
    emojis: ['🎰', '🃏', '♠️', '♥️', '♦️', '♣️', '🏆', '💰', '💵', '🪙', '🎲', '🎯', '🎮', '🏅', '⭐', '💎'],
  },
  {
    label: 'Caras',
    icon: '😀',
    emojis: [
      '😀', '😂', '🤣', '😅', '😊', '😎', '🤩', '😍', '🥳', '🤔',
      '😏', '😤', '😡', '🥺', '😭', '😱', '🤯', '💀', '👻', '🤡',
      '😴', '😇', '🤠', '🥶', '🥵', '😈',
    ],
  },
  {
    label: 'Gestos',
    icon: '👍',
    emojis: [
      '👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '🤙', '💪', '👊',
      '✊', '🫡', '🫶', '☝️', '👆', '👇', '👈', '👉', '🤘',
    ],
  },
  {
    label: 'Corazones',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️',
      '💕', '💞', '💓', '💓', '💗', '💖', '💘', '💝',
    ],
  },
  {
    label: 'Cosas',
    icon: '🔥',
    emojis: [
      '🔥', '⚡', '💥', '✨', '🌟', '💫', '🎉', '🎊', '🎁', '🏁',
      '🚀', '💣', '🧨', '💬', '💯', '✅', '❌',
    ],
  },
];

function getMessageTime(msg: EnhancedChatMessage): string {
  return msg.created_at || msg.timestamp || new Date().toISOString();
}

function formatClockTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function isDifferentDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() !== db.getFullYear() ||
    da.getMonth() !== db.getMonth() ||
    da.getDate() !== db.getDate()
  );
}

function formatDateLabel(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return 'Hoy';
  if (target.getTime() === yesterday.getTime()) return 'Ayer';

  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  if (year === now.getFullYear()) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${year}`;
}

export function ChatView({
  receiverId,
  receiverName,
  receiverAvatar,
  isReceiverOnline = false,
  isReceiverInRoom = false,
  showPartnerHeader = false,
  isActive = true,
  onMessagesRead,
  onAvatarClick,
}: ChatViewProps) {
  const { user, profile } = useAuth();
  const isPrivateChat = Boolean(receiverId);
  const maxLength = isPrivateChat ? 500 : 200;

  const [messages, setMessages] = useState<EnhancedChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Estados de edición, respuesta, menú contextual y emojis
  const [replyingTo, setReplyingTo] = useState<EnhancedChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<EnhancedChatMessage | null>(null);
  const [contextMessage, setContextMessage] = useState<EnhancedChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCat, setActiveEmojiCat] = useState(0);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // Typing & Scroll
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);

  const flatListRef = useRef<FlatList<EnhancedChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const isNearBottomRef = useRef(true);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const disposedRef = useRef(false);
  const hasLoggedChatRef = useRef(false);
  const onMessagesReadRef = useRef(onMessagesRead);
  const isActiveRef = useRef(isActive);
  const prevIsActiveRef = useRef(isActive);
  const upsertIncomingMessageRef = useRef<(msgData: any, replaceTempId?: string) => Promise<void> | void>(() => {});
  const fetchMessagesRef = useRef<(silent?: boolean) => Promise<void>>(() => Promise.resolve());
  const refreshVisibleReactionsRef = useRef<() => void>(() => {});

  useEffect(() => {
    onMessagesReadRef.current = onMessagesRead;
  }, [onMessagesRead]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Cargar emojis recientes
  useEffect(() => {
    AsyncStorage.getItem(RECENT_EMOJIS_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setRecentEmojis(parsed);
        }
      })
      .catch(() => {});
  }, []);

  const addRecentEmoji = useCallback((emoji: string) => {
    setRecentEmojis((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, MAX_RECENT_EMOJIS);
      AsyncStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
      setHasNewBelow(false);
    }, 60);
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const near = distanceFromBottom < 90;
    isNearBottomRef.current = near;
    setIsNearBottom(near);
    if (near) setHasNewBelow(false);
  }, []);

  // Resolver respuestas citadas desde `messages` (privado) o `chat_messages` (global)
  const resolveReplies = useCallback(
    async (msgs: EnhancedChatMessage[]): Promise<EnhancedChatMessage[]> => {
      const replyIds = msgs
        .map((m) => m.reply_to_id)
        .filter((id): id is string => Boolean(id));

      if (replyIds.length === 0) return msgs;

      const replyMap = new Map<string, { content: string; sender_username: string }>();
      for (const m of msgs) {
        replyMap.set(m.id, {
          content: m.deleted_at ? 'Mensaje eliminado' : m.content,
          sender_username: m.profiles?.username || 'Jugador',
        });
      }

      const missingIds = [...new Set(replyIds.filter((id) => !replyMap.has(id)))];
      if (missingIds.length > 0) {
        const table = receiverId ? 'messages' : 'chat_messages';
        const selectQuery = receiverId
          ? 'id, content, deleted_at, profiles:sender_id (username)'
          : 'id, content, profiles:sender_id (username)';

        const { data } = await supabase
          .from(table)
          .select(selectQuery)
          .in('id', missingIds);

        if (data) {
          for (const row of data as any[]) {
            replyMap.set(row.id, {
              content: row.deleted_at ? 'Mensaje eliminado' : row.content,
              sender_username: row.profiles?.username || 'Jugador',
            });
          }
        }
      }

      return msgs.map((m) => {
        if (!m.reply_to_id) return m;
        const resolved = replyMap.get(m.reply_to_id);
        if (!resolved) return m;
        return {
          ...m,
          reply_to: resolved,
        };
      });
    },
    [receiverId]
  );

  // Resolver una única cita (para mensajes entrantes en tiempo real)
  const resolveSingleReply = useCallback(
    async (replyToId: string): Promise<{ content: string; sender_username: string } | null> => {
      const table = receiverId ? 'messages' : 'chat_messages';
      const selectQuery = receiverId
        ? 'content, deleted_at, profiles:sender_id (username)'
        : 'content, profiles:sender_id (username)';

      const { data } = await supabase
        .from(table)
        .select(selectQuery)
        .eq('id', replyToId)
        .maybeSingle();

      if (!data) return null;
      return {
        content: (data as any).deleted_at ? 'Mensaje eliminado' : (data as any).content,
        sender_username: (data as any).profiles?.username || 'Jugador',
      };
    },
    [receiverId]
  );

  // Cargar reacciones de mensajes privados (`message_reactions`)
  const fetchReactions = useCallback(
    async (msgIds: string[]) => {
      if (msgIds.length === 0 || !user) return new Map<string, ReactionGroup[]>();

      const validIds = msgIds.filter((id) => !id.startsWith('temp-'));
      if (validIds.length === 0) return new Map<string, ReactionGroup[]>();

      const { data } = await supabase
        .from('message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', validIds);

      const map = new Map<string, ReactionGroup[]>();
      if (!data) return map;

      const grouped = new Map<string, Map<string, { count: number; hasReacted: boolean }>>();
      for (const row of data) {
        if (!grouped.has(row.message_id)) grouped.set(row.message_id, new Map());
        const emojiMap = grouped.get(row.message_id)!;
        const entry = emojiMap.get(row.emoji) || { count: 0, hasReacted: false };
        entry.count++;
        if (row.user_id === user.id) entry.hasReacted = true;
        emojiMap.set(row.emoji, entry);
      }

      for (const [msgId, emojiMap] of grouped) {
        const groups: ReactionGroup[] = [];
        for (const [emoji, info] of emojiMap) {
          groups.push({ emoji, count: info.count, hasReacted: info.hasReacted });
        }
        map.set(msgId, groups);
      }
      return map;
    },
    [user]
  );

  // Refrescar reacciones visibles cuando cambian en Realtime
  const refreshVisibleReactions = useCallback(() => {
    if (!user || !receiverId) return;
    setMessages((prev) => {
      const ids = prev.map((m) => m.id).filter((id) => !id.startsWith('temp-'));
      if (ids.length > 0) {
        fetchReactions(ids).then((reactionsMap) => {
          if (disposedRef.current) return;
          setMessages((curr) =>
            curr.map((m) =>
              m.id.startsWith('temp-')
                ? m
                : { ...m, reactions: reactionsMap.get(m.id) || [] }
            )
          );
        });
      }
      return prev;
    });
  }, [user, receiverId, fetchReactions]);

  // Cargar historial desde `messages` (Privado) o `chat_messages` (Global), idéntico a Web ChatWindow.tsx
  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!user) return;
      if (!silent) setLoading(true);

      try {
        let data: any[] | null = null;
        let error: any = null;

        if (receiverId) {
          const res = await supabase
            .from('messages')
            .select(
              `
              id, sender_id, receiver_id, content, created_at, is_read,
              message_type, reply_to_id, attachment_url, edited_at, deleted_at,
              profiles:sender_id (username, avatar_url, equipped_avatar, level, elo)
            `
            )
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`
            )
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);

          data = res.data as any[] | null;
          error = res.error;

          // Marcar como leídos los mensajes recibidos solo si la vista de chat está activa en primer plano
          const canMarkRead =
            isActiveRef.current &&
            (AppState.currentState ? AppState.currentState === 'active' : true);
          const hasUnread = (data || []).some(
            (m: any) => m.receiver_id === user.id && !m.is_read
          );
          if (hasUnread && canMarkRead) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('receiver_id', user.id)
              .eq('sender_id', receiverId)
              .eq('is_read', false);
            onMessagesReadRef.current?.();
          }
        } else {
          const res = await supabase
            .from('chat_messages')
            .select(
              `
              id, sender_id, room_id, content, created_at, timestamp, reply_to_id,
              profiles:sender_id (username, avatar_url, equipped_avatar, level, elo)
            `
            )
            .eq('room_id', GLOBAL_ROOM_ID)
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);

          data = res.data as any[] | null;
          error = res.error;

          if (error) {
            const fallback = await supabase
              .from('chat_messages')
              .select(
                `
                id, sender_id, room_id, content, timestamp, reply_to_id,
                profiles:sender_id (username, avatar_url, equipped_avatar, level, elo)
              `
              )
              .eq('room_id', GLOBAL_ROOM_ID)
              .order('timestamp', { ascending: false })
              .limit(PAGE_SIZE);
            data = fallback.data as any[] | null;
            error = fallback.error;
          }
        }

        if (disposedRef.current) return;

        if (!error && data) {
          const reversed = [...data].reverse() as EnhancedChatMessage[];
          const withReplies = await resolveReplies(reversed);
          const reactionsMap = receiverId
            ? await fetchReactions(withReplies.map((m) => m.id))
            : new Map<string, ReactionGroup[]>();

          if (disposedRef.current) return;

          const enriched: EnhancedChatMessage[] = withReplies.map((m) => ({
            ...m,
            message_type: m.message_type || 'text',
            local_status: 'sent' as const,
            reactions: receiverId ? reactionsMap.get(m.id) || [] : [],
          }));

          if (!hasLoggedChatRef.current) {
            hasLoggedChatRef.current = true;
            console.log(
              receiverId ? 'Private chat messages from API:' : 'Global chat messages from API:',
              enriched.length
            );
          }

          setMessages((prev) => {
            if (!silent || prev.length === 0) return enriched;
            // Preservar mensajes optimistas locales pendientes/fallidos durante sync silencioso
            const pendingLocals = prev.filter((m) => m.id.startsWith('temp-'));
            return [...enriched, ...pendingLocals];
          });
          setHasOlderMessages(reversed.length >= PAGE_SIZE);
          setChatError(null);

          if (!silent) {
            scrollToBottom(false);
          }
        } else if (!silent) {
          setChatError('No se pudo sincronizar el chat. Intenta nuevamente.');
        }
      } catch (err) {
        console.warn('Error sincronizando chat:', err);
        if (!silent && !disposedRef.current) {
          setChatError('No se pudo sincronizar el chat. Intenta nuevamente.');
        }
      } finally {
        if (!silent && !disposedRef.current) {
          setLoading(false);
        }
      }
    },
    [user, receiverId, resolveReplies, fetchReactions, scrollToBottom]
  );

  // Mantener referencias actualizadas para evitar reconstrucción innecesaria de canales
  useEffect(() => {
    fetchMessagesRef.current = fetchMessages;
  }, [fetchMessages]);

  useEffect(() => {
    refreshVisibleReactionsRef.current = refreshVisibleReactions;
  }, [refreshVisibleReactions]);

  // Enriquecer e insertar mensaje entrante de forma inmediata (0ms) y resolver citas en background
  const upsertIncomingMessage = useCallback(
    async (msgData: any, replaceTempId?: string) => {
      if (disposedRef.current || !user) return;

      const isSenderMe = msgData.sender_id === user.id;
      const initialProfile = isSenderMe
        ? {
            username: profile?.username || 'Tú',
            avatar_url: profile?.avatar_url,
            equipped_avatar: profile?.equipped_avatar,
            level: profile?.level || 1,
            elo: profile?.elo || 1000,
          }
        : {
            username: receiverName || 'Jugador',
            avatar_url: receiverAvatar || null,
            equipped_avatar: receiverAvatar || null,
            level: 1,
            elo: 1000,
          };

      const fullMsg: EnhancedChatMessage = {
        ...msgData,
        message_type: msgData.message_type || 'text',
        local_status: 'sent',
        profiles: initialProfile,
        reply_to: null,
        reactions: [],
      };

      // 1. Renderizado instantáneo (0ms de latencia)
      setMessages((prev) => {
        if (replaceTempId) {
          const withoutTemp = prev.filter((m) => m.id !== replaceTempId);
          const existingIdx = withoutTemp.findIndex((m) => m.id === fullMsg.id);
          if (existingIdx >= 0) {
            const next = [...withoutTemp];
            next[existingIdx] = { ...next[existingIdx], ...fullMsg };
            return next;
          }
          return [...withoutTemp, fullMsg];
        }

        const existingIdx = prev.findIndex((m) => m.id === fullMsg.id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = { ...next[existingIdx], ...fullMsg };
          return next;
        }

        const tempIdx = prev.findIndex(
          (m) =>
            m.id.startsWith('temp-') &&
            m.sender_id === fullMsg.sender_id &&
            m.content === fullMsg.content
        );
        if (tempIdx >= 0) {
          const next = [...prev];
          next[tempIdx] = fullMsg;
          return next;
        }

        return [...prev, fullMsg];
      });

      if (isNearBottomRef.current || msgData.sender_id === user.id) {
        scrollToBottom(true);
      } else {
        setHasNewBelow(true);
      }

      // 2. Enriquecer cita citada de forma asíncrona si existe
      if (msgData.reply_to_id) {
        resolveSingleReply(msgData.reply_to_id).then((replyData) => {
          if (replyData && !disposedRef.current) {
            setMessages((prev) =>
              prev.map((m) => (m.id === fullMsg.id ? { ...m, reply_to: replyData } : m))
            );
          }
        });
      }

      // 3. Enriquecer perfil si es ajeno en chat global
      if (!isSenderMe && (!receiverName || msgData.room_id)) {
        supabase
          .from('profiles')
          .select('username, avatar_url, equipped_avatar, level, elo')
          .eq('id', msgData.sender_id)
          .maybeSingle()
          .then(({ data: sp }) => {
            if (sp && !disposedRef.current) {
              setMessages((prev) =>
                prev.map((m) => (m.id === fullMsg.id ? { ...m, profiles: sp } : m))
              );
            }
          });
      }
    },
    [
      user,
      profile?.username,
      profile?.avatar_url,
      profile?.equipped_avatar,
      profile?.level,
      profile?.elo,
      receiverName,
      receiverAvatar,
      resolveSingleReply,
      scrollToBottom,
    ]
  );

  useEffect(() => {
    upsertIncomingMessageRef.current = upsertIncomingMessage;
  }, [upsertIncomingMessage]);

  // Escuchar mensajes entrantes en tiempo real despachados por el bus de eventos global (0ms)
  useEffect(() => {
    if (!user) return;

    const handleRealtimeMessage = (newMsg: any) => {
      if (!newMsg || disposedRef.current) return;
      const incomingSender = String(newMsg.sender_id || '');
      const incomingReceiver = String(newMsg.receiver_id || '');

      if (receiverId) {
        // Chat Privado
        const isFromPartner =
          incomingSender === String(receiverId) && incomingReceiver === String(user.id);
        const isFromMe =
          incomingSender === String(user.id) && incomingReceiver === String(receiverId);

        if (isFromPartner) {
          setOtherUserTyping(false);
          const canMarkRead =
            isActiveRef.current &&
            (AppState.currentState ? AppState.currentState === 'active' : true);

          if (canMarkRead) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then(() => {
                onMessagesReadRef.current?.();
                appEvents.emit('private_messages_read', { friendId: receiverId });
              });
            upsertIncomingMessageRef.current?.({ ...newMsg, is_read: true });
          } else {
            upsertIncomingMessageRef.current?.(newMsg);
          }
        } else if (isFromMe) {
          upsertIncomingMessageRef.current?.(newMsg);
        }
      } else {
        // Chat Global
        if (newMsg.room_id === GLOBAL_ROOM_ID || !newMsg.receiver_id) {
          upsertIncomingMessageRef.current?.(newMsg);
        }
      }
    };

    appEvents.on('realtime_chat_message', handleRealtimeMessage);
    return () => {
      appEvents.off('realtime_chat_message', handleRealtimeMessage);
    };
  }, [user?.id, receiverId]);

  // Fallback sync loop cada 3.5 segundos mientras la conversación esté activa en pantalla
  useEffect(() => {
    if (!user || !isActive) return;

    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active' && !disposedRef.current) {
        fetchMessagesRef.current?.(true);
      }
    }, 3500);

    return () => clearInterval(intervalId);
  }, [user?.id, receiverId, isActive]);

  // Efecto Principal: Carga inicial + Suscripciones Realtime (DB + Presence Typing + Reacciones)
  useEffect(() => {
    if (!user) return;
    disposedRef.current = false;
    isTypingRef.current = false;
    isNearBottomRef.current = true;

    setMessages([]);
    setReplyingTo(null);
    setEditingMessage(null);
    setContextMessage(null);
    setShowEmojiPicker(false);
    setOtherUserTyping(false);
    setHasOlderMessages(false);
    setHasNewBelow(false);
    setIsNearBottom(true);
    setChatError(null);

    fetchMessagesRef.current?.(false);

    // Mismo formato de canales que Web `ChatWindow.tsx` para interoperabilidad Web <-> Mobile
    const conversationKey = receiverId
      ? `chat_private_${[user.id, receiverId].sort().join('_')}`
      : `chat_global_${GLOBAL_ROOM_ID}`;

    const dbChannel = supabase.channel(`${conversationKey}_db_${Date.now()}`);
    const presenceChannel = supabase.channel(`${conversationKey}_presence`);
    presenceChannelRef.current = presenceChannel;

    if (receiverId) {
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
            if (disposedRef.current) return;
            const incoming = payload.new as any;
            if (String(incoming.sender_id) === String(receiverId)) {
              setOtherUserTyping(false);
              const canMarkRead =
                isActiveRef.current &&
                (AppState.currentState ? AppState.currentState === 'active' : true);
              if (canMarkRead) {
                await supabase.from('messages').update({ is_read: true }).eq('id', incoming.id);
                onMessagesReadRef.current?.();
                appEvents.emit('private_messages_read', { friendId: receiverId });
                await upsertIncomingMessageRef.current?.({ ...incoming, is_read: true });
              } else {
                await upsertIncomingMessageRef.current?.(incoming);
              }
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
            if (disposedRef.current) return;
            const outgoing = payload.new as any;
            if (String(outgoing.receiver_id) === String(receiverId)) {
              upsertIncomingMessageRef.current?.(outgoing);
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
            if (disposedRef.current) return;
            const updated = payload.new as any;
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== updated.id) return m;
                return {
                  ...m,
                  content: updated.content ?? m.content,
                  edited_at: updated.edited_at ?? m.edited_at,
                  deleted_at: updated.deleted_at ?? m.deleted_at,
                  is_read: updated.is_read ?? m.is_read,
                  local_status: 'sent',
                };
              })
            );
          }
        );
    } else {
      dbChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${GLOBAL_ROOM_ID}`,
        },
        (payload) => {
          if (disposedRef.current) return;
          upsertIncomingMessageRef.current?.(payload.new);
        }
      );
    }

    dbChannel.subscribe();

    // Presencia de escritura ("Escribiendo...") compatible con Web ChatWindow.tsx
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        if (disposedRef.current) return;
        const state = presenceChannel.presenceState();
        const typing = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.user_id !== user.id && p.is_typing)
        );
        setOtherUserTyping(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && !disposedRef.current) {
          await presenceChannel.track({ user_id: user.id, is_typing: false });
        }
      });

    // Canal Realtime de reacciones (solo Chat Privado)
    let reactionsChannel: ReturnType<typeof supabase.channel> | null = null;
    if (receiverId) {
      reactionsChannel = supabase
        .channel(`${conversationKey}_reactions_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'message_reactions' },
          () => {
            if (!disposedRef.current) refreshVisibleReactionsRef.current?.();
          }
        )
        .subscribe();
    }

    // Sincronizar al volver la app a primer plano
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !disposedRef.current) {
        fetchMessagesRef.current?.(true);
      }
    });

    return () => {
      disposedRef.current = true;
      presenceChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      appStateSub.remove();
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(presenceChannel);
      if (reactionsChannel) supabase.removeChannel(reactionsChannel);
    };
  }, [user?.id, receiverId]);

  // Al volver a enfocar esta conversación desde otra pestaña, sincronizar y marcar leídos
  useEffect(() => {
    const becameActive = !prevIsActiveRef.current && isActive;
    prevIsActiveRef.current = isActive;
    if (becameActive && receiverId && user && !disposedRef.current) {
      fetchMessages(true);
    }
  }, [isActive, receiverId, user, fetchMessages]);

  // Cargar mensajes anteriores (Paginación infinita en Privado y Global)
  const loadOlderMessages = useCallback(async () => {
    if (!user || loadingOlder || !hasOlderMessages || messages.length === 0) return;
    const oldest = messages[0];
    const oldestTime = getMessageTime(oldest);

    setLoadingOlder(true);
    try {
      let data: any[] | null = null;
      let error: any = null;

      if (receiverId) {
        const res = await supabase
          .from('messages')
          .select(
            `
            id, sender_id, receiver_id, content, created_at, is_read,
            message_type, reply_to_id, attachment_url, edited_at, deleted_at,
            profiles:sender_id (username, avatar_url, equipped_avatar, level, elo)
          `
          )
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`
          )
          .lt('created_at', oldestTime)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);
        data = res.data as any[] | null;
        error = res.error;
      } else {
        const res = await supabase
          .from('chat_messages')
          .select(
            `
            id, sender_id, room_id, content, created_at, timestamp, reply_to_id,
            profiles:sender_id (username, avatar_url, equipped_avatar, level, elo)
          `
          )
          .eq('room_id', GLOBAL_ROOM_ID)
          .lt('created_at', oldestTime)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);
        data = res.data as any[] | null;
        error = res.error;
      }

      if (!error && data && data.length > 0) {
        setHasOlderMessages(data.length >= PAGE_SIZE);
        const reversed = [...data].reverse() as EnhancedChatMessage[];
        const withReplies = await resolveReplies(reversed);
        const reactionsMap = receiverId
          ? await fetchReactions(withReplies.map((m) => m.id))
          : new Map<string, ReactionGroup[]>();

        const enriched = withReplies.map((m) => ({
          ...m,
          message_type: m.message_type || 'text',
          local_status: 'sent' as const,
          reactions: receiverId ? reactionsMap.get(m.id) || [] : [],
        }));

        setMessages((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueOlder = enriched.filter((m) => !existingIds.has(m.id));
          return [...uniqueOlder, ...prev];
        });
      } else {
        setHasOlderMessages(false);
      }
    } catch (err) {
      console.warn('Error cargando mensajes anteriores:', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [user, receiverId, loadingOlder, hasOlderMessages, messages, resolveReplies, fetchReactions]);

  // Emitir estado de escritura vía Presence (idéntico a Web ChatWindow.tsx)
  const emitTyping = useCallback(() => {
    if (!user) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      presenceChannelRef.current?.track({ user_id: user.id, is_typing: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      presenceChannelRef.current?.track({ user_id: user.id, is_typing: false });
    }, 2000);
  }, [user]);

  // Enviar o confirmar edición de mensaje
  const handleSendOrEdit = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !user) return;
    triggerHaptic('light');
    setShowEmojiPicker(false);

    // Detener indicador de escritura
    isTypingRef.current = false;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    presenceChannelRef.current?.track({ user_id: user.id, is_typing: false });

    // Si estamos editando un mensaje propio (Chat Privado)
    if (editingMessage && isPrivateChat) {
      const targetId = editingMessage.id;
      const prevContent = editingMessage.content;
      setEditingMessage(null);
      setInputText('');

      if (trimmed === prevContent) return;

      const editedIso = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, content: trimmed, edited_at: editedIso } : m))
      );

      const { error } = await supabase
        .from('messages')
        .update({ content: trimmed, edited_at: editedIso })
        .eq('id', targetId)
        .eq('sender_id', user.id);

      if (error) {
        fetchMessages(true);
      }
      return;
    }

    // Nuevo mensaje (Privado o Global)
    const replyTarget = replyingTo;
    setReplyingTo(null);
    setInputText('');

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: EnhancedChatMessage = {
      id: tempId,
      sender_id: user.id,
      receiver_id: receiverId || undefined,
      room_id: receiverId ? null : GLOBAL_ROOM_ID,
      content: trimmed,
      message_type: 'text',
      reply_to_id: replyTarget?.id && !replyTarget.id.startsWith('temp-') ? replyTarget.id : null,
      created_at: new Date().toISOString(),
      is_read: false,
      local_status: 'sending',
      profiles: {
        username: profile?.username || 'Tú',
        avatar_url: profile?.avatar_url,
        equipped_avatar: profile?.equipped_avatar,
        level: profile?.level || 1,
        elo: profile?.elo || 1000,
      },
      reply_to: replyTarget
        ? {
            content: replyTarget.content,
            sender_username: replyTarget.profiles?.username || 'Jugador',
          }
        : null,
      reactions: [],
    };

    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom(true);

    try {
      if (receiverId) {
        const insertPayload: Record<string, unknown> = {
          sender_id: user.id,
          receiver_id: receiverId,
          content: trimmed,
        };
        if (replyTarget?.id && !replyTarget.id.startsWith('temp-')) {
          insertPayload.reply_to_id = replyTarget.id;
        }

        const { data, error } = await supabase
          .from('messages')
          .insert(insertPayload)
          .select(
            'id, sender_id, receiver_id, content, created_at, is_read, message_type, reply_to_id, edited_at, deleted_at'
          )
          .single();

        if (error) throw error;
        await upsertIncomingMessage(data, tempId);
      } else {
        // Recompensa +2 XP por mensaje en Chat Global (igual que Web ChatWindow.tsx)
        try {
          await supabase.rpc('add_player_xp', { p_id: user.id, p_xp_amount: 2 });
        } catch {}

        const insertPayload: Record<string, unknown> = {
          sender_id: user.id,
          room_id: GLOBAL_ROOM_ID,
          content: trimmed,
        };
        if (replyTarget?.id && !replyTarget.id.startsWith('temp-')) {
          insertPayload.reply_to_id = replyTarget.id;
        }

        const { data, error } = await supabase
          .from('chat_messages')
          .insert(insertPayload)
          .select('id, sender_id, room_id, content, created_at, timestamp, reply_to_id')
          .single();

        if (error) throw error;
        await upsertIncomingMessage(data, tempId);
      }
      setChatError(null);
    } catch (err) {
      console.warn('Error enviando mensaje:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, local_status: 'error' } : m))
      );
      setChatError('No se pudo enviar el mensaje. Puedes reintentar.');
    }
  };

  // Reintentar mensaje fallido
  const handleRetry = async (failedMsg: EnhancedChatMessage) => {
    if (!user) return;
    triggerHaptic('light');
    setMessages((prev) =>
      prev.map((m) => (m.id === failedMsg.id ? { ...m, local_status: 'sending' } : m))
    );

    try {
      if (receiverId) {
        const insertPayload: Record<string, unknown> = {
          sender_id: user.id,
          receiver_id: receiverId,
          content: failedMsg.content,
        };
        if (failedMsg.reply_to_id) insertPayload.reply_to_id = failedMsg.reply_to_id;

        const { data, error } = await supabase
          .from('messages')
          .insert(insertPayload)
          .select(
            'id, sender_id, receiver_id, content, created_at, is_read, message_type, reply_to_id, edited_at, deleted_at'
          )
          .single();

        if (error) throw error;
        await upsertIncomingMessage(data, failedMsg.id);
      } else {
        const insertPayload: Record<string, unknown> = {
          sender_id: user.id,
          room_id: GLOBAL_ROOM_ID,
          content: failedMsg.content,
        };
        if (failedMsg.reply_to_id) insertPayload.reply_to_id = failedMsg.reply_to_id;

        const { data, error } = await supabase
          .from('chat_messages')
          .insert(insertPayload)
          .select('id, sender_id, room_id, content, created_at, timestamp, reply_to_id')
          .single();

        if (error) throw error;
        await upsertIncomingMessage(data, failedMsg.id);
      }
      setChatError(null);
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...m, local_status: 'error' } : m))
      );
    }
  };

  // Soft-delete mensaje propio (`messages`)
  const handleDeleteMessage = async (messageId: string) => {
    if (!user || !isPrivateChat) return;
    triggerHaptic('light');
    const deletedIso = new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, deleted_at: deletedIso } : m))
    );
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: deletedIso })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      fetchMessages(true);
    }
  };

  // Toggle reacción emoji en mensaje privado (`message_reactions`)
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user || !isPrivateChat || messageId.startsWith('temp-')) return;
    triggerHaptic('light');
    addRecentEmoji(emoji);

    const msg = messages.find((m) => m.id === messageId);
    const existingGroup = msg?.reactions?.find((r) => r.emoji === emoji);
    const alreadyReacted = Boolean(existingGroup?.hasReacted);

    // Actualización optimista
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const groups = [...(m.reactions || [])];
        const idx = groups.findIndex((g) => g.emoji === emoji);
        if (alreadyReacted && idx !== -1) {
          if (groups[idx].count <= 1) {
            groups.splice(idx, 1);
          } else {
            groups[idx] = { ...groups[idx], count: groups[idx].count - 1, hasReacted: false };
          }
        } else if (idx !== -1) {
          groups[idx] = { ...groups[idx], count: groups[idx].count + 1, hasReacted: true };
        } else {
          groups.push({ emoji, count: 1, hasReacted: true });
        }
        return { ...m, reactions: groups };
      })
    );

    if (alreadyReacted) {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
    }
  };

  // Desplazarse al mensaje citado
  const scrollToQuotedMessage = (targetId: string) => {
    const idx = messages.findIndex((m) => m.id === targetId);
    if (idx === -1) return;
    try {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.4 });
      setHighlightedMsgId(targetId);
      setTimeout(() => setHighlightedMsgId(null), 1600);
    } catch {}
  };

  const allEmojiCategories =
    recentEmojis.length > 0
      ? [{ label: 'Recientes', icon: '🕐', emojis: recentEmojis }, ...EMOJI_CATEGORIES]
      : EMOJI_CATEGORIES;

  const partnerAvatarUri = resolveAvatarUrl(receiverAvatar);

  const renderMessageItem = ({ item, index }: { item: EnhancedChatMessage; index: number }) => {
    const isMe = item.sender_id === user?.id;
    const isDeleted = Boolean(item.deleted_at);
    const isEdited = Boolean(item.edited_at) && !isDeleted;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showDateSep =
      index === 0 ||
      (prevMsg ? isDifferentDay(getMessageTime(prevMsg), getMessageTime(item)) : false);

    if (item.message_type === 'system') {
      return (
        <View className="my-2 items-center">
          <Text className="text-[10px] text-gray-500 font-mono uppercase text-center">
            {item.content}
          </Text>
        </View>
      );
    }

    const senderProfile = item.profiles || {
      username: 'Jugador',
      avatar_url: null,
      equipped_avatar: null,
      level: 1,
      elo: 1000,
    };
    const senderAvatarUri = resolveAvatarUrl(
      senderProfile.equipped_avatar || senderProfile.avatar_url
    );
    const isHighlighted = highlightedMsgId === item.id;

    return (
      <View>
        {showDateSep ? (
          <View className="flex-row items-center gap-3 my-3 px-2">
            <View className="flex-1 h-px bg-white/[0.06]" />
            <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {formatDateLabel(getMessageTime(item))}
            </Text>
            <View className="flex-1 h-px bg-white/[0.06]" />
          </View>
        ) : null}

        <View
          className={`mb-2.5 ${isMe ? 'items-end' : 'items-start'} ${
            isHighlighted ? 'bg-amber-400/10 rounded-xl p-1' : ''
          }`}
        >
          {/* Identidad del remitente en mensajes ajenos */}
          {!isMe ? (
            <Pressable
              onPress={() => onAvatarClick?.(item.sender_id)}
              className="flex-row items-center gap-2 mb-1 px-1 py-0.5 rounded-lg active:bg-white/10"
            >
              <View className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 items-center justify-center overflow-hidden">
                {senderAvatarUri ? (
                  <Image
                    source={{ uri: senderAvatarUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <Text className="text-[9px] font-black text-amber-400">
                    {senderProfile.username?.charAt(0).toUpperCase() || 'J'}
                  </Text>
                )}
              </View>
              <Text className="text-[10px] font-bold text-amber-400/85">
                {senderProfile.username}
              </Text>
            </Pressable>
          ) : null}

          {/* Burbuja del mensaje (LongPress abre menú contextual) */}
          <Pressable
            onLongPress={() => {
              if (isDeleted) return;
              triggerHaptic('light');
              setContextMessage(item);
            }}
            delayLongPress={320}
            className={`max-w-[84%] px-3.5 py-2 rounded-2xl border ${
              isDeleted
                ? 'bg-white/[0.02] border-white/[0.05]'
                : isMe
                ? 'bg-amber-500/20 border-amber-400/30 rounded-tr-sm'
                : 'bg-white/[0.06] border-white/[0.08] rounded-tl-sm'
            }`}
          >
            {/* Cita de respuesta inline */}
            {item.reply_to && !isDeleted ? (
              <Pressable
                onPress={() => {
                  if (item.reply_to_id) scrollToQuotedMessage(item.reply_to_id);
                }}
                className="border-l-2 border-amber-400/60 pl-2 py-0.5 mb-1.5 bg-black/25 rounded-r-md"
              >
                <Text className="text-[10px] font-bold text-amber-400/90">
                  {item.reply_to.sender_username}
                </Text>
                <Text numberOfLines={2} className="text-[11px] text-gray-400">
                  {item.reply_to.content}
                </Text>
              </Pressable>
            ) : null}

            {/* Contenido */}
            {isDeleted ? (
              <Text className="text-gray-500 text-xs italic">🚫 Mensaje eliminado</Text>
            ) : (
              <Text className="text-white text-sm leading-5">{item.content}</Text>
            )}

            {/* Metadatos: hora, editado, check de lectura */}
            <View
              className={`flex-row items-center gap-1 mt-1 ${
                isMe ? 'justify-end' : 'justify-start'
              }`}
            >
              {isEdited ? (
                <Text className="text-[9px] text-gray-400 italic">editado</Text>
              ) : null}
              <Text className="text-[9px] text-gray-400/70">
                {formatClockTime(item.created_at || item.timestamp)}
              </Text>
              {isMe && isPrivateChat && !isDeleted ? (
                <Text
                  className={`text-[9px] font-bold ${
                    item.local_status === 'sending'
                      ? 'text-gray-500'
                      : item.is_read
                      ? 'text-sky-400'
                      : 'text-gray-400'
                  }`}
                >
                  {item.local_status === 'sending' ? '⏳' : item.is_read ? '✓✓' : '✓'}
                </Text>
              ) : null}
            </View>
          </Pressable>

          {/* Barra de reacciones */}
          {item.reactions && item.reactions.length > 0 && !isDeleted ? (
            <View className={`flex-row flex-wrap gap-1 mt-1 ${isMe ? 'pr-1' : 'pl-1'}`}>
              {item.reactions.map((r) => (
                <Pressable
                  key={r.emoji}
                  onPress={() => handleToggleReaction(item.id, r.emoji)}
                  className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full border ${
                    r.hasReacted
                      ? 'bg-amber-400/15 border-amber-400/40'
                      : 'bg-white/[0.04] border-white/[0.08]'
                  }`}
                >
                  <Text className="text-xs">{r.emoji}</Text>
                  <Text
                    className={`text-[10px] font-bold ${
                      r.hasReacted ? 'text-amber-400' : 'text-gray-400'
                    }`}
                  >
                    {r.count}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Estado de error / Reintentar */}
          {isMe && item.local_status === 'error' ? (
            <Pressable
              onPress={() => handleRetry(item)}
              className="flex-row items-center gap-1 mt-1"
            >
              <RotateCcw color="#f87171" size={11} />
              <Text className="text-[10px] text-red-400 font-bold">
                Error al enviar. Reintentar.
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };

  // Permisos del menú contextual para el mensaje seleccionado
  const canEditContextMsg = Boolean(
    contextMessage &&
      isPrivateChat &&
      contextMessage.sender_id === user?.id &&
      !contextMessage.deleted_at &&
      contextMessage.created_at &&
      Date.now() - new Date(contextMessage.created_at).getTime() < EDIT_WINDOW_MS
  );
  const canDeleteContextMsg = Boolean(
    contextMessage &&
      isPrivateChat &&
      contextMessage.sender_id === user?.id &&
      !contextMessage.deleted_at
  );

  return (
    <View className="flex-1 bg-black/30 rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Cabecera opcional del contacto activo */}
      {showPartnerHeader && receiverId ? (
        <Pressable
          onPress={() => onAvatarClick?.(receiverId)}
          className="flex-row items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[0.06] bg-white/[0.02]"
        >
          <View className="relative">
            <View className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 items-center justify-center overflow-hidden">
              {partnerAvatarUri ? (
                <Image
                  source={{ uri: partnerAvatarUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <Text className="text-xs font-black text-amber-400">
                  {receiverName?.charAt(0).toUpperCase() || 'J'}
                </Text>
              )}
            </View>
            <View
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                isReceiverOnline && isReceiverInRoom
                  ? 'bg-purple-500'
                  : isReceiverOnline
                  ? 'bg-emerald-400'
                  : 'bg-gray-600'
              }`}
            />
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-xs font-bold text-white">
              {receiverName || 'Jugador'}
            </Text>
            <Text
              className={`text-[10px] font-semibold ${
                otherUserTyping
                  ? 'text-amber-400'
                  : isReceiverOnline && isReceiverInRoom
                  ? 'text-purple-400'
                  : isReceiverOnline
                  ? 'text-emerald-400'
                  : 'text-gray-500'
              }`}
            >
              {otherUserTyping
                ? 'Escribiendo...'
                : isReceiverOnline && isReceiverInRoom
                ? '🎮 En partida'
                : isReceiverOnline
                ? 'En línea'
                : 'Desconectado'}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {/* Banner de error de sincronización */}
      {chatError ? (
        <View className="mx-2.5 mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 flex-row items-center justify-between">
          <Text className="text-[11px] text-red-300 flex-1 mr-2">{chatError}</Text>
          <Pressable onPress={() => fetchMessages(false)}>
            <Text className="text-[11px] font-bold text-red-200">Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Lista de Mensajes */}
      <View className="flex-1 relative">
        {loading && messages.length === 0 ? (
          <View className="flex-1 items-center justify-center py-8">
            <ActivityIndicator color="#fbbf24" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            extraData={messages.length}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            onScroll={handleScroll}
            scrollEventThrottle={80}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexGrow: 1,
            }}
            onScrollToIndexFailed={() => {}}
            ListHeaderComponent={
              hasOlderMessages ? (
                <Pressable
                  onPress={loadOlderMessages}
                  disabled={loadingOlder}
                  className="py-2 mb-2 items-center"
                >
                  {loadingOlder ? (
                    <ActivityIndicator size="small" color="#9ca3af" />
                  ) : (
                    <Text className="text-[11px] font-bold text-amber-400/80">
                      ↑ Cargar mensajes anteriores
                    </Text>
                  )}
                </Pressable>
              ) : messages.length > 0 ? (
                <Text className="text-center text-[10px] text-gray-600 py-2">
                  — Inicio de la conversación —
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-10 px-6">
                <Text className="text-3xl mb-2">{receiverId ? '💬' : '🌍'}</Text>
                <Text className="text-gray-400 text-xs font-bold text-center">
                  {receiverId
                    ? `Inicia la conversación con ${receiverName || 'tu amigo'}`
                    : 'Di hola al chat global...'}
                </Text>
                <Text className="text-gray-600 text-[10px] text-center mt-1">
                  Mantén presionado un mensaje para responder
                  {isPrivateChat ? ', reaccionar o editar' : ' o copiar'}
                </Text>
              </View>
            }
            ListFooterComponent={
              otherUserTyping ? (
                <View className="flex-row items-center gap-1.5 px-2 py-1">
                  <Text className="text-[10px] text-amber-400/80 italic font-semibold">
                    {receiverId ? 'Escribiendo...' : 'Alguien está escribiendo...'}
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {/* Píldora flotante "↓ Nuevos mensajes" */}
        {hasNewBelow && !isNearBottom ? (
          <Pressable
            onPress={() => scrollToBottom(true)}
            className="absolute bottom-3 self-center bg-amber-400 px-3.5 py-1.5 rounded-full shadow-lg"
          >
            <Text className="text-slate-950 text-xs font-black">↓ Nuevos mensajes</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Selector de Emojis Categorizado */}
      {showEmojiPicker ? (
        <View className="bg-slate-950 border-t border-white/10">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="border-b border-white/[0.06] px-2"
          >
            {allEmojiCategories.map((cat, idx) => (
              <Pressable
                key={cat.label}
                onPress={() => setActiveEmojiCat(idx)}
                className={`px-3 py-2 border-b-2 flex-row items-center gap-1 ${
                  activeEmojiCat === idx ? 'border-amber-400' : 'border-transparent'
                }`}
              >
                <Text className="text-sm">{cat.icon}</Text>
                <Text
                  className={`text-[10px] font-bold uppercase ${
                    activeEmojiCat === idx ? 'text-amber-400' : 'text-gray-500'
                  }`}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView style={{ maxHeight: 148 }} contentContainerStyle={{ padding: 8 }}>
            <View className="flex-row flex-wrap">
              {(allEmojiCategories[activeEmojiCat]?.emojis || []).map((emoji, i) => (
                <Pressable
                  key={`${emoji}-${i}`}
                  onPress={() => {
                    triggerHaptic('light');
                    addRecentEmoji(emoji);
                    setInputText((prev) => (prev + emoji).slice(0, maxLength));
                  }}
                  className="w-10 h-9 items-center justify-center rounded-lg active:bg-white/10"
                >
                  <Text className="text-lg">{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {/* Banner de Respuesta Activa */}
      {replyingTo && !editingMessage ? (
        <View className="flex-row items-center gap-2 px-3 py-2 bg-white/[0.04] border-t border-white/10">
          <View className="flex-1 border-l-2 border-amber-400 pl-2">
            <Text className="text-[10px] font-bold text-amber-400">
              Respondiendo a {replyingTo.profiles?.username || 'Jugador'}
            </Text>
            <Text numberOfLines={1} className="text-[11px] text-gray-400">
              {replyingTo.content}
            </Text>
          </View>
          <Pressable
            onPress={() => setReplyingTo(null)}
            className="w-6 h-6 rounded-full bg-white/5 items-center justify-center"
          >
            <X color="#d1d5db" size={13} />
          </Pressable>
        </View>
      ) : null}

      {/* Banner de Edición Activa */}
      {editingMessage ? (
        <View className="flex-row items-center gap-2 px-3 py-2 bg-amber-400/10 border-t border-amber-400/25">
          <Edit2 color="#fbbf24" size={14} />
          <Text className="text-[11px] text-amber-400 font-bold flex-1">
            Editando mensaje
          </Text>
          <Pressable
            onPress={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            className="w-6 h-6 rounded-full bg-white/5 items-center justify-center"
          >
            <X color="#d1d5db" size={13} />
          </Pressable>
        </View>
      ) : null}

      {/* Barra de Entrada */}
      <View className="flex-row items-end gap-2 px-2.5 py-2 bg-slate-950/90 border-t border-white/[0.07]">
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setShowEmojiPicker((v) => !v);
          }}
          className={`w-9 h-9 rounded-xl items-center justify-center ${
            showEmojiPicker ? 'bg-amber-400/15' : 'bg-white/5'
          }`}
        >
          <Smile color={showEmojiPicker ? '#fbbf24' : '#9ca3af'} size={18} />
        </Pressable>

        <View className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-1.5">
          <TextInput
            ref={inputRef}
            value={inputText}
            onChangeText={(val) => {
              setInputText(val);
              emitTyping();
            }}
            placeholder={receiverId ? 'Mensaje privado...' : 'Chat global...'}
            placeholderTextColor="#6b7280"
            maxLength={maxLength}
            multiline
            style={{ maxHeight: 88, minHeight: 24 }}
            className="text-white text-sm py-0.5"
          />
          {inputText.length > maxLength * 0.8 ? (
            <Text
              className={`text-[9px] font-mono self-end ${
                inputText.length > maxLength * 0.95 ? 'text-red-400' : 'text-gray-500'
              }`}
            >
              {inputText.length}/{maxLength}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={handleSendOrEdit}
          disabled={!inputText.trim()}
          className={`w-9 h-9 rounded-xl items-center justify-center ${
            !inputText.trim()
              ? 'bg-white/5 opacity-40'
              : editingMessage
              ? 'bg-emerald-500'
              : 'bg-amber-400'
          }`}
        >
          {editingMessage ? (
            <Check color="#020617" size={18} />
          ) : (
            <Send color={!inputText.trim() ? '#9ca3af' : '#020617'} size={16} />
          )}
        </Pressable>
      </View>

      {/* Modal de Menú Contextual de Mensaje (Reacciones rápidas + Responder/Copiar/Editar/Eliminar) */}
      <Modal
        visible={Boolean(contextMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setContextMessage(null)}
      >
        <Pressable
          onPress={() => setContextMessage(null)}
          className="flex-1 bg-black/75 justify-center items-center px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-slate-900 border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Fila rápida de reacciones (en Chat Privado) */}
            {isPrivateChat && contextMessage && !contextMessage.id.startsWith('temp-') ? (
              <View className="flex-row items-center justify-between px-3 py-2.5 bg-slate-950 border-b border-white/10">
                {QUICK_REACTIONS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => {
                      const targetId = contextMessage.id;
                      setContextMessage(null);
                      handleToggleReaction(targetId, emoji);
                    }}
                    className="w-8 h-8 rounded-lg items-center justify-center active:bg-white/15"
                  >
                    <Text className="text-lg">{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Vista previa del texto seleccionado */}
            {contextMessage ? (
              <View className="px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                <Text numberOfLines={2} className="text-xs text-gray-400 italic">
                  "{contextMessage.content}"
                </Text>
              </View>
            ) : null}

            {/* Responder (disponible tanto en Privado como en Global igual que Web) */}
            {contextMessage && !contextMessage.id.startsWith('temp-') ? (
              <Pressable
                onPress={() => {
                  const target = contextMessage;
                  setContextMessage(null);
                  setEditingMessage(null);
                  setReplyingTo(target);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className="flex-row items-center gap-3 px-4 py-3 border-b border-white/[0.05] active:bg-white/10"
              >
                <Reply color="#fbbf24" size={16} />
                <Text className="text-white text-sm font-semibold">Responder</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={async () => {
                if (contextMessage) {
                  await Clipboard.setStringAsync(contextMessage.content).catch(() => {});
                  triggerHaptic('success');
                }
                setContextMessage(null);
              }}
              className="flex-row items-center gap-3 px-4 py-3 border-b border-white/[0.05] active:bg-white/10"
            >
              <Copy color="#d1d5db" size={16} />
              <Text className="text-white text-sm font-semibold">Copiar texto</Text>
            </Pressable>

            {canEditContextMsg && contextMessage ? (
              <Pressable
                onPress={() => {
                  const target = contextMessage;
                  setContextMessage(null);
                  setReplyingTo(null);
                  setEditingMessage(target);
                  setInputText(target.content);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className="flex-row items-center gap-3 px-4 py-3 border-b border-white/[0.05] active:bg-white/10"
              >
                <Edit2 color="#34d399" size={16} />
                <Text className="text-emerald-400 text-sm font-semibold">Editar mensaje</Text>
              </Pressable>
            ) : null}

            {canDeleteContextMsg && contextMessage ? (
              <Pressable
                onPress={() => {
                  const targetId = contextMessage.id;
                  setContextMessage(null);
                  handleDeleteMessage(targetId);
                }}
                className="flex-row items-center gap-3 px-4 py-3 active:bg-red-500/15"
              >
                <Trash2 color="#f87171" size={16} />
                <Text className="text-red-400 text-sm font-semibold">Eliminar mensaje</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
