import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { ChatMessageBubble, EnhancedChatMessage } from './chat/ChatMessageBubble';
import { ChatDateSeparator, isDifferentDay } from './chat/ChatDateSeparator';
import { ChatInput } from './chat/ChatInput';
import { ReactionGroup } from './chat/ChatReactionBar';

const GLOBAL_ROOM_ID = 'GLOBAL';
const PAGE_SIZE = 50;
const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface ChatWindowProps {
  receiverId?: string; // If provided, we're in private chat
}

export function ChatWindow({ receiverId }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'degraded'>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const disposedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const forceScrollRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  // Enhanced chat states
  const [replyingTo, setReplyingTo] = useState<EnhancedChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<EnhancedChatMessage | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const isPrivateChat = !!receiverId;

  const getMessageTime = (m: EnhancedChatMessage) => m.created_at || m.timestamp || new Date().toISOString();

  const upsertMessage = useCallback((msg: EnhancedChatMessage) => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === msg.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = { ...next[index], ...msg, local_status: msg.local_status || 'sent' };
        return next;
      }
      return [...prev, { ...msg, local_status: msg.local_status || 'sent' }];
    });
  }, []);

  // ── Sync: Private vs Global ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    disposedRef.current = false;
    setChatError(null);
    setRealtimeStatus('connecting');
    setMessages([]);
    setReplyingTo(null);
    setEditingMessage(null);
    setHasMore(true);
    isNearBottomRef.current = true;
    setIsNearBottom(true);
    setHasNewBelow(false);
    prevMessageCountRef.current = 0;
    fetchMessages();

    const conversationKey = receiverId
      ? `chat_private_${[user.id, receiverId].sort().join('_')}`
      : `chat_global_${GLOBAL_ROOM_ID}`;

    const dbChannel = supabase.channel(`${conversationKey}_db_${Date.now()}`);
    const presenceChannel = supabase.channel(`${conversationKey}_presence`);
    presenceChannelRef.current = presenceChannel;

    if (receiverId) {
      // Private Chat Listeners
      dbChannel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        }, async (payload) => {
          if (payload.new.sender_id === receiverId) {
            await supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id);
            fetchNewMessageProfile(payload.new);
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        }, (payload) => {
          if (payload.new.receiver_id === receiverId) {
            fetchNewMessageProfile(payload.new);
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        }, (payload) => {
          // Handle edits, deletes, read status updates
          if (disposedRef.current) return;
          const updated = payload.new;
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
        });
    } else {
      // Global Chat Listeners
      dbChannel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${GLOBAL_ROOM_ID}`,
      }, async (payload) => {
        fetchNewMessageProfile(payload.new);
      });
    }

    dbChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setRealtimeStatus('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setRealtimeStatus('degraded');
      }
    });

    // Typing presence
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

    // Reactions real-time (private chat only)
    let reactionsChannel: ReturnType<typeof supabase.channel> | null = null;
    if (receiverId) {
      reactionsChannel = supabase.channel(`${conversationKey}_reactions_${Date.now()}`);
      reactionsChannel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        }, () => {
          // Refresh reactions for visible messages
          refreshReactions();
        })
        .subscribe();
    }

    return () => {
      disposedRef.current = true;
      presenceChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(presenceChannel);
      if (reactionsChannel) supabase.removeChannel(reactionsChannel);
    };
  }, [user, receiverId]);

  // Fallback sync loop
  useEffect(() => {
    if (!user) return;
    const pollId = window.setInterval(() => {
      fetchMessages();
    }, 3000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchMessages();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, receiverId]);

  // Auto-scroll on new messages
  useEffect(() => {
    const currentCount = messages.length;
    if (currentCount === prevMessageCountRef.current) return;
    prevMessageCountRef.current = currentCount;

    if (forceScrollRef.current || isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      forceScrollRef.current = false;
    } else {
      setHasNewBelow(true);
    }
  }, [messages]);

  // ── Fetch helpers ────────────────────────────────────────────
  const fetchNewMessageProfile = async (msgData: any) => {
    if (disposedRef.current) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url, equipped_avatar, level, elo')
      .eq('id', msgData.sender_id)
      .single();
    if (disposedRef.current) return;

    const newMessage: EnhancedChatMessage = {
      ...msgData,
      message_type: msgData.message_type || 'text',
      profiles: profile,
      local_status: 'sent',
    };

    // Resolve reply_to if present
    if (newMessage.reply_to_id) {
      newMessage.reply_to = await resolveReplyTo(newMessage.reply_to_id);
    }

    upsertMessage(newMessage);
  };

  const resolveReplyTo = async (replyToId: string): Promise<{ content: string; sender_username: string } | null> => {
    const table = receiverId ? 'messages' : 'chat_messages';
    const { data } = await supabase
      .from(table)
      .select('content, profiles:sender_id (username)')
      .eq('id', replyToId)
      .single();
    if (!data) return null;
    const prof = data.profiles as any;
    return {
      content: (data as any).deleted_at ? 'Mensaje eliminado' : data.content,
      sender_username: prof?.username || 'Jugador',
    };
  };

  const fetchMessages = async () => {
    if (!user) return;
    try {
      let query;
      if (receiverId) {
        query = supabase
          .from('messages')
          .select(`
            id, sender_id, receiver_id, content, created_at, is_read,
            message_type, reply_to_id, attachment_url, edited_at, deleted_at,
            profiles:sender_id (username, avatar_url, equipped_avatar, level, elo)
          `)
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`);

        // Mark all as read
        await supabase.from('messages')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('sender_id', receiverId)
          .eq('is_read', false);
      } else {
        query = supabase
          .from('chat_messages')
          .select(`
            id, sender_id, room_id, content, created_at, timestamp,
            profiles:sender_id (username, avatar_url, equipped_avatar, level, elo)
          `)
          .eq('room_id', GLOBAL_ROOM_ID);
      }

      let { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (!receiverId && error) {
        const fallback = await supabase
          .from('chat_messages')
          .select(`
            id, sender_id, room_id, content, timestamp,
            profiles:sender_id (username, avatar_url, equipped_avatar, level, elo)
          `)
          .eq('room_id', GLOBAL_ROOM_ID)
          .order('timestamp', { ascending: false })
          .limit(PAGE_SIZE);
        data = fallback.data as any;
        error = fallback.error as any;
      }

      if (!error && data) {
        const reversed = (data as any[]).reverse();
        const enriched: EnhancedChatMessage[] = reversed.map((m) => ({
          ...m,
          message_type: m.message_type || 'text',
          local_status: 'sent' as const,
        }));

        // Resolve reply_to references
        if (receiverId) {
          await resolveReplyTos(enriched);
          await fetchReactionsForMessages(enriched);
        }

        setMessages(enriched);
        setHasMore(reversed.length >= PAGE_SIZE);
        setChatError(null);
      } else {
        setChatError('No se pudo sincronizar el chat. Intenta nuevamente.');
        setRealtimeStatus('degraded');
      }
    } catch (err) {
      console.error(err);
      setChatError('No se pudo sincronizar el chat. Intenta nuevamente.');
      setRealtimeStatus('degraded');
    }
  };

  const resolveReplyTos = async (msgs: EnhancedChatMessage[]) => {
    const replyIds = msgs.filter((m) => m.reply_to_id).map((m) => m.reply_to_id!);
    if (replyIds.length === 0) return;

    const { data } = await supabase
      .from('messages')
      .select('id, content, deleted_at, profiles:sender_id (username)')
      .in('id', replyIds);

    if (!data) return;
    const replyMap = new Map(data.map((r: any) => [
      r.id,
      {
        content: r.deleted_at ? 'Mensaje eliminado' : r.content,
        sender_username: (r.profiles as any)?.username || 'Jugador',
      },
    ]));

    msgs.forEach((m) => {
      if (m.reply_to_id && replyMap.has(m.reply_to_id)) {
        m.reply_to = replyMap.get(m.reply_to_id)!;
      }
    });
  };

  const fetchReactionsForMessages = async (msgs: EnhancedChatMessage[]) => {
    if (!user) return;
    const msgIds = msgs.map((m) => m.id);
    if (msgIds.length === 0) return;

    const { data } = await supabase
      .from('message_reactions')
      .select('message_id, emoji, user_id')
      .in('message_id', msgIds);

    if (!data) return;

    // Group reactions
    const reactionsMap = new Map<string, ReactionGroup[]>();
    const grouped = new Map<string, Map<string, { count: number; hasReacted: boolean }>>();

    data.forEach((r: any) => {
      if (!grouped.has(r.message_id)) grouped.set(r.message_id, new Map());
      const emojiMap = grouped.get(r.message_id)!;
      if (!emojiMap.has(r.emoji)) emojiMap.set(r.emoji, { count: 0, hasReacted: false });
      const entry = emojiMap.get(r.emoji)!;
      entry.count++;
      if (r.user_id === user.id) entry.hasReacted = true;
    });

    grouped.forEach((emojiMap, msgId) => {
      const reactions: ReactionGroup[] = [];
      emojiMap.forEach((val, emoji) => {
        reactions.push({ emoji, count: val.count, hasReacted: val.hasReacted });
      });
      reactionsMap.set(msgId, reactions);
    });

    msgs.forEach((m) => {
      m.reactions = reactionsMap.get(m.id) || [];
    });
  };

  const refreshReactions = async () => {
    if (!user || !receiverId) return;
    setMessages((prev) => {
      // Schedule async refresh
      (async () => {
        const enriched = [...prev];
        await fetchReactionsForMessages(enriched);
        if (!disposedRef.current) setMessages([...enriched]);
      })();
      return prev;
    });
  };

  // ── Load older messages (scroll infinito) ─────────────────────
  const loadOlderMessages = async () => {
    if (!user || !hasMore || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);

    const oldestMessage = messages[0];
    const oldestTime = getMessageTime(oldestMessage);

    try {
      let query;
      if (receiverId) {
        query = supabase
          .from('messages')
          .select(`
            id, sender_id, receiver_id, content, created_at, is_read,
            message_type, reply_to_id, attachment_url, edited_at, deleted_at,
            profiles:sender_id (username, avatar_url, equipped_avatar, level, elo)
          `)
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
          .lt('created_at', oldestTime);
      } else {
        query = supabase
          .from('chat_messages')
          .select(`
            id, sender_id, room_id, content, created_at, timestamp,
            profiles:sender_id (username, avatar_url, equipped_avatar, level, elo)
          `)
          .eq('room_id', GLOBAL_ROOM_ID)
          .lt('created_at', oldestTime);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (!error && data && data.length > 0) {
        const older: EnhancedChatMessage[] = (data as any[]).reverse().map((m) => ({
          ...m,
          message_type: m.message_type || 'text',
          local_status: 'sent' as const,
        }));

        if (receiverId) {
          await resolveReplyTos(older);
          await fetchReactionsForMessages(older);
        }

        // Preserve scroll position
        const container = containerRef.current;
        const prevScrollHeight = container?.scrollHeight || 0;

        setMessages((prev) => [...older, ...prev]);
        setHasMore(data.length >= PAGE_SIZE);

        // Restore scroll position after prepend
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // ── Typing indicator ──────────────────────────────────────────
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      presenceChannelRef.current?.track({ user_id: user!.id, is_typing: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      presenceChannelRef.current?.track({ user_id: user!.id, is_typing: false });
    }, 2000);
  };

  // ── Scroll handling ───────────────────────────────────────────
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    // Near bottom detection
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    isNearBottomRef.current = nearBottom;
    setIsNearBottom(nearBottom);
    if (nearBottom) setHasNewBelow(false);

    // Near top: load older
    if (el.scrollTop < 50 && hasMore && !loadingOlder) {
      loadOlderMessages();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    isNearBottomRef.current = true;
    setIsNearBottom(true);
    setHasNewBelow(false);
  };

  const scrollToMessage = (messageId: string) => {
    const el = messageRefs.current.get(messageId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-1', 'ring-casino-gold/50', 'bg-casino-gold/5');
      setTimeout(() => {
        el.classList.remove('ring-1', 'ring-casino-gold/50', 'bg-casino-gold/5');
      }, 2000);
    }
  };

  // ── Actions ───────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || !user) return;

    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    presenceChannelRef.current?.track({ user_id: user.id, is_typing: false });

    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: EnhancedChatMessage = {
      id: tempId,
      sender_id: user.id,
      receiver_id: receiverId,
      room_id: receiverId ? null : GLOBAL_ROOM_ID,
      content: text,
      message_type: 'text',
      reply_to_id: replyingTo?.id || null,
      reply_to: replyingTo ? {
        content: replyingTo.content,
        sender_username: replyingTo.profiles?.username || 'Jugador',
      } : null,
      created_at: new Date().toISOString(),
      local_status: 'sending',
      profiles: {
        username: user.email?.split('@')[0] || 'Tú',
        avatar_url: null,
        level: 1,
        elo: 1000,
      },
    };
    forceScrollRef.current = true;
    upsertMessage(optimisticMessage);
    setReplyingTo(null);

    try {
      if (receiverId) {
        const insertPayload: any = {
          sender_id: user.id,
          receiver_id: receiverId,
          content: text,
        };
        if (replyingTo?.id) insertPayload.reply_to_id = replyingTo.id;

        const { data, error } = await supabase.from('messages').insert(insertPayload)
          .select('id, sender_id, receiver_id, content, created_at, is_read, message_type, reply_to_id, edited_at, deleted_at')
          .single();
        if (error) throw error;
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        await fetchNewMessageProfile(data);
      } else {
        await supabase.rpc('add_player_xp', { p_id: user.id, p_xp_amount: 2 });
        const { data, error } = await supabase.from('chat_messages').insert({
          sender_id: user.id,
          room_id: GLOBAL_ROOM_ID,
          content: text,
        }).select('id, sender_id, room_id, content, created_at, timestamp').single();
        if (error) throw error;
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        await fetchNewMessageProfile(data);
      }
      setChatError(null);
    } catch (err) {
      console.error(err);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, local_status: 'error' as const } : m)));
      setChatError('No se pudo enviar el mensaje. Puedes reintentar.');
    }
  };

  const handleEdit = async (messageId: string, newContent: string) => {
    if (!user || !receiverId) return;

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, content: newContent, edited_at: new Date().toISOString() }
          : m
      )
    );

    const { error } = await supabase
      .from('messages')
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      console.error('Error editing message:', error);
      fetchMessages(); // Revert by re-fetching
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!user || !receiverId) return;

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, deleted_at: new Date().toISOString() }
          : m
      )
    );

    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      console.error('Error deleting message:', error);
      fetchMessages();
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!user || !receiverId) return;

    // Check if already reacted
    const msg = messages.find((m) => m.id === messageId);
    const existingReaction = msg?.reactions?.find((r) => r.emoji === emoji && r.hasReacted);

    if (existingReaction) {
      // Remove reaction
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          return {
            ...m,
            reactions: (m.reactions || [])
              .map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, hasReacted: false } : r)
              .filter((r) => r.count > 0),
          };
        })
      );
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } else {
      // Add reaction
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = [...(m.reactions || [])];
          const existing = reactions.find((r) => r.emoji === emoji);
          if (existing) {
            existing.count++;
            existing.hasReacted = true;
          } else {
            reactions.push({ emoji, count: 1, hasReacted: true });
          }
          return { ...m, reactions };
        })
      );
      await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji });
    }
  };

  const handleRetry = (message: EnhancedChatMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    // Re-send by populating the input
    sendMessage(message.content);
  };

  return (
    <div className="flex flex-col h-full min-h-[300px]">
      <div className="flex-1 relative mb-1">
        <div
          className="absolute inset-0 overflow-y-auto space-y-0 pr-2 custom-scrollbar"
          onScroll={handleScroll}
          ref={containerRef}
        >
          {/* Loading older indicator */}
          {loadingOlder && (
            <div className="flex justify-center py-3">
              <div className="flex items-center gap-2 text-gray-500 text-[10px]">
                <div className="w-3 h-3 border-2 border-gray-600 border-t-casino-gold rounded-full animate-spin" />
                Cargando mensajes anteriores...
              </div>
            </div>
          )}

          {/* No more messages */}
          {!hasMore && messages.length > 0 && (
            <div className="text-center text-[10px] text-gray-600 py-3 select-none">
              — Inicio de la conversación —
            </div>
          )}

          {/* Error banner */}
          {chatError && (
            <div className="mx-1 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300 flex items-center justify-between">
              <span>{chatError}</span>
              <button onClick={fetchMessages} className="font-bold text-red-200 hover:text-white">Reintentar</button>
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="text-3xl mb-3 opacity-40">💬</div>
              <p className="text-gray-500 text-xs">
                {receiverId ? 'Envía un mensaje para iniciar la conversación' : 'Di hola al chat global...'}
              </p>
            </div>
          ) : (
            messages.map((m, i) => {
              const isMe = m.sender_id === user?.id;
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const showDateSeparator = !prevMsg ||
                isDifferentDay(getMessageTime(prevMsg), getMessageTime(m));

              return (
                <React.Fragment key={m.id}>
                  {showDateSeparator && (
                    <ChatDateSeparator date={getMessageTime(m)} />
                  )}
                  <div ref={(el) => { if (el) messageRefs.current.set(m.id, el); }} className="transition-all duration-500 rounded-lg">
                    <ChatMessageBubble
                      message={m}
                      isMe={isMe}
                      isPrivateChat={isPrivateChat}
                      currentUserId={user?.id || ''}
                      onReply={setReplyingTo}
                      onEdit={setEditingMessage}
                      onDelete={handleDelete}
                      onReact={handleReact}
                      onRetry={handleRetry}
                      onScrollToMessage={scrollToMessage}
                    />
                  </div>
                </React.Fragment>
              );
            })
          )}

          {/* Typing indicator */}
          {otherUserTyping && (
            <div className="flex items-center gap-1.5 px-3 py-1 animate-pulse">
              <span className="text-[10px] text-gray-500 italic">Escribiendo</span>
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* New messages badge */}
        {hasNewBelow && !isNearBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-casino-gold text-black text-xs font-bold shadow-lg hover:bg-casino-gold/80 transition-all animate-bounce"
          >
            ↓ Nuevos mensajes
          </button>
        )}
      </div>

      {/* Enhanced input */}
      <ChatInput
        onSend={sendMessage}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onCancelReply={() => setReplyingTo(null)}
        onCancelEdit={() => setEditingMessage(null)}
        onSubmitEdit={handleEdit}
        placeholder={receiverId ? 'Mensaje privado...' : 'Chat global...'}
        maxLength={receiverId ? 500 : 200}
        onTyping={handleTyping}
      />
    </div>
  );
}
