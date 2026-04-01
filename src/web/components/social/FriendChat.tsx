import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Swords } from 'lucide-react';
import { socketService } from '../../services/socket';
import { ChatMessage, GameInvitation, useSocial } from '../../hooks/useSocial';
import { useAuth } from '../../hooks/useAuth';

interface FriendChatProps {
  friendId: string;
  friendName: string;
  onBack: () => void;
}

export function FriendChat({ friendId, friendName, onBack }: FriendChatProps) {
  const { user } = useAuth();
  const { sendGameInvitation, acceptGameInvitation, rejectGameInvitation } = useSocial();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingInvite, setPendingInvite] = useState<GameInvitation | null>(null);
  const [input, setInput] = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const [retryIn, setRetryIn] = useState(0);
  const [showInviteMenu, setShowInviteMenu] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inviteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let socket: any;
    const setup = async () => {
      socket = await socketService.connect();
      socket.emit('get_dm_history', { friendId });

      const onHistory = ({ friendId: fid, messages: msgs }: { friendId: string; messages: ChatMessage[] }) => {
        if (fid === friendId) setMessages(msgs);
      };
      const onMessage = (msg: ChatMessage) => {
        const ids = [user?.id, friendId].sort().join('_');
        if (msg.room_id === `dm_${ids}`) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        }
      };
      const onRateLimit = ({ retryAfter }: { retryAfter: number }) => {
        setRateLimited(true);
        setRetryIn(retryAfter);
        const interval = setInterval(() => {
          setRetryIn(t => {
            if (t <= 1) { clearInterval(interval); setRateLimited(false); return 0; }
            return t - 1;
          });
        }, 1000);
      };
      const onInviteReceived = (inv: GameInvitation) => {
        if (inv.sender_id === friendId) setPendingInvite(inv);
      };

      socket.on('dm_history', onHistory);
      socket.on('dm_message', onMessage);
      socket.on('chat_rate_limited', onRateLimit);
      socket.on('game_invitation_received', onInviteReceived);
    };
    setup();
    return () => {
      if (socket) {
        socket.off('dm_history');
        socket.off('dm_message');
        socket.off('chat_rate_limited');
        socket.off('game_invitation_received');
      }
    };
  }, [friendId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingInvite]);

  useEffect(() => {
    if (!showInviteMenu) return;
    const handler = (e: MouseEvent) => {
      if (inviteRef.current && !inviteRef.current.contains(e.target as Node)) setShowInviteMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showInviteMenu]);

  const handleSend = async () => {
    if (!input.trim() || rateLimited) return;
    const socket = await socketService.connect();
    socket.emit('send_dm', { receiverId: friendId, content: input.trim() });
    setInput('');
  };

  const handleInvite = async (_mode: '1v1' | '2v2') => {
    setShowInviteMenu(false);
    await sendGameInvitation(friendId);
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 3000);
  };

  const handleAcceptInvite = async () => {
    if (!pendingInvite) return;
    await acceptGameInvitation(pendingInvite.id, pendingInvite.room_id);
    setPendingInvite(null);
  };

  const handleRejectInvite = async () => {
    if (!pendingInvite) return;
    await rejectGameInvitation(pendingInvite.id);
    setPendingInvite(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-white font-bold text-sm">{friendName}</span>
          </div>
        </div>

        {/* Botón invitar */}
        <div className="relative" ref={inviteRef}>
          <button
            onClick={() => setShowInviteMenu(m => !m)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${inviteSent ? 'bg-green-600/60 text-green-300' : 'bg-yellow-600/60 hover:bg-yellow-500/80 text-yellow-300'}`}
          >
            <Swords size={13} />
            {inviteSent ? '¡Enviada!' : 'Invitar'}
          </button>
          {showInviteMenu && (
            <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden z-10 min-w-[120px]">
              <button
                onClick={() => handleInvite('1v1')}
                className="w-full text-left px-4 py-2.5 text-white text-xs font-bold hover:bg-white/10 transition-colors border-b border-white/5"
              >
                ⚔️ 1 vs 1
              </button>
              <button
                onClick={() => handleInvite('2v2')}
                className="w-full text-left px-4 py-2.5 text-white text-xs font-bold hover:bg-white/10 transition-colors"
              >
                🤝 2 vs 2
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2 min-h-0">
        {messages.length === 0 && !pendingInvite && (
          <p className="text-center text-gray-500 text-xs py-8">Inicia la conversación con {friendName}</p>
        )}
        {messages.map(msg => (
          <DmBubble key={msg.id} message={msg} isOwn={msg.sender_id === user?.id} />
        ))}

        {/* Invitación inline */}
        {pendingInvite && (
          <div className="mx-2 p-3 bg-yellow-500/15 border border-yellow-500/30 rounded-2xl">
            <p className="text-yellow-400 text-xs font-bold mb-1">🎮 Invitación de partida</p>
            <p className="text-white text-sm mb-3">{friendName} te invita a jugar</p>
            <div className="flex gap-2">
              <button
                onClick={handleAcceptInvite}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
              >
                Unirse
              </button>
              <button
                onClick={handleRejectInvite}
                className="flex-1 bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold py-2 rounded-lg transition-colors"
              >
                Rechazar
              </button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-white/10">
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 200))}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={rateLimited ? `Espera ${retryIn}s...` : 'Mensaje...'}
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

function DmBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const time = new Date(message.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-yellow-600/80 text-white rounded-tr-sm' : 'bg-white/10 text-gray-100 rounded-tl-sm'}`}>
        <p>{message.content}</p>
        <p className={`text-xs mt-0.5 ${isOwn ? 'text-yellow-200/60' : 'text-gray-500'}`}>{time}</p>
      </div>
    </div>
  );
}
