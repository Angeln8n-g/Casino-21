import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { useGame } from './useGame';

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

    // Fetch initial counts
    const fetchCounts = async () => {
      const { count: friendCount } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
        
      const { count: gameCount } = await supabase
        .from('game_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      // DB column is player_id, not user_id
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('player_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setPendingFriendRequests(friendCount || 0);
      setPendingGameInvites(gameCount || 0);

      if (notifs) {
        setAppNotifications(notifs as AppNotification[]);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      }
    };

    fetchCounts();

    // Subscribe to notifications — DB column is player_id
    const appNotifSubscription = supabase
      .channel('notifications_changes')
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
          setAppNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      )
      .subscribe();

    // Subscribe to friend_requests
    const friendSubscription = supabase
      .channel('friend_requests_changes')
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
      .channel('game_invitations_changes')
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

          // Skip if already in an active game
          if (gameStateRef.current && gameStateRef.current.phase !== 'completed') {
            return;
          }

          // Must have a room_id to be actionable
          if (!payload.new.room_id) return;

          // Fetch full sender profile
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, username, elo, level, wins, losses, xp')
            .eq('id', payload.new.sender_id)
            .single();

          if (sender) {
            const inviteData: GameInviteToastData = {
              invitationId: payload.new.id,
              senderId: payload.new.sender_id,
              username: sender.username,
              elo: sender.elo,
              level: sender.level,
              wins: sender.wins,
              losses: sender.losses,
              xp: sender.xp,
              roomId: payload.new.room_id,
              expiresAt: payload.new.expires_at,
            };

            setActiveGameInvitation(inviteData);

            showToast({
              id: payload.new.id,
              title: 'Invitación a Partida',
              message: `¡${sender.username} te invita a jugar!`,
              expiresAt: payload.new.expires_at,
              gameInviteData: inviteData,
            });
          }
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
          }
        }
      )
      .subscribe();

    return () => {
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
    await supabase.from('game_invitations').update({ status }).eq('id', id);
    setToast(null);
    if (status === 'accepted' && roomId) {
      const event = new CustomEvent('join_game_from_invite', { detail: { roomId } });
      window.dispatchEvent(event);
    }
  };

  const dismissToast = () => setToast(null);

  const totalPending = pendingFriendRequests + pendingGameInvites;

  // DB column is player_id, not user_id
  const markNotificationAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('player_id', user.id).eq('is_read', false);
  };

  const deleteReadNotifications = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('player_id', user.id).eq('is_read', true);
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
    deleteReadNotifications
  };
}
