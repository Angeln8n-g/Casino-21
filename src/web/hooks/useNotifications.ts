import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { useGame } from './useGame';
import { socketService } from '../services/socket';

export interface AppNotification {
  id: string;
  type: string;
  content: string;
  created_at: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface FriendRequestToastData {
  requestId: string;
  senderId: string;
  username: string;
  elo: number;
  level: number;
  wins: number;
  losses: number;
  xp: number;
}

export interface GameInviteToastData {
  invitationId: string;
  senderId: string;
  username: string;
  elo: number;
  level: number;
  wins: number;
  losses: number;
  xp: number;
  roomId: string;
  expiresAt: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  division?: string;
  expiresAt?: string;
  actions?: NotificationAction[];
  /** If set, the toast should open the FriendRequestModal instead of inline buttons */
  friendRequestData?: FriendRequestToastData;
  /** If set, renders the rich GameInviteToast */
  gameInviteData?: GameInviteToastData;
}

export function useNotifications() {
  const { user } = useAuth();
  const { gameState } = useGame();
  const gameStateRef = useRef(gameState);
  const seenGameInviteIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [pendingGameInvites, setPendingGameInvites] = useState(0);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [activeGameInvitation, setActiveGameInvitation] = useState<GameInviteToastData | null>(null);
  
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;

    const buildAndShowGameInvite = async (inviteRow: any) => {
      if (!inviteRow?.id || !inviteRow?.sender_id || !inviteRow?.room_id) return;
      if (seenGameInviteIdsRef.current.has(inviteRow.id)) return;
      if (gameStateRef.current && gameStateRef.current.phase !== 'completed') return;

      const { data: sender } = await supabase
        .from('profiles')
        .select('id, username, elo, level, wins, losses, xp')
        .eq('id', inviteRow.sender_id)
        .single();

      if (!sender) return;

      const inviteData: GameInviteToastData = {
        invitationId: inviteRow.id,
        senderId: inviteRow.sender_id,
        username: sender.username,
        elo: sender.elo,
        level: sender.level,
        wins: sender.wins,
        losses: sender.losses,
        xp: sender.xp,
        roomId: inviteRow.room_id,
        expiresAt: inviteRow.expires_at,
      };

      seenGameInviteIdsRef.current.add(inviteRow.id);
      setActiveGameInvitation(inviteData);
      showToast({
        id: inviteRow.id,
        title: 'Invitación a Partida',
        message: `¡${sender.username} te invita a jugar!`,
        expiresAt: inviteRow.expires_at,
        gameInviteData: inviteData,
      });
    };

    // Fetch initial counts
    const fetchCounts = async () => {
      try {
        const { count: friendCount, error: friendError } = await supabase
          .from('friend_requests')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('status', 'pending');
          
        if (friendError) throw friendError;

        const { count: gameCount, error: gameError } = await supabase
          .from('game_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('status', 'pending');
          
        if (gameError) throw gameError;

        // DB column is player_id, not user_id
        const { data: notifs, error: notifError } = await supabase
          .from('notifications')
          .select('*')
          .eq('player_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (notifError) throw notifError;

        // Fallback robustness:
        // if realtime event was missed, this ensures pending challenge appears without page refresh.
        const { data: latestPendingInvite } = await supabase
          .from('game_invitations')
          .select('id, sender_id, room_id, expires_at, status, created_at')
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;

        setPendingFriendRequests(friendCount || 0);
        setPendingGameInvites(gameCount || 0);

        if (notifs) {
          setAppNotifications(notifs as AppNotification[]);
          setUnreadCount(notifs.filter(n => !n.is_read).length);
        }

        if (latestPendingInvite && latestPendingInvite.room_id) {
          await buildAndShowGameInvite(latestPendingInvite);
        }
      } catch (error: any) {
        if (!isMounted) return;
        console.error('Error fetching notification counts:', error);
      }
    };

    fetchCounts();
    const pollingId = window.setInterval(fetchCounts, 7000);

    // Subscribe to notifications — DB column is player_id
    const appNotifSubscription = supabase
      .channel(`notifications_changes_${user.id}_${Date.now()}_${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `player_id=eq.${user.id}` },
        (payload) => {
          setAppNotifications(prev => [payload.new as AppNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `player_id=eq.${user.id}` },
        (payload) => {
          setAppNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new as AppNotification : n));
          if (payload.new.is_read && !payload.old.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => {
          setAppNotifications(prev => {
            const deleted = prev.find(n => n.id === payload.old.id);
            if (deleted && !deleted.is_read) {
              setUnreadCount(current => Math.max(0, current - 1));
            }
            return prev.filter(n => n.id !== payload.old.id);
          });
        }
      )
      .subscribe();

    // Subscribe to friend_requests
    const friendSubscription = supabase
      .channel(`friend_requests_changes_${user.id}_${Date.now()}_${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          setPendingFriendRequests((prev) => prev + 1);
          // Fetch full sender profile for modal
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, username, elo, level, wins, losses, xp')
            .eq('id', payload.new.sender_id)
            .single();

          if (sender) {
            showToast({
              id: payload.new.id,
              title: '📨 Solicitud de Amistad',
              message: `${sender.username} quiere ser tu amigo`,
              friendRequestData: {
                requestId: payload.new.id,
                senderId: sender.id,
                username: sender.username,
                elo: sender.elo,
                level: sender.level,
                wins: sender.wins,
                losses: sender.losses,
                xp: sender.xp,
              },
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.status !== 'pending') {
            setPendingFriendRequests((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Subscribe to game_invitations
    const gameSubscription = supabase
      .channel(`game_invitations_changes_${user.id}_${Date.now()}_${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_invitations',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          setPendingGameInvites((prev) => prev + 1);

          await buildAndShowGameInvite(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_invitations',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.status !== 'pending') {
            setPendingGameInvites((prev) => Math.max(0, prev - 1));
            seenGameInviteIdsRef.current.delete(payload.new.id);
            // Close modal if this is the active invitation
            setActiveGameInvitation(current => {
              if (current && current.invitationId === payload.new.id) {
                return null;
              }
              return current;
            });
            // Mark the notification as read if it corresponds to this invitation
            supabase
              .from('notifications')
              .update({ is_read: true })
              .eq('player_id', user.id)
              .eq('type', 'game_invitation')
              .contains('metadata', { invitation_id: payload.new.id })
              .then(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(pollingId);
      supabase.removeChannel(friendSubscription);
      supabase.removeChannel(appNotifSubscription);
      supabase.removeChannel(gameSubscription);
    };
  }, [user]);

  const showToast = (notification: ToastNotification) => {
    setToast(notification);
    
    // Auto-dismiss logic
    let timeoutMs = 30000; // Default 30s
    if (notification.expiresAt) {
      const remaining = new Date(notification.expiresAt).getTime() - Date.now();
      timeoutMs = Math.max(5000, remaining); // At least 5 seconds
    }
    
    setTimeout(() => {
      setToast((current) => current?.id === notification.id ? null : current);
    }, timeoutMs);
  };

  const handleFriendRequest = async (id: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error updating friend request:', error);
      }
    } catch (error) {
      console.error(error);
    }
    setToast(null);
  };

  const handleGameInvite = async (id: string, roomId: string | null, status: 'accepted' | 'rejected') => {
    // 1. Check current status before accepting
    if (status === 'accepted') {
      const { data } = await supabase.from('game_invitations').select('status').eq('id', id).single();
      if (data && (data.status === 'cancelled' || data.status === 'expired')) {
        setToast({
          id: 'expired-invite',
          title: 'Invitación no válida',
          message: 'La invitación ha expirado o fue cancelada.',
        });
        setActiveGameInvitation(null);
        return;
      }
    }

    await supabase.from('game_invitations').update({ status }).eq('id', id);

    if (status === 'rejected' && roomId) {
      try {
        const socket = await socketService.connect();
        socket.emit('cancel_room', { roomId, reason: 'challenge_rejected' });
      } catch (err) {
        console.warn('No se pudo cerrar la sala rechazada:', err);
      }
    }

    setToast(null);
    setActiveGameInvitation(null);
    if (status === 'accepted' && roomId) {
      const event = new CustomEvent('join_game_from_invite', { detail: { roomId } });
      window.dispatchEvent(event);
    }
  };

  const dismissToast = () => setToast(null);

  const totalPending = pendingFriendRequests + pendingGameInvites;

  const removeNotificationFromState = (id: string) => {
    setAppNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.is_read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      return prev.filter((n) => n.id !== id);
    });
  };

  // DB column is player_id, not user_id
  const markNotificationAsRead = async (id: string) => {
    removeNotificationFromState(id);
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('player_id', user?.id || '');
    if (error) {
      console.error('Error eliminando notificación:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    // Update local state immediately so UI reacts without waiting for Realtime
    setAppNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    // Persist to DB
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('player_id', user.id)
      .eq('is_read', false);
  };

  const deleteReadNotifications = async () => {
    if (!user) return;
    // Remove from local state
    setAppNotifications(prev => prev.filter(n => !n.is_read));
    // Persist
    await supabase.from('notifications').delete().eq('player_id', user.id).eq('is_read', true);
  };

  const deleteNotification = async (id: string) => {
    removeNotificationFromState(id);
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('player_id', user?.id || '');
    if (error) {
      console.error('Error eliminando notificación:', error);
    }
  };

  return {
    pendingFriendRequests,
    pendingGameInvites,
    totalPending,
    toast,
    activeGameInvitation,
    setActiveGameInvitation,
    dismissToast,
    handleGameInvite,
    appNotifications,
    unreadCount,
    markNotificationAsRead,
    markAllAsRead,
    deleteReadNotifications,
    deleteNotification
  };
}
