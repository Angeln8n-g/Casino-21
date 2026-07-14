import React, { useEffect, useRef } from 'react';

interface ChatContextMenuProps {
  x: number;
  y: number;
  isOwnMessage: boolean;
  isEditable: boolean; // within 15-min window
  isDeleted: boolean;
  onReply: () => void;
  onReact: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'danger';
  show: boolean;
}

export function ChatContextMenu({
  x, y, isOwnMessage, isEditable, isDeleted, onReply, onReact, onCopy, onEdit, onDelete, onClose,
}: ChatContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
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

  // Clamp position to viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const pad = 8;
    let nx = x;
    let ny = y;
    if (rect.right > window.innerWidth - pad) nx = window.innerWidth - rect.width - pad;
    if (rect.bottom > window.innerHeight - pad) ny = window.innerHeight - rect.height - pad;
    if (nx < pad) nx = pad;
    if (ny < pad) ny = pad;
    if (nx !== x || ny !== y) {
      menuRef.current.style.left = `${nx}px`;
      menuRef.current.style.top = `${ny}px`;
    }
  }, [x, y]);

  const items: MenuItem[] = [
    {
      label: 'Responder',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
      action: () => { onReply(); onClose(); },
      show: !isDeleted,
    },
    {
      label: 'Reaccionar',
      icon: <span className="text-xs">😀</span>,
      action: () => { onReact(); onClose(); },
      show: !isDeleted,
    },
    {
      label: 'Copiar',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      action: () => { onCopy(); onClose(); },
      show: !isDeleted,
    },
    {
      label: 'Editar',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      action: () => { onEdit(); onClose(); },
      show: isOwnMessage && isEditable && !isDeleted,
    },
    {
      label: 'Eliminar',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      action: () => { onDelete(); onClose(); },
      variant: 'danger',
      show: isOwnMessage && !isDeleted,
    },
  ];

  const visibleItems = items.filter((i) => i.show);

  return (
    <div
      ref={menuRef}
      className="fixed z-[10010] animate-fade-in"
      style={{ left: x, top: y }}
    >
      <div
        className="min-w-[160px] rounded-xl border border-white/[0.1] py-1 shadow-2xl backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.97) 0%, rgba(2,6,23,0.99) 100%)',
          boxShadow: '0 20px 60px -15px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.1)',
        }}
      >
        {visibleItems.map((item, i) => (
          <button
            key={item.label}
            onClick={item.action}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${
              item.variant === 'danger'
                ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
