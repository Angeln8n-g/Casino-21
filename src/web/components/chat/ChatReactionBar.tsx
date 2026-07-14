import React from 'react';

export interface ReactionGroup {
  emoji: string;
  count: number;
  hasReacted: boolean; // whether current user has reacted with this emoji
}

interface ChatReactionBarProps {
  reactions: ReactionGroup[];
  onToggleReaction: (emoji: string) => void;
}

export function ChatReactionBar({ reactions, onToggleReaction }: ChatReactionBarProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onToggleReaction(r.emoji)}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium transition-all border ${
            r.hasReacted
              ? 'bg-casino-gold/15 border-casino-gold/40 text-casino-gold shadow-[0_0_6px_rgba(251,191,36,0.15)]'
              : 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:border-white/[0.15]'
          }`}
        >
          <span className="text-xs">{r.emoji}</span>
          <span className="tabular-nums text-[10px]">{r.count}</span>
        </button>
      ))}
    </div>
  );
}
