import React, { useState, useRef, useEffect, useMemo } from 'react';

interface ChatEmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  /** If true, shows compact reaction picker (single row) */
  compact?: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '💀', '👏', '😮', '🎉'];

const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Casino',
    icon: '🎰',
    emojis: ['🎰', '🃏', '♠️', '♥️', '♦️', '♣️', '🏆', '💰', '💵', '🪙', '🎲', '🎯', '🎮', '🏅', '⭐', '💎'],
  },
  {
    label: 'Caras',
    icon: '😀',
    emojis: [
      '😀', '😂', '🤣', '😅', '😊', '😎', '🤩', '😍', '🥳', '🤔',
      '😏', '😤', '😡', '🥺', '😭', '😱', '🤯', '💀', '👻', '🤡',
      '😴', '🤢', '🤮', '🥴', '😇', '🤠', '🥶', '🥵', '😈', '👿',
    ],
  },
  {
    label: 'Gestos',
    icon: '👍',
    emojis: [
      '👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '🤙', '💪', '👊',
      '✊', '🫡', '🫶', '🖕', '☝️', '👆', '👇', '👈', '👉', '🤘',
    ],
  },
  {
    label: 'Corazones',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️',
      '💕', '💞', '💓', '💗', '💖', '💘', '💝', '♥️', '🫀', '💟',
    ],
  },
  {
    label: 'Cosas',
    icon: '🔥',
    emojis: [
      '🔥', '⚡', '💥', '✨', '🌟', '💫', '🎉', '🎊', '🎁', '🏁',
      '🚀', '💣', '🧨', '🪄', '🧿', '💬', '💭', '🗯️', '❗', '❓',
      '💯', '✅', '❌', '⭕', '🔴', '🟢', '🟡', '🔵', '⚫', '⚪',
    ],
  },
];

const RECENT_KEY = 'kasino21_recent_emojis';
const MAX_RECENT = 16;

function getRecentEmojis(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentEmoji(emoji: string) {
  try {
    const recent = getRecentEmojis().filter((e) => e !== emoji);
    recent.unshift(emoji);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

export function ChatEmojiPicker({ onSelect, onClose, compact }: ChatEmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const recentEmojis = useMemo(() => getRecentEmojis(), []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleSelect = (emoji: string) => {
    addRecentEmoji(emoji);
    onSelect(emoji);
  };

  // Compact mode: single row of quick reactions
  if (compact) {
    return (
      <div
        ref={ref}
        className="flex items-center gap-1 p-1.5 rounded-xl border border-white/[0.1] backdrop-blur-xl shadow-2xl animate-fade-in"
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.97) 0%, rgba(2,6,23,0.99) 100%)',
        }}
      >
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-base hover:scale-125 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  }

  // Full picker
  const allCategories = recentEmojis.length > 0
    ? [{ label: 'Recientes', icon: '🕐', emojis: recentEmojis }, ...EMOJI_CATEGORIES]
    : EMOJI_CATEGORIES;

  const filteredEmojis = search.trim()
    ? allCategories.flatMap((c) => c.emojis).filter((e, i, arr) => arr.indexOf(e) === i)
    : allCategories[activeCategory]?.emojis || [];

  return (
    <div
      ref={ref}
      className="w-72 rounded-xl border border-white/[0.1] shadow-2xl backdrop-blur-xl animate-slide-up overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(30,41,59,0.97) 0%, rgba(2,6,23,0.99) 100%)',
        boxShadow: '0 20px 60px -15px rgba(0,0,0,0.8)',
      }}
    >
      {/* Search */}
      <div className="px-2 pt-2 pb-1">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar emoji..."
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-casino-gold/40 transition-colors"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!search.trim() && (
        <div className="flex px-1 border-b border-white/[0.06] overflow-x-auto custom-scrollbar">
          {allCategories.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(i)}
              className={`px-2 py-1.5 text-sm transition-colors shrink-0 border-b-2 ${
                activeCategory === i
                  ? 'border-casino-gold text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="h-48 overflow-y-auto custom-scrollbar p-2">
        {!search.trim() && (
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 px-1">
            {allCategories[activeCategory]?.label}
          </p>
        )}
        <div className="grid grid-cols-8 gap-0.5">
          {filteredEmojis.map((emoji, idx) => (
            <button
              key={`${emoji}-${idx}`}
              onClick={() => handleSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all text-base hover:scale-110 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
        {filteredEmojis.length === 0 && (
          <p className="text-center text-gray-500 text-xs mt-8">Sin resultados</p>
        )}
      </div>
    </div>
  );
}

export { QUICK_REACTIONS };
