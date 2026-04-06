import React, { useState } from 'react';
import { ToastNotification } from '../hooks/useNotifications';
import { FriendRequestModal } from './FriendRequestModal';
import { FriendRequestProfile } from './FriendRequestModal';
import { GameInviteToast } from './GameInviteToast';

interface NotificationToastProps {
  toast: ToastNotification | null;
  onDismiss: () => void;
  onGameInviteAccept: (invitationId: string, roomId: string) => void;
  onGameInviteReject: (invitationId: string) => void;
}

export function NotificationToast({
  toast,
  onDismiss,
  onGameInviteAccept,
  onGameInviteReject,
}: NotificationToastProps) {
  const [showProfileModal, setShowProfileModal] = useState(false);

  if (!toast) return null;

  // ── Game invitation: render rich dedicated toast ─────────────
  if (toast.gameInviteData) {
    return (
      <GameInviteToast
        data={toast.gameInviteData}
        onAccept={(invId, roomId) => {
          onGameInviteAccept(invId, roomId);
          onDismiss();
        }}
        onReject={(invId) => {
          onGameInviteReject(invId);
          onDismiss();
        }}
      />
    );
  }

  // ── Friend request: profile modal button ─────────────────────
  const hasFriendRequest = !!toast.friendRequestData;

  const friendProfile: FriendRequestProfile | null = toast.friendRequestData
    ? {
        requestId: toast.friendRequestData.requestId,
        senderId: toast.friendRequestData.senderId,
        username: toast.friendRequestData.username,
        elo: toast.friendRequestData.elo,
        level: toast.friendRequestData.level,
        wins: toast.friendRequestData.wins,
        losses: toast.friendRequestData.losses,
        xp: toast.friendRequestData.xp,
      }
    : null;

  return (
    <>
      {/* ── Generic / Friend-request Toast ──────────────────── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] w-11/12 max-w-sm animate-slide-down">
        <div className="glass-panel-strong p-4 border-casino-gold/50 shadow-[0_0_20px_rgba(251,191,36,0.15)] relative overflow-hidden">
          {/* Glow */}
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-casino-gold/20 blur-2xl rounded-full" />

          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔔</span>
              <h4 className="font-display font-bold text-white text-sm">{toast.title}</h4>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>

          <p className="text-gray-300 text-sm mb-3">{toast.message}</p>

          {/* Friend request → open profile modal */}
          {hasFriendRequest && (
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-casino-gold to-yellow-500 text-black font-bold text-sm hover:from-yellow-400 hover:to-casino-gold transition-all active:scale-[0.98] shadow-lg shadow-casino-gold/20"
            >
              👤 Ver perfil y responder
            </button>
          )}

          {/* Generic action buttons */}
          {!hasFriendRequest && toast.actions && toast.actions.length > 0 && (
            <div className="flex gap-2">
              {toast.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    action.primary
                      ? 'bg-casino-gold text-casino-bg hover:brightness-110'
                      : 'btn-ghost'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Friend request modal ─────────────────────────────── */}
      {showProfileModal && friendProfile && (
        <FriendRequestModal
          request={friendProfile}
          onAccepted={() => {
            setShowProfileModal(false);
            onDismiss();
          }}
          onRejected={() => {
            setShowProfileModal(false);
            onDismiss();
          }}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </>
  );
}
