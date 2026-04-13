import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

const GLOBAL_ROOM_ID = 'GLOBAL';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id?: string; // Private chat
  room_id?: string | null; // Global/Room chat
  content: string;
  created_at?: string;
  timestamp?: string;
  local_status?: 'sending' | 'error' | 'sent';
  profiles?: {
    username: string;
    avatar_url?: string | null;
    level: number;
    elo: number;
    xp?: number;
  };
}


interface ChatWindowProps {
  receiverId?: string; // If provided, we're in private chat
}

export function ChatWindow({ receiverId }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'degraded'>('connecting');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const disposedRef = useRef(false);

  const getMessageTime = (m: ChatMessage) => m.created_at || m.timestamp || new Date().toISOString();

  const upsertMessage = (msg: ChatMessage) => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === msg.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = { ...next[index], ...msg, local_status: msg.local_status || 'sent' };
        return next;
      }
      return [...prev, { ...msg, local_status: msg.local_status || 'sent' }];
    });
  };


  // ── Sync: Private vs Global ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    disposedRef.current = false;
    setChatError(null);
    setRealtimeStatus('connecting');
    setMessages([]); // Reset on switch
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
            // Mark as read immediately if chat is open
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

    return () => {
      disposedRef.current = true;
      presenceChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user, receiverId]);

  // Fallback sync loop: keeps chat consistent even if realtime misses events
  useEffect(() => {
    if (!user) return;
    const pollId = window.setInterval(() => {
      fetchMessages();
    }, 3000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchMessages();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  const fetchNewMessageProfile = async (msgData: any) => {
    if (disposedRef.current) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url, level, elo')
      .eq('id', msgData.sender_id)
      .single();
    if (disposedRef.current) return;
    const newMessage = { ...msgData, profiles: profile, local_status: 'sent' } as ChatMessage;
    upsertMessage(newMessage);
  };

  const fetchMessages = async () => {
    if (!user) return;
    try {
      let query;
      if (receiverId) {
        // Private conversation
        query = supabase
          .from('messages')
          .select(`
            id, sender_id, receiver_id, content, created_at,
            profiles:sender_id (username, avatar_url, level, elo)
          `)
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`);
        
        // Mark all as read since I'm opening the chat
        await supabase.from('messages')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('sender_id', receiverId)
          .eq('is_read', false);
      } else {
        // Global
        query = supabase
          .from('chat_messages')
          .select(`
            id, sender_id, room_id, content, created_at, timestamp,
            profiles:sender_id (username, avatar_url, level, elo)
          `)
          .eq('room_id', GLOBAL_ROOM_ID);
      }

      let { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (!receiverId && error) {
        // Legacy fallback for databases still using "timestamp"
        const fallback = await supabase
          .from('chat_messages')
          .select(`
            id, sender_id, room_id, content, timestamp,
            profiles:sender_id (username, avatar_url, level, elo)
          `)
          .eq('room_id', GLOBAL_ROOM_ID)
          .order('timestamp', { ascending: false })
          .limit(50);
        data = fallback.data as any;
        error = fallback.error as any;
      }

      if (!error && data) {
        setMessages((data as any[]).reverse().map((m) => ({ ...m, local_status: 'sent' })) as ChatMessage[]);
        setChatError(null);
        setLastSyncAt(new Date().toISOString());
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    // Typing indicator logic
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      presenceChannelRef.current?.track({ user_id: user!.id, is_typing: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      presenceChannelRef.current?.track({ user_id: user!.id, is_typing: false });
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    
    const msg = input.trim();
    setInput('');
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    presenceChannelRef.current?.track({ user_id: user.id, is_typing: false });

    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      sender_id: user.id,
      receiver_id: receiverId,
      room_id: receiverId ? null : GLOBAL_ROOM_ID,
      content: msg,
      created_at: new Date().toISOString(),
      local_status: 'sending',
      profiles: {
        username: user.email?.split('@')[0] || 'Tú',
        avatar_url: null,
        level: 1,
        elo: 1000,
      },
    };
    upsertMessage(optimisticMessage);

    try {
      if (receiverId) {
        const { data, error } = await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: msg,
        }).select('id, sender_id, receiver_id, content, created_at').single();
        if (error) throw error;
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        await fetchNewMessageProfile(data);
      } else {
        await supabase.rpc('add_player_xp', { p_id: user.id, p_xp_amount: 2 });
        const { data, error } = await supabase.from('chat_messages').insert({
          sender_id: user.id,
          room_id: GLOBAL_ROOM_ID,
          content: msg,
        }).select('id, sender_id, room_id, content, created_at, timestamp').single();
        if (error) throw error;
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        await fetchNewMessageProfile(data);
      }
      setChatError(null);
    } catch (err) {
      console.error(err);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, local_status: 'error' } : m)));
      setChatError('No se pudo enviar el mensaje. Puedes reintentar.');
    }
  };

  const retryMessage = async (failed: ChatMessage) => {
    setInput(failed.content);
    setMessages((prev) => prev.filter((m) => m.id !== failed.id));
  };

  return (
    <div className="flex flex-col h-full min-h-[300px]">
      <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-2 custom-scrollbar">
        {chatError && (
          <div className="mx-1 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300 flex items-center justify-between">
            <span>{chatError}</span>
            <button onClick={fetchMessages} className="font-bold text-red-200 hover:text-white">Reintentar</button>
          </div>
        )}
        {messages.length === 0 ? (
          <p className="text-center text-xs text-gray-500 mt-4">Di hola...</p>
        ) : (
          messages.map(m => {
            const isMe = m.sender_id === user?.id;
            const profile = m.profiles || { username: 'Jugador', avatar_url: null, level: 1, elo: 1000 };
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-slide-up mb-3`}>
                <div className={`flex items-end gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-6 h-6 rounded-full bg-casino-surface-light flex items-center justify-center text-[8px] font-bold text-gray-400 shrink-0 border border-white/5 overflow-hidden">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      profile.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className={`text-[10px] font-bold tracking-wide ${isMe ? 'text-gray-500' : 'text-casino-gold/70'}`}>
                    {profile.username}
                  </span>
                </div>
                <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm shadow-lg ${
                  isMe 
                    ? 'bg-gradient-to-br from-casino-gold/30 to-casino-gold/10 text-white border border-casino-gold/20 rounded-tr-none' 
                    : 'bg-white/[0.05] border border-white/[0.05] text-gray-200 rounded-tl-none'
                }`}>
                  {m.content}
                </div>
                {isMe && m.local_status === 'sending' && (
                  <span className="text-[10px] text-gray-500 mt-1">Enviando...</span>
                )}
                {isMe && m.local_status === 'error' && (
                  <button
                    onClick={() => retryMessage(m)}
                    className="text-[10px] text-red-400 mt-1 hover:text-red-200"
                  >
                    Error al enviar. Reintentar.
                  </button>
                )}
              </div>
            );
          })
        )}
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

      <form onSubmit={sendMessage} className="relative mt-auto">
        <input 
          type="text" 
          value={input}
          onChange={handleInputChange}
          placeholder={receiverId ? "Mensaje privado..." : "Chat global..."}
          className="input-casino w-full pr-12 text-sm bg-black/40 border-white/5 focus:border-casino-gold/50"
          maxLength={200}
        />
        <button 
          type="submit" 
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-casino-gold hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
          disabled={!input.trim()}
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

