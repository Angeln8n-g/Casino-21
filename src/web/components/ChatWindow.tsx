import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

interface ChatMessage {
  id: string;
  sender_id: string;
  room_id: string | null;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
    level: number;
    elo: number;
  };
}

export function ChatWindow() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('chat_messages_global')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: 'room_id=is.null',
      }, async (payload) => {
        // Fetch profile info for the new message
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, level, elo')
          .eq('id', payload.new.sender_id)
          .single();

        const newMessage = { ...payload.new, profiles: profile } as ChatMessage;
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id, sender_id, room_id, content, created_at,
          profiles:sender_id (username, level, elo)
        `)
        .is('room_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        // Reverse because we want oldest first in the UI
        setMessages((data as any[]).reverse() as ChatMessage[]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    
    const msg = input.trim();
    setInput('');

    try {
      // Small XP Reward
      await supabase.rpc('add_player_xp', { p_id: user.id, p_xp_amount: 2 });
      
      await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          room_id: null,
          content: msg
        });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-[350px] lg:h-[450px]">
      <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-2 custom-scrollbar">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-gray-500 mt-4">Sé el primero en saludar.</p>
        ) : (
          messages.map(m => {
            const isMe = m.sender_id === user?.id;
            const profile = m.profiles || { username: 'Unknown', level: 1, elo: 1000 };
            const isHighLevel = profile.level >= 20 || profile.elo >= 1500;

            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-1 mb-0.5 px-1">
                  <span className={`text-[10px] font-bold tracking-wide ${isHighLevel ? 'text-casino-gold drop-shadow-md' : 'text-gray-400'}`}>
                    {profile.username}
                  </span>
                  {!isMe && isHighLevel && <span className="text-[8px]">⭐</span>}
                </div>
                <div className={`px-3 py-2 rounded-xl max-w-[85%] text-sm shadow-lg ${
                  isMe 
                    ? 'bg-blue-600/30 text-blue-50 border border-blue-500/20' 
                    : 'glass-panel-strong border-white/[0.05] text-gray-200'
                }`}>
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="relative shrink-0">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="input-casino w-full pr-10 text-sm"
          maxLength={150}
        />
        <button 
          type="submit" 
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-casino-gold hover:text-white hover:bg-white/10 transition-colors"
          disabled={!input.trim()}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}
