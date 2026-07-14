import React from 'react';

interface ChatReplyPreviewProps {
  /** Username of the person being replied to */
  username: string;
  /** Truncated text of the original message */
  text: string;
  /** If true, renders as the inline strip inside a message bubble */
  inline?: boolean;
  /** Called when user clicks ✕ to cancel the reply (only in input mode) */
  onCancel?: () => void;
  /** Called when user clicks the preview to scroll to the original message */
  onClick?: () => void;
}

export function ChatReplyPreview({ username, text, inline, onCancel, onClick }: ChatReplyPreviewProps) {
  const truncated = text.length > 80 ? text.slice(0, 80) + '…' : text;

  // Inline version: shown inside message bubbles as a quote strip
  if (inline) {
    return (
      <div
        className="border-l-2 border-casino-gold/50 pl-2 mb-1.5 cursor-pointer hover:bg-white/[0.03] rounded-r-md transition-colors"
        onClick={onClick}
      >
        <p className="text-[10px] font-bold text-casino-gold/80 leading-tight">{username}</p>
        <p className="text-[11px] text-gray-400 leading-tight line-clamp-2">{truncated}</p>
      </div>
    );
  }

  // Input mode: shown above the textarea when replying
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-white/[0.03] border-b border-white/5 animate-slide-up">
      <div className="flex-1 min-w-0 border-l-2 border-casino-gold/50 pl-2">
        <p className="text-[10px] font-bold text-casino-gold/80 leading-tight">
          Respondiendo a {username}
        </p>
        <p className="text-[11px] text-gray-400 leading-tight truncate">{truncated}</p>
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="shrink-0 p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          title="Cancelar respuesta"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
