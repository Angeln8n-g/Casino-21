import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { useGame } from './useGame';
import { useAudio } from './useAudio';
import { socketService } from '../services/socket';
import { appEvents } from '../utils/events';
import { triggerHaptic } from '../utils/haptics';
import { resolveAvatarUrl } from '../components/social/socialUtils';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
  iconEmoji?: string;
  avatarUrl?: string | null;
  avatarFallback?: string;
  onPress?: () => void;
  friendRequestData?: {
    id: string;
    senderId: string;
    username: string;
  };
  actions?: ToastAction[];
}

export interface AppNotification {
  id: string;
  type: string;
  content: string;
  created_at: string;
  is_read: boolean;
  metadata?: Record<string, any>;
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

interface NotificationsContextType {
  pendingFriendRequests: number;
  pendingGameInvites: number;
  unreadPrivateMessages: number;
  totalPending: number;
  toast: ToastNotification | null;
  showToast: (notif: Omit<ToastNotification, 'id'>) => void;
  dismissToast: () => void;
  handleFriendRequest: (id: string, status: 'accepted' | 'rejected') => Promise<void>;
  activeGameInvitation: GameInviteToastData | null;
  setActiveGameInvitation: React.Dispatch<React.SetStateAction<GameInviteToastData | null>>;
  handleGameInvite: (invitationId: string, status: 'accepted' | 'rejected', roomId?: string) => Promise<void>;
  appNotifications: AppNotification[];
  unreadCount: number;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteReadNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  showNotificationsModal: boolean;
  setShowNotificationsModal: React.Dispatch<React.SetStateAction<boolean>>;
  setActivePrivateChat: (source: 'social' | 'modal', friendId: string | null) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

function useNotificationsInternal(): NotificationsContextType {
  const { user, profile } = useAuth();
  const { gameState } = useGame();
  const { playSfx } = useAudio();
  const gameStateRef = useRef(gameState);
  const seenGameInviteIdsRef = useRef<Set<string>>(new Set());
  const seenPrivateMsgIdsRef = useRef<Set<string>>(new Set());
  const friendIdsRef = useRef<Set<string>>(new Set());
  const activeSocialChatFriendIdRef = useRef<string | null>(null);
  const activeModalChatFriendIdRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoggedNotifsRef = useRef(false);

  const setActivePrivateChat = useCallback((source: 'social' | 'modal', friendId: string | null) => {
    if (source === 'social') {
      activeSocialChatFriendIdRef.current = friendId;
    } else {
      activeModalChatFriendIdRef.current = friendId;
    }
  }, []);

  const isPrivateChatOpenWith = useCallback((senderId: string) => {
    const appIsActive = AppState.currentState ? AppState.currentState === 'active' : true;
    if (!appIsActive) return false;
    return (
      activeSocialChatFriendIdRef.current === senderId ||
      activeModalChatFriendIdRef.current === senderId
    );
  }, []);

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
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (notif: Omit<ToastNotification, 'id'>) => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      const id = Math.random().toString(36).substring(2, 9);
      setToast({ ...notif, id });
      triggerHaptic('light');
      playSfx('notification');
      toastTimerRef.current = setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, 6500);
    },
    [playSfx]
  );

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const buildAndShowGameInvite = async (inviteRow: any) => {
      if (!inviteRow?.id || !inviteRow?.sender_id || !inviteRow?.room_id) return;
      if (seenGameInviteIdsRef.current.has(inviteRow.id)) return;
      if (
        gameStateRef.current &&
        (gameStateRef.current.phase as any) !== 'completed' &&
        (gameStateRef.current.phase as any) !== 'setup'
      ) {
        return;
      }

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

        const { count: pmUnreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);

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
        setUnreadPrivateMessages(pmUnreadCount || 0);

        if (notifs) {
          if (!hasLoggedNotifsRef.current) {
            hasLoggedNotifsRef.current = true;
            console.log('Notifications from API:', notifs);
          }
          setAppNotifications(notifs as AppNotification[]);
          setUnreadCount(notifs.filter((n) => !n.is_read).length);
        }

        if (latestPendingInvite && latestPendingInvite.room_id) {
          await buildAndShowGameInvite(latestPendingInvite);
        }

        await refreshFriendIds();
      } catch (error: any) {
        if (!isMounted) return;
        console.warn('Error fetching notification counts:', error);
      }
    };

    fetchCounts();
    const pollingId = setInterval(fetchCounts, 10000);

    // 1. Suscripción a notificaciones de la app
    const notifChannel = supabase
      .channel(`mobile_notifs_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `player_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setAppNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
          setUnreadCount((prev) => prev + 1);

          // Mostrar toast en tiempo real si es aviso del sistema o social (las invitaciones ya abren el modal)
          if (newNotif.type !== 'game_invitation' && newNotif.type !== 'friend_request') {
            showToast({
              title: '🔔 Nuevo Aviso',
              message: newNotif.content,
              type: 'info',
            });
          }
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
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `player_id=eq.${user.id}` },
        (payload) => {
          setAppNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
        }
      )
      .subscribe();

    // 2. Suscripción a friend_requests con Toast interactivo
    const friendChannel = supabase
      .channel(`mobile_friend_reqs_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          setPendingFriendRequests((prev) => prev + 1);
          const { data: sender } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', payload.new.sender_id)
            .single();

          if (sender && isMounted) {
            showToast({
              title: '🤝 Solicitud de Amistad',
              message: `${sender.username} quiere ser tu amigo`,
              type: 'info',
              friendRequestData: {
                id: payload.new.id,
                senderId: payload.new.sender_id,
                username: sender.username,
              },
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.status !== 'pending') {
            setPendingFriendRequests((prev) => Math.max(0, prev - 1));
          }
          if (payload.new.status === 'accepted') {
            refreshFriendIds();
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

    // 3b. Suscripción a messages para actualizar badge global de Social
    const refreshPmUnreadCount = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      if (isMounted) setUnreadPrivateMessages(count || 0);
    };

    const pmChannel = supabase
      .channel(`mobile_pm_badge_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          const newMsg = payload.new as any;
          if (!newMsg?.sender_id || newMsg.sender_id === user.id || newMsg.deleted_at) {
            return;
          }

          // Emitir inmediatamente al bus de eventos para que ChatView lo pinte de forma inmediata (0ms)
          appEvents.emit('realtime_chat_message', newMsg);

          const senderId = String(newMsg.sender_id);
          const isViewingThisChat = isPrivateChatOpenWith(senderId);

          // Si el usuario ya está viendo activamente este chat, no alterar el contador de no leídos ni mostrar toast
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
                  .select('id, username, avatar_url, equipped_avatar, elo, level')
                  .eq('id', senderId)
                  .maybeSingle(),
              ]);

              if (!isMounted || !isFriend || isPrivateChatOpenWith(senderId)) {
                return;
              }

              const sender = profileRes.data;
              const senderName = sender?.username || 'Tu amigo';
              const preview = formatPrivateMessagePreview(newMsg);
              const avatarUri = resolveAvatarUrl(
                sender?.equipped_avatar || sender?.avatar_url
              );

              const openChat = () => {
                appEvents.emit('open_private_chat', {
                  friend: {
                    id: senderId,
                    username: senderName,
                    avatar_url: sender?.avatar_url ?? null,
                    equipped_avatar: sender?.equipped_avatar ?? null,
                    elo: sender?.elo ?? 1000,
                    level: sender?.level ?? 1,
                    isOnline: true,
                  },
                });
                dismissToast();
              };

              showToast({
                title: `💬 Mensaje de ${senderName}`,
                message: preview,
                type: 'info',
                iconEmoji: '💬',
                avatarUrl: avatarUri,
                avatarFallback: senderName.charAt(0).toUpperCase() || 'A',
                onPress: openChat,
                actions: [
                  {
                    label: '💬 Responder',
                    variant: 'primary',
                    onClick: openChat,
                  },
                ],
              });
            } catch {}
          })();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => {
          refreshPmUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => {
          refreshPmUnreadCount();
        }
      )
      .subscribe();

    const handleMessagesRead = () => {
      refreshPmUnreadCount();
    };
    appEvents.on('private_messages_read', handleMessagesRead);

    return () => {
      isMounted = false;
      clearInterval(pollingId);
      appEvents.off('private_messages_read', handleMessagesRead);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(friendChannel);
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(pmChannel);
    };
  }, [user, showToast, dismissToast, isPrivateChatOpenWith]);

  // 4. Suscripción a eventos de presencia de amigos por Socket.io (idéntico a Web)
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    let attachedSocket: any = null;

    const handleOnlineFriendsSummary = (payload: {
      count?: number;
      friends: Array<{ id: string; username: string; status?: 'online' | 'in_match'; roomId?: string }>;
    }) => {
      if (!isMounted || !payload || !Array.isArray(payload.friends) || payload.friends.length === 0) return;

      const matchFriend = payload.friends.find((f) => f.status === 'in_match');
      if (matchFriend) {
        showToast({
          title: '🎮 Amigo en Partida',
          message: `Tu amigo ${matchFriend.username} está jugando una partida.`,
          type: 'info',
          actions: [
            {
              label: '⏳ Decirle que lo espero',
              variant: 'primary',
              onClick: () => {
                socketService.notifyFriendWaiting(matchFriend.id);
                dismissToast();
              },
            },
            {
              label: 'Abrir Social',
              variant: 'secondary',
              onClick: () => {
                appEvents.emit('open_social_tab', { tab: 'friends' });
                dismissToast();
              },
            },
          ],
        });
        return;
      }

      if (payload.friends.length === 1) {
        const friend = payload.friends[0];
        showToast({
          title: '⚡ Amigo en Línea',
          message: `Tu amigo ${friend.username} está activo en el juego.`,
          type: 'info',
          actions: [
            {
              label: '👋 Notificar que entré',
              variant: 'primary',
              onClick: () => {
                socketService.notifyFriendConnected(friend.id);
                dismissToast();
              },
            },
            {
              label: 'Abrir Social',
              variant: 'secondary',
              onClick: () => {
                appEvents.emit('open_social_tab', { tab: 'friends' });
                dismissToast();
              },
            },
          ],
        });
        return;
      }

      const previewNames = payload.friends.slice(0, 2).map((f) => f.username).join(', ');
      const extraCount = Math.max(0, payload.friends.length - 2);
      const message =
        extraCount > 0
          ? `${previewNames} y ${extraCount} más están conectados.`
          : `${previewNames} están conectados.`;

      showToast({
        title: `🟢 ${payload.friends.length} amigos en línea`,
        message,
        type: 'info',
        actions: [
          {
            label: 'Ver amigos',
            variant: 'primary',
            onClick: () => {
              appEvents.emit('open_social_tab', { tab: 'friends' });
              dismissToast();
            },
          },
        ],
      });
    };

    const handleFriendJustConnected = (payload: { senderId?: string; senderName?: string; friendId?: string; username?: string }) => {
      const senderId = payload?.senderId || payload?.friendId;
      if (!isMounted) return;
      const friendName = payload?.senderName || payload?.username || 'Tu amigo';
      showToast({
        title: '👋 ¡Amigo Conectado!',
        message: `¡${friendName} se acaba de conectar al juego!`,
        type: 'info',
        actions: senderId
          ? [
              {
                label: '⏳ Avisar que lo esperas',
                variant: 'primary',
                onClick: () => {
                  socketService.notifyFriendWaiting(senderId);
                  dismissToast();
                },
              },
              {
                label: 'Ver en Social',
                variant: 'secondary',
                onClick: () => {
                  appEvents.emit('open_social_tab', { tab: 'friends' });
                  dismissToast();
                },
              },
            ]
          : undefined,
      });
    };

    const handleFriendWaitingForYou = (payload: { senderId?: string; senderName?: string; fromUserId?: string; fromUsername?: string }) => {
      if (!isMounted) return;
      const fromName = payload?.senderName || payload?.fromUsername || 'Un amigo';
      showToast({
        title: '⏳ ¡Te están esperando!',
        message: `¡${fromName} se ha conectado y te está esperando para jugar!`,
        type: 'warning',
        actions: [
          {
            label: 'Ir a Social',
            variant: 'primary',
            onClick: () => {
              appEvents.emit('open_social_tab', { tab: 'friends' });
              dismissToast();
            },
          },
        ],
      });
    };

    const handleFriendConnectedSent = (payload: { targetId?: string; targetName?: string; friendId?: string }) => {
      if (!isMounted) return;
      const targetName = payload?.targetName || 'tu amigo';
      showToast({
        title: '✅ Notificación Enviada',
        message: `Le avisamos a ${targetName} que estás en el juego.`,
        type: 'success',
      });
    };

    const handleFriendWaitingSent = (payload: { targetId?: string; targetName?: string; friendId?: string }) => {
      if (!isMounted) return;
      const targetName = payload?.targetName || 'tu amigo';
      showToast({
        title: '📣 Aviso Enviado',
        message: `Le avisamos a ${targetName} que lo estás esperando para jugar.`,
        type: 'success',
      });
    };

    socketService
      .connect()
      .then((socket) => {
        if (!isMounted) return;
        attachedSocket = socket;
        socket.on('online_friends_summary', handleOnlineFriendsSummary);
        socket.on('friend_just_connected', handleFriendJustConnected);
        socket.on('friend_waiting_for_you', handleFriendWaitingForYou);
        socket.on('friend_connected_sent', handleFriendConnectedSent);
        socket.on('friend_waiting_sent', handleFriendWaitingSent);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (attachedSocket) {
        attachedSocket.off('online_friends_summary', handleOnlineFriendsSummary);
        attachedSocket.off('friend_just_connected', handleFriendJustConnected);
        attachedSocket.off('friend_waiting_for_you', handleFriendWaitingForYou);
        attachedSocket.off('friend_connected_sent', handleFriendConnectedSent);
        attachedSocket.off('friend_waiting_sent', handleFriendWaitingSent);
      }
    };
  }, [user, showToast]);

  const handleFriendRequest = useCallback(
    async (id: string, status: 'accepted' | 'rejected') => {
      if (!user) return;
      try {
        const { data: result, error: rpcError } = await supabase.rpc('respond_friend_request', {
          p_request_id: id,
          p_user_id: user.id,
          p_action: status,
        });

        if (rpcError) {
          showToast({
            title: '⚠️ Aviso',
            message: rpcError.message || 'No se pudo procesar la solicitud.',
            type: 'warning',
          });
          return;
        } else if (
          typeof result === 'object' &&
          result !== null &&
          result.success === false &&
          result.status !== 'already_friends'
        ) {
          showToast({
            title: '⚠️ Aviso',
            message: result.message || 'No se pudo procesar la solicitud.',
            type: 'warning',
          });
          setToast(null);
          return;
        }

        setPendingFriendRequests((prev) => Math.max(0, prev - 1));
        setToast(null);
        showToast({
          title: status === 'accepted' ? '🤝 ¡Nuevo Amigo!' : 'Solicitud rechazada',
          message:
            status === 'accepted'
              ? 'Solicitud aceptada. Ahora pueden jugar y chatear.'
              : 'Has rechazado la solicitud de amistad.',
          type: status === 'accepted' ? 'success' : 'info',
        });
      } catch (err) {
        console.warn('Error respondiendo solicitud de amistad:', err);
      }
    },
    [user, showToast]
  );

  const handleGameInvite = useCallback(
    async (invitationId: string, status: 'accepted' | 'rejected', roomId?: string) => {
      if (!user) return;

      try {
        if (status === 'accepted') {
          const { data: invCheck } = await supabase
            .from('game_invitations')
            .select('status')
            .eq('id', invitationId)
            .single();

          if (invCheck && (invCheck.status === 'cancelled' || invCheck.status === 'expired')) {
            setActiveGameInvitation(null);
            showToast({
              title: '⚠️ Invitación Cancelada',
              message: 'El jugador que te invitó ya canceló la sala de espera.',
              type: 'warning',
            });
            return;
          }
        }

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
    },
    [user, profile?.username, showToast]
  );

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

  const deleteReadNotifications = useCallback(async () => {
    if (!user) return;
    setAppNotifications((prev) => prev.filter((n) => !n.is_read));
    try {
      await supabase.rpc('delete_read_notifications', {
        p_player_id: user.id,
      });
    } catch (error) {
      console.warn('Error eliminando notificaciones leídas:', error);
    }
  }, [user]);

  const deleteNotification = useCallback(
    async (id: string) => {
      if (!user) return;
      setAppNotifications((prev) => {
        const target = prev.find((n) => n.id === id);
        if (target && !target.is_read) {
          setUnreadCount((u) => Math.max(0, u - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
      try {
        await supabase.rpc('delete_notification', {
          p_notification_id: id,
          p_player_id: user.id,
        });
      } catch (error) {
        console.warn('Error eliminando notificación:', error);
      }
    },
    [user]
  );

  return {
    pendingFriendRequests,
    pendingGameInvites,
    unreadPrivateMessages,
    totalPending: pendingFriendRequests + pendingGameInvites + unreadPrivateMessages,
    toast,
    showToast,
    dismissToast,
    handleFriendRequest,
    activeGameInvitation,
    setActiveGameInvitation,
    handleGameInvite,
    appNotifications,
    unreadCount,
    markNotificationAsRead,
    markAllAsRead,
    deleteReadNotifications,
    deleteNotification,
    showNotificationsModal,
    setShowNotificationsModal,
    setActivePrivateChat,
  };
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const value = useNotificationsInternal();
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextType {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return ctx;
}
