import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { useGame } from './useGame';
import { useAudio } from './useAudio';
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
  durationMs?: number;
  iconEmoji?: string;
  avatarUrl?: string | null;
  avatarFallback?: string;
  onClick?: () => void;
  actions?: NotificationAction[];
  /** If set, the toast should open the FriendRequestModal instead of inline buttons */
  friendRequestData?: FriendRequestToastData;
  /** If set, renders the rich GameInviteToast */
  gameInviteData?: GameInviteToastData;
}

export function useNotifications() {
  const { user } = useAuth();
  const { gameState } = useGame();
  const { playSfx } = useAudio();
  const gameStateRef = useRef(gameState);
  const seenGameInviteIdsRef = useRef<Set<string>>(new Set());
  const seenPrivateMsgIdsRef = useRef<Set<string>>(new Set());
  const friendIdsRef = useRef<Set<string>>(new Set());
  const activePrivateChatFriendIdRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [pendingGameInvites, setPendingGameInvites] = useState(0);
  const [unreadPrivateMessages, setUnreadPrivateMessages] = useState(0);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [activeGameInvitation, setActiveGameInvitation] = useState<GameInviteToastData | null>(null);
  
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (notification: ToastNotification) => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      setToast(notification);
      try {
        playSfx('notification');
      } catch {}

      let timeoutMs = notification.durationMs ?? 3000;
      if (notification.expiresAt) {
        const remaining = new Date(notification.expiresAt).getTime() - Date.now();
        timeoutMs = Math.max(timeoutMs, remaining);
      }

      toastTimerRef.current = setTimeout(() => {
        setToast((current) => (current?.id === notification.id ? null : current));
        toastTimerRef.current = null;
      }, timeoutMs);
    },
    [playSfx]
  );

  useEffect(() => {
    const handleActiveChatChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ friendId?: string | null }>;
      activePrivateChatFriendIdRef.current = customEvent.detail?.friendId || null;
    };
    window.addEventListener('active_private_chat_changed', handleActiveChatChanged);
    return () => {
      window.removeEventListener('active_private_chat_changed', handleActiveChatChanged);
      activePrivateChatFriendIdRef.current = null;
    };
  }, []);

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

      if (!sender || !isMounted) return;

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

    const refreshFriendIds = async () => {
      try {
        const [reqFriendsRes, friendshipsRes] = await Promise.all([
          supabase
            .from('friend_requests')
            .select('sender_id, receiver_id')
            .eq('status', 'accepted')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
          supabase
            .from('friendships')
            .select('player1_id, player2_id')
            .eq('status', 'accepted')
            .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`),
        ]);

        const nextFriends = new Set<string>();
        for (const row of (reqFriendsRes.data || []) as any[]) {
          const otherId = row.sender_id === user.id ? row.receiver_id : row.sender_id;
          if (otherId) nextFriends.add(otherId);
        }
        for (const row of (friendshipsRes.data || []) as any[]) {
          const otherId = row.player1_id === user.id ? row.player2_id : row.player1_id;
          if (otherId) nextFriends.add(otherId);
        }
        if (isMounted) {
          friendIdsRef.current = nextFriends;
        }
      } catch {}
    };

    const checkIsFriend = async (senderId: string): Promise<boolean> => {
      if (friendIdsRef.current.has(senderId)) return true;
      try {
        const [reqRes, fsRes] = await Promise.all([
          supabase
            .from('friend_requests')
            .select('id')
            .eq('status', 'accepted')
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${senderId}),and(sender_id.eq.${senderId},receiver_id.eq.${user.id})`
            )
            .limit(1)
            .maybeSingle(),
          supabase
            .from('friendships')
            .select('id')
            .eq('status', 'accepted')
            .or(
              `and(player1_id.eq.${user.id},player2_id.eq.${senderId}),and(player1_id.eq.${senderId},player2_id.eq.${user.id})`
            )
            .limit(1)
            .maybeSingle(),
        ]);
        if (reqRes.data || fsRes.data) {
          friendIdsRef.current.add(senderId);
          return true;
        }
      } catch {}
      return false;
    };

    const isPrivateChatOpenWith = (senderId: string): boolean => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return false;
      }
      return activePrivateChatFriendIdRef.current === senderId;
    };

    const formatPrivateMessagePreview = (msg: any): string => {
      const normalized =
        typeof msg?.content === 'string'
          ? msg.content.replace(/\s+/g, ' ').trim()
          : '';
      if (msg?.message_type === 'image') {
        return normalized ? `📷 Imagen: ${normalized}` : '📷 Te envió una imagen';
      }
      if (msg?.message_type === 'audio') {
        return '🎤 Te envió un mensaje de voz';
      }
      if (!normalized) {
        return 'Te envió un mensaje';
      }
      return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
    };

    const refreshPmUnreadCount = async () => {
      try {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);
        if (isMounted) {
          setUnreadPrivateMessages(count || 0);
        }
      } catch {}
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

        const { count: pmUnreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        if (!isMounted) return;

        setPendingFriendRequests(friendCount || 0);
        setPendingGameInvites(gameCount || 0);
        setUnreadPrivateMessages(pmUnreadCount || 0);

        if (notifs) {
          setAppNotifications(notifs as AppNotification[]);
          setUnreadCount(notifs.filter(n => !n.is_read).length);
        }

        if (latestPendingInvite && latestPendingInvite.room_id) {
          await buildAndShowGameInvite(latestPendingInvite);
        }

        await refreshFriendIds();
      } catch (error: any) {
        if (!isMounted) return;
        const message = String(error?.message || '');
        if (message.includes('Failed to fetch')) return;
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
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Error en canal notifications:', status, err);
        }
      });

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
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Error en canal friend_requests:', status, err);
        }
      });

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
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Error en canal game_invitations:', status, err);
        }
      });

    // Subscribe to private messages for unread count & interactive friend-message toast
    const pmSubscription = supabase
      .channel(`messages_notif_${user.id}_${Date.now()}_${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (!newMsg?.sender_id || newMsg.sender_id === user.id || newMsg.deleted_at) {
            return;
          }

          const senderId = String(newMsg.sender_id);
          const isViewingThisChat = isPrivateChatOpenWith(senderId);

          if (!isViewingThisChat) {
            refreshPmUnreadCount();
          }

          if (newMsg.id && seenPrivateMsgIdsRef.current.has(newMsg.id)) {
            return;
          }
          if (newMsg.id) {
            if (seenPrivateMsgIdsRef.current.size >= 100) {
              const oldest = seenPrivateMsgIdsRef.current.values().next().value;
              if (oldest) seenPrivateMsgIdsRef.current.delete(oldest);
            }
            seenPrivateMsgIdsRef.current.add(newMsg.id);
          }

          if (isViewingThisChat) {
            return;
          }

          (async () => {
            try {
              const [isFriend, profileRes] = await Promise.all([
                checkIsFriend(senderId),
                supabase
                  .from('profiles')
                  .select('id, username, avatar_url, equipped_avatar')
                  .eq('id', senderId)
                  .maybeSingle(),
              ]);

              if (!isMounted || !isFriend || isPrivateChatOpenWith(senderId)) {
                return;
              }

              const sender = profileRes.data;
              const senderName = sender?.username || 'Tu amigo';
              const preview = formatPrivateMessagePreview(newMsg);
              const avatarUrl =
                typeof (sender?.equipped_avatar || sender?.avatar_url) === 'string'
                  ? (sender?.equipped_avatar || sender?.avatar_url).trim()
                  : null;

              const openChat = () => {
                sessionStorage.setItem('open_chat_friend_id', senderId);
                window.dispatchEvent(
                  new CustomEvent('open_social_tab', {
                    detail: { tab: 'chat', friendId: senderId },
                  })
                );
                dismissToast();
              };

              showToast({
                id: `pm-${newMsg.id || Date.now()}`,
                title: `💬 Mensaje de ${senderName}`,
                message: preview,
                iconEmoji: '💬',
                avatarUrl,
                avatarFallback: senderName.charAt(0).toUpperCase() || 'A',
                durationMs: 6500,
                onClick: openChat,
                actions: [
                  {
                    label: '💬 Responder',
                    onClick: openChat,
                    primary: true,
                  },
                ],
              });
            } catch {}
          })();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          refreshPmUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          refreshPmUnreadCount();
        }
      )
      .subscribe();

    const handleFriendshipsChanged = () => {
      refreshFriendIds();
    };
    window.addEventListener('friendships_changed', handleFriendshipsChanged);

    // Subscribe to Socket.io events for friend presence & waiting notifications
    let socketInstance: any = null;
    socketService.connect().then((socket) => {
      if (!isMounted) return;
      socketInstance = socket;

      const handleOnlineFriendsSummary = ({ friends }: { friends: Array<{ id: string; username: string; status: 'online' | 'in_match'; roomId?: string }> }) => {
        if (!friends || friends.length === 0) return;

        const matchFriend = friends.find((f) => f.status === 'in_match');
        if (matchFriend) {
          showToast({
            id: `friend-in-match-${matchFriend.id}`,
            title: '🎮 Amigo en Partida',
            message: `Tu amigo ${matchFriend.username} está jugando una partida.`,
            actions: [
              {
                label: '⏳ Decirle que lo espero',
                onClick: () => {
                  socketService.notifyFriendWaiting(matchFriend.id);
                  setToast(null);
                },
                primary: true,
              },
            ],
          });
          return;
        }

        const onlineFriend = friends.find((f) => f.status === 'online');
        if (onlineFriend) {
          showToast({
            id: `friend-online-${onlineFriend.id}`,
            title: '⚡ Amigo en Línea',
            message: `Tu amigo ${onlineFriend.username} está activo en el juego.`,
            actions: [
              {
                label: '👋 Notificar que entré',
                onClick: () => {
                  socketService.notifyFriendConnected(onlineFriend.id);
                  setToast(null);
                },
                primary: true,
              },
            ],
          });
        }
      };

      const handleFriendJustConnected = ({ senderName }: { senderName: string }) => {
        showToast({
          id: `friend-connected-${Date.now()}`,
          title: '👋 ¡Amigo Conectado!',
          message: `¡${senderName} se acaba de conectar al juego!`,
        });
      };

      const handleFriendWaitingForYou = ({ senderName }: { senderName: string }) => {
        showToast({
          id: `friend-waiting-${Date.now()}`,
          title: '⏳ ¡Te están esperando!',
          message: `¡${senderName} se ha conectado y te está esperando para jugar!`,
        });
      };

      const handleFriendConnectedSent = ({ targetName }: { targetName: string }) => {
        showToast({
          id: `friend-sent-${Date.now()}`,
          title: 'Notificación Enviada',
          message: `Le avisamos a ${targetName} que estás en el juego.`,
        });
      };

      const handleFriendWaitingSent = ({ targetName }: { targetName: string }) => {
        showToast({
          id: `friend-waiting-sent-${Date.now()}`,
          title: 'Aviso Enviado',
          message: `Le avisamos a ${targetName} que lo estás esperando para jugar.`,
        });
      };

      socket.on('online_friends_summary', handleOnlineFriendsSummary);
      socket.on('friend_just_connected', handleFriendJustConnected);
      socket.on('friend_waiting_for_you', handleFriendWaitingForYou);
      socket.on('friend_connected_sent', handleFriendConnectedSent);
      socket.on('friend_waiting_sent', handleFriendWaitingSent);

      socketInstance._friendCleanup = () => {
        socket.off('online_friends_summary', handleOnlineFriendsSummary);
        socket.off('friend_just_connected', handleFriendJustConnected);
        socket.off('friend_waiting_for_you', handleFriendWaitingForYou);
        socket.off('friend_connected_sent', handleFriendConnectedSent);
        socket.off('friend_waiting_sent', handleFriendWaitingSent);
      };
    }).catch((err) => {
      console.warn('Socket connect error in useNotifications:', err);
    });

    return () => {
      isMounted = false;
      window.clearInterval(pollingId);
      window.removeEventListener('friendships_changed', handleFriendshipsChanged);
      supabase.removeChannel(friendSubscription);
      supabase.removeChannel(appNotifSubscription);
      supabase.removeChannel(gameSubscription);
      supabase.removeChannel(pmSubscription);
      if (socketInstance?._friendCleanup) {
        socketInstance._friendCleanup();
      }
    };
  }, [user, showToast, dismissToast]);

  const handleFriendRequest = async (id: string, status: 'accepted' | 'rejected') => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('respond_friend_request', {
        p_request_id: id,
        p_user_id: user.id,
        p_action: status
      });

      if (error) {
        console.error('Error updating friend request:', error);
      }
    } catch (error) {
      console.error(error);
    }
    dismissToast();
  };

  const handleGameInvite = async (id: string, roomId: string | null, status: 'accepted' | 'rejected') => {
    // 1. Check current status before accepting
    if (status === 'accepted') {
      const { data } = await supabase.from('game_invitations').select('status').eq('id', id).single();
      if (data && (data.status === 'cancelled' || data.status === 'expired')) {
        showToast({
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

    dismissToast();
    setActiveGameInvitation(null);
    if (status === 'accepted' && roomId) {
      const event = new CustomEvent('join_game_from_invite', { detail: { roomId } });
      window.dispatchEvent(event);
    }
  };

  const totalPending = pendingFriendRequests + pendingGameInvites + unreadPrivateMessages;

  const removeNotificationFromState = (id: string) => {
    setAppNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.is_read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      return prev.filter((n) => n.id !== id);
    });
  };

  const markNotificationAsRead = useCallback(async (id: string) => {
    if (!user) return;
    setAppNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    const { error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: id,
      p_player_id: user.id
    });
    if (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setAppNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    const { error } = await supabase.rpc('mark_all_notifications_read', {
      p_player_id: user.id
    });
    if (error) {
      console.error('Error marcando notificaciones como leídas:', error);
    }
  }, [user]);

  const deleteReadNotifications = useCallback(async () => {
    if (!user) return;
    setAppNotifications(prev => prev.filter(n => !n.is_read));
    const { error } = await supabase.rpc('delete_read_notifications', {
      p_player_id: user.id
    });
    if (error) {
      console.error('Error borrando notificaciones leídas:', error);
    }
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    removeNotificationFromState(id);
    const { error } = await supabase.rpc('delete_notification', {
      p_notification_id: id,
      p_player_id: user?.id || ''
    });
    if (error) {
      console.error('Error eliminando notificación:', error);
    }
  }, [user]);

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
