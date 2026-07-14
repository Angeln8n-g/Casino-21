import React from 'react';

interface ChatDateSeparatorProps {
  date: string; // ISO string
}

function formatDateLabel(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return 'Hoy';
  if (target.getTime() === yesterday.getTime()) return 'Ayer';

  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  if (year === now.getFullYear()) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${year}`;
}

export function ChatDateSeparator({ date }: ChatDateSeparatorProps) {
  return (
    <div className="flex items-center gap-3 my-4 select-none">
      <div className="flex-1 h-px bg-white/[0.06]" />
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">
        {formatDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  );
}

/** Utility: checks if two ISO date strings are on different calendar days */
export function isDifferentDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() !== db.getFullYear() ||
    da.getMonth() !== db.getMonth() ||
    da.getDate() !== db.getDate()
  );
}
