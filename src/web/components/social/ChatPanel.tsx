import React, { useState, useEffect, useRef } from 'react';
import { Send, Flag } from 'lucide-react';
import { socketService } from '../../services/socket';
import { ChatMessage } from '../../hooks/useSocial';
import { useAuth } from '../../hooks/useAuth';

interface ChatPanelProps {
  roomId: string;
}

export function ChatPanel({ roomId }: ChatPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const [retryIn, setRetryIn] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let socket: any;
    const setup = async () => {
      socket = await socketService.connect();
      socket.emit('get_chat_history', { roomId });
      socket.on('chat_history', (msgs: ChatMessage[]) => setMessages(msgs));
      socket.on('new_message', (msg: ChatMessage) => setMessages(prev => [...prev, msg]));
      socket.on('chat_rate_limited', ({ retryAfter }: { retryAfter: number }) => {
        setRateLimited(true);
        setRetryIn(retryAfter);
        const interval = setInterval(() => {
          setRetryIn(t => {
            if (t <= 1) { clearInterval(interval); setRateLimited(false); return 0; }
            return t - 1;
          });
        }, 1000);
      });
    };
    setup();
    return () => {
      if (socket) {
        socket.off('chat_history');
        socket.off('new_message');
        socket.off('chat_rate_limited');
      }
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || rateLimited) return;
    const socket = await socketService.connect();
    socket.emit('send_message', { roomId, content: input.trim() });
    setInput('');
  };

  const handleReport = async (messageId: string) => {
    const socket = await socketService.connect();
    socket.emit('report_message', { messageId, reason: 'Contenido inapropiado' });
  };

  return (
    <div className="flex flex-col h-full min-h-[300px] bg-black/30 rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-2 border-b border-white/10">
        <h3 className="text-white font-bold text-sm">Chat de sala</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === user?.id}
            onReport={handleReport}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 200))}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={rateLimited ? `Espera ${retryIn}s...` : 'Escribe un mensaje...'}
              disabled={rateLimited}
              className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500 disabled:opacity-50"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{input.length}/200</span>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || rateLimited}
            className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white p-2 rounded-xl transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isOwn, onReport }: {
  message: ChatMessage;
  isOwn: boolean;
  onReport: (id: string) => void;
}) {
  return (
    <div className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-yellow-600/80 text-white rounded-tr-sm' : 'bg-white/10 text-gray-100 rounded-tl-sm'}`}>
        {!isOwn && <p className="text-yellow-400 text-xs font-bold mb-0.5">{message.sender_id.slice(0, 8)}</p>}
        <p>{message.content}</p>
      </div>
      {!isOwn && (
        <button
          onClick={() => onReport(message.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 self-center"
        >
          <Flag size={12} />
        </button>
      )}
    </div>
  );
}
