import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatReplyPreview } from './ChatReplyPreview';
import { ChatEmojiPicker } from './ChatEmojiPicker';
import { EnhancedChatMessage } from './ChatMessageBubble';

interface ChatInputProps {
  onSend: (text: string) => void;
  replyingTo: EnhancedChatMessage | null;
  editingMessage: EnhancedChatMessage | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: (messageId: string, newContent: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  onTyping?: () => void;
}

export function ChatInput({
  onSend, replyingTo, editingMessage, onCancelReply, onCancelEdit, onSubmitEdit,
  placeholder = 'Escribe un mensaje...', maxLength = 500, disabled, onTyping,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-resize textarea
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 120; // ~5 lines
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => { resize(); }, [text, resize]);

  // When editing starts, populate the textarea
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Focus textarea when replying
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    if (editingMessage) {
      if (trimmed !== editingMessage.content) {
        onSubmitEdit(editingMessage.id, trimmed);
      }
      onCancelEdit();
      setText('');
      return;
    }

    onSend(trimmed);
    setText('');
    setShowEmojiPicker(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      if (editingMessage) onCancelEdit();
      else if (replyingTo) onCancelReply();
      else if (showEmojiPicker) setShowEmojiPicker(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping?.();
  };

  const handleEmojiSelect = (emoji: string) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = text.slice(0, start);
      const after = text.slice(end);
      const newText = before + emoji + after;
      setText(newText);

      // Restore cursor position after emoji
      requestAnimationFrame(() => {
        const newPos = start + emoji.length;
        el.setSelectionRange(newPos, newPos);
        el.focus();
      });
    } else {
      setText((prev) => prev + emoji);
    }
  };

  const isEditing = !!editingMessage;

  return (
    <div className="relative mt-auto">
      {/* Reply preview */}
      {replyingTo && !isEditing && (
        <ChatReplyPreview
          username={replyingTo.profiles?.username || 'Jugador'}
          text={replyingTo.content}
          onCancel={onCancelReply}
        />
      )}

      {/* Edit indicator */}
      {isEditing && (
        <div className="flex items-center gap-2 px-3 py-2 bg-casino-gold/5 border-b border-casino-gold/20 animate-slide-up">
          <svg className="w-3.5 h-3.5 text-casino-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-[11px] text-casino-gold font-bold flex-1">Editando mensaje</span>
          <button
            onClick={() => { onCancelEdit(); setText(''); }}
            className="shrink-0 p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Emoji picker (above input) */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 left-0 z-[10005]">
          <ChatEmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 px-2 py-2 bg-black/20 border-t border-white/5">
        {/* Emoji button */}
        <button
          ref={emojiButtonRef}
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          className={`shrink-0 p-2 rounded-xl transition-all ${
            showEmojiPicker
              ? 'text-casino-gold bg-casino-gold/10'
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
          }`}
          title="Emojis"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-black/40 border border-white/5 focus:border-casino-gold/50 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 resize-none custom-scrollbar transition-colors focus:outline-none disabled:opacity-40"
          style={{ minHeight: '36px', maxHeight: '120px' }}
        />

        {/* Send / Confirm button */}
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className={`shrink-0 p-2 rounded-xl transition-all disabled:opacity-30 ${
            isEditing
              ? 'text-casino-emerald hover:text-white hover:bg-casino-emerald/20'
              : 'text-casino-gold hover:text-white hover:bg-white/10'
          }`}
          title={isEditing ? 'Confirmar edición' : 'Enviar'}
        >
          {isEditing ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </form>

      {/* Character count (when near limit) */}
      {text.length > maxLength * 0.8 && (
        <div className={`absolute bottom-14 right-4 text-[9px] font-mono tabular-nums ${
          text.length > maxLength * 0.95 ? 'text-red-400' : 'text-gray-600'
        }`}>
          {text.length}/{maxLength}
        </div>
      )}
    </div>
  );
}
