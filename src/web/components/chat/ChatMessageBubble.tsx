import React, { useState, useRef } from 'react';
import { ChatReplyPreview } from './ChatReplyPreview';
import { ChatReactionBar, ReactionGroup } from './ChatReactionBar';
import { ChatContextMenu } from './ChatContextMenu';
import { ChatEmojiPicker } from './ChatEmojiPicker';

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
    xp?: number;
  };
  // Populated client-side
  reply_to?: {
    content: string;
    sender_username: string;
  } | null;
  reactions?: ReactionGroup[];
}

interface ChatMessageBubbleProps {
  message: EnhancedChatMessage;
  isMe: boolean;
  isPrivateChat: boolean;
  currentUserId: string;
  onReply: (message: EnhancedChatMessage) => void;
  onEdit: (message: EnhancedChatMessage) => void;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRetry: (message: EnhancedChatMessage) => void;
  onScrollToMessage?: (messageId: string) => void;
}

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function formatTime(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function ChatMessageBubble({
  message, isMe, isPrivateChat, currentUserId,
  onReply, onEdit, onDelete, onReact, onRetry, onScrollToMessage,
}: ChatMessageBubbleProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profile = message.profiles || { username: 'Jugador', avatar_url: null, level: 1, elo: 1000 };
  const isDeleted = !!message.deleted_at;
  const isEdited = !!message.edited_at && !isDeleted;
  const time = formatTime(message.created_at || message.timestamp);
  const canEdit = isMe && !isDeleted && message.created_at
    ? (Date.now() - new Date(message.created_at).getTime()) < EDIT_WINDOW_MS
    : false;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      if (bubbleRef.current) {
        const rect = bubbleRef.current.getBoundingClientRect();
        setContextMenu({ x: rect.left + rect.width / 2, y: rect.top });
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).catch(() => {});
  };

  const handleReact = (emoji: string) => {
    onReact(message.id, emoji);
    setShowReactionPicker(false);
  };

  // System messages
  if (message.message_type === 'system') {
    return (
      <div className="text-center text-[10px] text-gray-500 my-2 font-mono uppercase">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-3 group/msg animate-slide-up`}>
      {/* Sender info (non-own messages) */}
      {!isMe && (
        <div className="flex items-end gap-2 mb-1 px-1 flex-row">
          <div className="w-6 h-6 rounded-full bg-casino-surface-light flex items-center justify-center text-[8px] font-bold text-gray-400 shrink-0 border border-white/5 overflow-hidden">
            {profile.equipped_avatar ? (
              <img src={profile.equipped_avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              profile.username.charAt(0).toUpperCase()
            )}
          </div>
          <span className="text-[10px] font-bold tracking-wide text-casino-gold/70">
            {profile.username}
          </span>
        </div>
      )}

      {/* Bubble */}
      <div className="relative max-w-[85%]">
        <div
          ref={bubbleRef}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className={`px-3 py-2 rounded-2xl text-sm shadow-lg cursor-default select-text transition-colors ${
            isDeleted
              ? 'bg-white/[0.02] border border-white/[0.04] text-gray-600 italic'
              : isMe
                ? 'bg-gradient-to-br from-casino-gold/30 to-casino-gold/10 text-white border border-casino-gold/20 rounded-tr-none'
                : 'bg-white/[0.05] border border-white/[0.05] text-gray-200 rounded-tl-none'
          }`}
        >
          {/* Reply preview */}
          {message.reply_to && !isDeleted && (
            <ChatReplyPreview
              username={message.reply_to.sender_username}
              text={message.reply_to.content}
              inline
              onClick={() => message.reply_to_id && onScrollToMessage?.(message.reply_to_id)}
            />
          )}

          {/* Content */}
          {isDeleted ? (
            <span className="text-gray-600 text-xs">🚫 Mensaje eliminado</span>
          ) : (
            <span className="break-words whitespace-pre-wrap">{message.content}</span>
          )}

          {/* Meta row: time, edited, read status */}
          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {isEdited && (
              <span className="text-[9px] text-gray-500 italic">editado</span>
            )}
            <span className="text-[9px] text-gray-500/60 tabular-nums">{time}</span>
            {isMe && isPrivateChat && !isDeleted && (
              <span className={`text-[9px] font-bold ${
                message.local_status === 'sending'
                  ? 'text-gray-600'
                  : message.is_read
                    ? 'text-blue-400'
                    : 'text-gray-500'
              }`}>
                {message.local_status === 'sending' ? '⏳' : message.is_read ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>

        {/* Hover action buttons */}
        {!isDeleted && (
          <div className={`absolute top-0 ${isMe ? '-left-16' : '-right-16'} hidden group-hover/msg:flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity`}>
            <button
              onClick={() => onReply(message)}
              className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
              title="Responder"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={() => setShowReactionPicker(true)}
              className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors text-xs"
              title="Reaccionar"
            >
              😀
            </button>
          </div>
        )}

        {/* Reaction picker */}
        {showReactionPicker && (
          <div className={`absolute ${isMe ? 'right-0' : 'left-0'} bottom-full mb-2 z-[10005]`}>
            <ChatEmojiPicker
              compact
              onSelect={handleReact}
              onClose={() => setShowReactionPicker(false)}
            />
          </div>
        )}
      </div>

      {/* Reactions */}
      {message.reactions && message.reactions.length > 0 && !isDeleted && (
        <div className={`mt-0.5 ${isMe ? 'pr-1' : 'pl-1'}`}>
          <ChatReactionBar
            reactions={message.reactions}
            onToggleReaction={(emoji) => onReact(message.id, emoji)}
          />
        </div>
      )}

      {/* Error state */}
      {isMe && message.local_status === 'sending' && (
        <span className="text-[10px] text-gray-500 mt-0.5">Enviando...</span>
      )}
      {isMe && message.local_status === 'error' && (
        <button
          onClick={() => onRetry(message)}
          className="text-[10px] text-red-400 mt-0.5 hover:text-red-200"
        >
          Error al enviar. Reintentar.
        </button>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ChatContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isOwnMessage={isMe}
          isEditable={canEdit}
          isDeleted={isDeleted}
          onReply={() => onReply(message)}
          onReact={() => setShowReactionPicker(true)}
          onCopy={handleCopy}
          onEdit={() => onEdit(message)}
          onDelete={() => onDelete(message.id)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
