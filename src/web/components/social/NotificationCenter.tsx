import React, { useState, useRef, useEffect } from 'react';
import { Bell, MessageSquare, X } from 'lucide-react';
import { useSocial, Notification, GameInvitation, UnreadDm } from '../../hooks/useSocial';
import { createPortal } from 'react-dom';

const TYPE_ICONS: Record<string, string> = {
  friend_request: '👤',
  game_invitation: '🎮',
  tournament_start: '🏆',
  achievement: '🏅',
  level_up: '⬆️',
  division_change: '📊',
  round_ready: '🃏',
};

interface NotificationCenterProps {
  onOpenChat?: (friendId: string, friendName: string) => void;
}

export function NotificationBadge({ onClick }: { onClick: () => void }) {
  const { unreadCount } = useSocial();
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
    >
      <Bell size={20} className="text-gray-300" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export function NotificationCenter({ onOpenChat }: NotificationCenterProps) {
  const { notifications, gameInvitations, unreadDms, markAllRead, acceptGameInvitation, rejectGameInvitation, clearUnreadDm, dismissNotification } = useSocial();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && notifications.some(n => !n.is_read)) markAllRead();
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpenChat = (dm: UnreadDm) => {
    clearUnreadDm(dm.senderId);
    setOpen(false);
    onOpenChat?.(dm.senderId, dm.senderName);
  };

  const totalItems = gameInvitations.length + unreadDms.length + notifications.length;

  const panel = open && (
    <>
      {/* Overlay solo en móvil */}
      <div
        className="fixed inset-0 bg-black/50 z-40 sm:hidden"
        onClick={() => setOpen(false)}
      />
      {/* Panel: bottom sheet en móvil, dropdown en desktop */}
      <div className="
        fixed bottom-0 left-0 right-0 z-50
        sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80
        bg-slate-900 border-t border-white/10
        sm:border sm:border-white/10 sm:rounded-2xl
        rounded-t-2xl shadow-2xl overflow-hidden
        max-h-[75vh] sm:max-h-96
        flex flex-col
      ">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <h3 className="text-white font-bold text-sm">Notificaciones</h3>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {totalItems === 0 ? (
            <p className="text-center text-gray-500 text-sm py-6">Sin notificaciones</p>
          ) : (
            <>
              {gameInvitations.map(inv => (
                <GameInvitationItem
                  key={inv.id}
                  invitation={inv}
                  onAccept={acceptGameInvitation}
                  onReject={rejectGameInvitation}
                />
              ))}
              {unreadDms.map(dm => (
                <DmNotificationItem key={dm.senderId} dm={dm} onOpen={handleOpenChat} />
              ))}
              {notifications.map(n => (
                <NotificationItem key={n.id} notification={n} onDismiss={dismissNotification} />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="relative" ref={ref}>
      <NotificationBadge onClick={handleOpen} />
      {typeof document !== 'undefined' ? createPortal(panel, document.body) : panel}
    </div>
  );
}

function DmNotificationItem({ dm, onOpen }: { dm: UnreadDm; onOpen: (dm: UnreadDm) => void }) {
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-white/5 bg-blue-500/10 cursor-pointer hover:bg-blue-500/20 transition-colors group" onClick={() => onOpen(dm)}>
      <MessageSquare size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">
          <span className="text-blue-400">{dm.senderName}</span>
          {dm.count > 1 && <span className="ml-1 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">{dm.count}</span>}
        </p>
        <p className="text-gray-400 text-xs truncate mt-0.5">{dm.lastMessage}</p>
        <p className="text-blue-400 text-xs mt-1 font-medium">Toca para responder →</p>
      </div>
    </div>
  );
}

function GameInvitationItem({ invitation, onAccept, onReject }: {
  invitation: GameInvitation;
  onAccept: (id: string, roomId: string) => void;
  onReject: (id: string) => void;
}) {
  const time = new Date(invitation.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-white/5 bg-yellow-500/10">
      <span className="text-xl flex-shrink-0">🎮</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm leading-snug font-medium">
          <span className="text-yellow-400">{invitation.sender_username}</span> te invita a una partida
        </p>
        <p className="text-gray-500 text-xs mt-0.5">{time}</p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onAccept(invitation.id, invitation.room_id)}
            className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            Unirse
          </button>
          <button
            onClick={() => onReject(invitation.id)}
            className="bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationItem({ notification, onDismiss }: { notification: Notification; onDismiss: (id: string) => void }) {
  const { acceptGameInvitation, rejectGameInvitation } = useSocial();
  const icon = TYPE_ICONS[notification.type] || '🔔';
  const time = new Date(notification.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const meta = notification.metadata;
  const isGameInvite = notification.type === 'game_invitation' && meta?.invitationId;

  return (
    <div className={`flex gap-3 px-4 py-3 border-b border-white/5 group ${!notification.is_read ? 'bg-blue-500/10' : ''} ${isGameInvite ? 'bg-yellow-500/10' : ''}`}>
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm leading-snug">{notification.content}</p>
        <p className="text-gray-500 text-xs mt-0.5">{time}</p>
        {isGameInvite && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { acceptGameInvitation(meta.invitationId, meta.roomId || ''); onDismiss(notification.id); }}
              className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              Unirse
            </button>
            <button
              onClick={() => { rejectGameInvitation(meta.invitationId); onDismiss(notification.id); }}
              className="bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              Rechazar
            </button>
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity text-gray-500 hover:text-red-400 flex-shrink-0 self-start mt-0.5"
        title="Eliminar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
