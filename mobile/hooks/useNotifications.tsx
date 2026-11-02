import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { useGame } from './useGame';
import { socketService } from '../services/socket';
import { appEvents } from '../utils/events';

export interface AppNotification {
  id: string;
  type: string;
  content: string;
  created_at: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
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

export function useNotifications() {
  const { user, profile } = useAuth();
  const { gameState } = useGame();
  const gameStateRef = useRef(gameState);
  const seenGameInviteIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [pendingGameInvites, setPendingGameInvites] = useState(0);
  const [activeGameInvitation, setActiveGameInvitation] = useState<GameInviteToastData | null>(null);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const buildAndShowGameInvite = async (inviteRow: any) => {
      if (!inviteRow?.id || !inviteRow?.sender_id || !inviteRow?.room_id) return;
      if (seenGameInviteIdsRef.current.has(inviteRow.id)) return;
      if (gameStateRef.current && (gameStateRef.current.phase as any) !== 'completed' && (gameStateRef.current.phase as any) !== 'setup') return;

      const { data: sender } = await supabase
        .from('profiles')
        .select('id, username, elo, level, wins, losses, xp')
        .eq('id', inviteRow.sender_id)
        .single();

      if (!sender || !isMounted) return;

      const inviteData: GameInviteToastData = {
        invitationId: inviteRow.id,
        senderId: inviteRow.sender_id,
        username: sender.username,
        elo: sender.elo || 1000,
        level: sender.level || 1,
        wins: sender.wins || 0,
        losses: sender.losses || 0,
        xp: sender.xp || 0,
        roomId: inviteRow.room_id,
        expiresAt: inviteRow.expires_at || new Date(Date.now() + 60000).toISOString(),
      };

      seenGameInviteIdsRef.current.add(inviteRow.id);
      console.log('Incoming game invitation received from API:', inviteData);
      setActiveGameInvitation(inviteData);
    };

    const fetchCounts = async () => {
      try {
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

        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('player_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

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
          setUnreadCount(notifs.filter((n) => !n.is_read).length);
        }

        if (latestPendingInvite && latestPendingInvite.room_id) {
          await buildAndShowGameInvite(latestPendingInvite);
        }
      } catch (error: any) {
        if (!isMounted) return;
        console.warn('Error fetching notification counts:', error);
      }
    };

    fetchCounts();
    const pollingId = setInterval(fetchCounts, 10000);

    // 1. Suscripción a notificaciones
    const notifChannel = supabase
      .channel(`mobile_notifs_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `player_id=eq.${user.id}` },
        (payload) => {
          setAppNotifications((prev) => [payload.new as AppNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `player_id=eq.${user.id}` },
        (payload) => {
          setAppNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? (payload.new as AppNotification) : n))
          );
        }
      )
      .subscribe();

    // 2. Suscripción a friend_requests
    const friendChannel = supabase
      .channel(`mobile_friend_reqs_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.id}` },
        () => {
          setPendingFriendRequests((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.status !== 'pending') {
            setPendingFriendRequests((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // 3. Suscripción a game_invitations
    const gameChannel = supabase
      .channel(`mobile_game_invites_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_invitations', filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          setPendingGameInvites((prev) => prev + 1);
          await buildAndShowGameInvite(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_invitations', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.status !== 'pending') {
            setPendingGameInvites((prev) => Math.max(0, prev - 1));
            seenGameInviteIdsRef.current.delete(payload.new.id);
            setActiveGameInvitation((curr) => (curr?.invitationId === payload.new.id ? null : curr));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(pollingId);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(friendChannel);
      supabase.removeChannel(gameChannel);
    };
  }, [user]);

  const handleGameInvite = async (invitationId: string, status: 'accepted' | 'rejected', roomId?: string) => {
    if (!user) return;

    try {
      await supabase.from('game_invitations').update({ status }).eq('id', invitationId);

      if (status === 'rejected' && roomId) {
        try {
          const socket = await socketService.connect();
          socket.emit('cancel_room', { roomId, reason: 'challenge_rejected' });
        } catch (err) {
          console.warn('No se pudo cancelar sala de desafío rechazada:', err);
        }
      }

      setActiveGameInvitation(null);

      if (status === 'accepted' && roomId) {
        const socket = await socketService.connect();
        socket.emit('join_room', {
          roomId,
          playerName: profile?.username || 'Jugador K21',
        });
        appEvents.emit('room_joined_event', { roomId });
      }
    } catch (err) {
      console.warn('Error resolviendo game invitation:', err);
    }
  };

  const markNotificationAsRead = useCallback(
    async (id: string) => {
      if (!user) return;
      setAppNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await supabase.rpc('mark_notification_read', {
          p_notification_id: id,
          p_player_id: user.id,
        });
      } catch (error) {
        console.warn('Error marcando notificación como leída:', error);
      }
    },
    [user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setAppNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await supabase.rpc('mark_all_notifications_read', {
        p_player_id: user.id,
      });
    } catch (error) {
      console.warn('Error marcando todas las notificaciones como leídas:', error);
    }
  }, [user]);

  return {
    pendingFriendRequests,
    pendingGameInvites,
    totalPending: pendingFriendRequests + pendingGameInvites,
    activeGameInvitation,
    setActiveGameInvitation,
    handleGameInvite,
    appNotifications,
    unreadCount,
    markNotificationAsRead,
    markAllAsRead,
  };
}
