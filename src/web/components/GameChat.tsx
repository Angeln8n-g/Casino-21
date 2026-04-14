import React, { useState, useEffect, useRef } from 'react';
import { useGame, ChatMessage } from '../hooks/useGame';
import { MessageSquare, X, Send } from 'lucide-react';

interface GameChatProps {
  roomId: string;
  isSpectator: boolean;
}

export function GameChat({ roomId, isSpectator }: GameChatProps) {
  const { chatMessages, sendMessage, localPlayerId } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'global' | 'spectator'>('global');
  const [unreadCount, setUnreadCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(chatMessages.length);

  // Auto-scroll al final cuando llegan mensajes nuevos
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen, activeTab]);

  // Manejar el contador de mensajes no leídos
  useEffect(() => {
    if (!isOpen && chatMessages.length > prevMessagesLength.current) {
      setUnreadCount(prev => prev + (chatMessages.length - prevMessagesLength.current));
    }
    prevMessagesLength.current = chatMessages.length;
  }, [chatMessages, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    sendMessage(roomId, inputText);
    setInputText('');
  };

  // Filtrar mensajes según la pestaña
  const visibleMessages = chatMessages.filter(msg => {
    if (activeTab === 'global') {
      return !msg.isSpectator; // Solo mensajes de jugadores
    } else {
      return msg.isSpectator; // Solo mensajes de espectadores
    }
  });

  return (
    <>
      {/* Botón Flotante */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="absolute bottom-6 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/10 hover:scale-110 transition-all z-50 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
        >
          <MessageSquare size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Panel de Chat */}
      {isOpen && (
        <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 w-80 max-w-[calc(100vw-3rem)] h-96 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl flex flex-col z-50 shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
            <h3 className="font-display font-bold text-white flex items-center gap-2">
              <MessageSquare size={16} className="text-casino-gold" />
              Chat de Sala
            </h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs (Solo visibles para espectadores) */}
          {isSpectator && (
            <div className="flex text-xs font-bold border-b border-white/10">
              <button 
                className={`flex-1 py-2 transition-colors ${activeTab === 'global' ? 'bg-casino-gold/20 text-casino-gold border-b-2 border-casino-gold' : 'text-gray-400 hover:bg-white/5'}`}
                onClick={() => setActiveTab('global')}
              >
                JUGADORES
              </button>
              <button 
                className={`flex-1 py-2 transition-colors ${activeTab === 'spectator' ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:bg-white/5'}`}
                onClick={() => setActiveTab('spectator')}
              >
                ESPECTADORES
              </button>
            </div>
          )}

          {/* Lista de Mensajes */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar flex flex-col">
            {visibleMessages.length === 0 ? (
              <div className="m-auto text-gray-500 text-xs text-center px-4">
                {activeTab === 'global' 
                  ? 'No hay mensajes de los jugadores aún.' 
                  : 'Sé el primero en comentar como espectador.'}
              </div>
            ) : (
              visibleMessages.map((msg, i) => {
                // Determinar si el mensaje es nuestro (si no somos espectadores, chequeamos ID. Si somos, no importa tanto a menos que tengamos user ID)
                // Por ahora usamos senderName para simplificar o un color neutro
                const isSystem = msg.isSystem;
                const isMe = msg.senderId === localPlayerId;
                
                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center text-[10px] text-gray-500 my-1 font-mono uppercase">
                      {msg.text}
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[90%] ${isMe ? 'ml-auto' : 'mr-auto'}`}>
                    <span className={`text-[9px] font-bold mb-0.5 ${msg.isSpectator ? 'text-blue-400' : 'text-casino-gold'}`}>
                      {msg.senderName} {msg.isSpectator && '(Espectador)'}
                    </span>
                    <div className={`px-3 py-1.5 rounded-xl text-sm ${
                      isMe 
                        ? 'bg-casino-gold/20 border border-casino-gold/30 text-white rounded-tr-sm' 
                        : 'bg-white/10 border border-white/5 text-gray-200 rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-2 border-t border-white/10 bg-black/40 flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isSpectator && activeTab === 'global' ? 'Solo lectura...' : 'Escribe un mensaje...'}
              disabled={isSpectator && activeTab === 'global'}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-casino-gold/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button 
              type="submit"
              disabled={!inputText.trim() || (isSpectator && activeTab === 'global')}
              className="w-9 h-9 flex items-center justify-center bg-casino-gold/20 text-casino-gold border border-casino-gold/30 rounded-lg hover:bg-casino-gold hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}