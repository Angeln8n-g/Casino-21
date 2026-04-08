import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id?: string; // Private chat
  room_id?: string | null; // Global/Room chat
  content: string;
  created_at: string;
  profiles?: {
    username: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // ── Sync: Private vs Global ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setMessages([]); // Reset on switch
    fetchMessages();
    
    const baseId = receiverId 
      ? `chat_private_${[user.id, receiverId].sort().join('_')}`
      : 'chat_global_room';

    const dbChannel = supabase.channel(`${baseId}_db_${Date.now()}`);
    const presenceChannel = supabase.channel(`${baseId}_presence`);

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
        filter: 'room_id=is.null',
      }, async (payload) => {
        fetchNewMessageProfile(payload.new);
      });
    }

    dbChannel.subscribe();

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
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user, receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  const fetchNewMessageProfile = async (msgData: any) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, level, elo')
      .eq('id', msgData.sender_id)
      .single();
    const newMessage = { ...msgData, profiles: profile } as ChatMessage;
    setMessages(prev => [...prev, newMessage]);
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
            profiles:sender_id (username, level, elo)
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
            id, sender_id, room_id, content, created_at,
            profiles:sender_id (username, level, elo)
          `)
          .is('room_id', null);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setMessages((data as any[]).reverse() as ChatMessage[]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    // Typing indicator logic
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      const baseId = receiverId 
        ? `chat_private_${[user!.id, receiverId].sort().join('_')}`
        : 'chat_global_room';
      supabase.channel(`${baseId}_presence`).track({ user_id: user!.id, is_typing: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      const baseId = receiverId 
        ? `chat_private_${[user!.id, receiverId].sort().join('_')}`
        : 'chat_global_room';
      supabase.channel(`${baseId}_presence`).track({ user_id: user!.id, is_typing: false });
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    
    const msg = input.trim();
    setInput('');
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      if (receiverId) {
        await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: msg
        });
      } else {
        await supabase.rpc('add_player_xp', { p_id: user.id, p_xp_amount: 2 });
        await supabase.from('chat_messages').insert({
          sender_id: user.id,
          room_id: null,
          content: msg
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[300px]">
      <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-2 custom-scrollbar">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-gray-500 mt-4">Di hola...</p>
        ) : (
          messages.map(m => {
            const isMe = m.sender_id === user?.id;
            const profile = m.profiles || { username: 'Jugador', level: 1, elo: 1000 };
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-slide-up`}>
                <div className="flex items-baseline gap-1 mb-0.5 px-2">
                  <span className={`text-[10px] font-bold tracking-wide ${isMe ? 'text-gray-500' : 'text-gray-400'}`}>
                    {profile.username}
                  </span>
                </div>
                <div className={`px-3 py-2 rounded-2xl max-w-[90%] text-sm shadow-lg ${
                  isMe 
                    ? 'bg-gradient-to-br from-casino-gold/30 to-casino-gold/10 text-white border border-casino-gold/20' 
                    : 'bg-white/[0.05] border border-white/[0.05] text-gray-200'
                }`}>
                  {m.content}
                </div>
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

