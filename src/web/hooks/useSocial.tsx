import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socket';

export interface Friend {
  id: string;
  username: string;
  status: 'online' | 'offline';
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
}

export interface GameInvitation {
  id: string;
  sender_id: string;
  sender_username: string;
  room_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  timestamp: string;
}

export interface UnreadDm {
  senderId: string;
  senderName: string;
  lastMessage: string;
  count: number;
}

export function useSocial() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [gameInvitations, setGameInvitations] = useState<GameInvitation[]>([]);
  const [unreadDms, setUnreadDms] = useState<UnreadDm[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let socket: any;
    const setup = async () => {
      try {
        socket = await socketService.connect();
        socket.emit('get_friends_list');
        socket.emit('get_pending_requests');
        socket.emit('get_notifications');

        socket.on('friends_list', (data: Friend[]) => setFriends(data));
        socket.on('pending_requests', (data: FriendRequest[]) => setPendingRequests(data));
        socket.on('notifications', (data: Notification[]) => {
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.is_read).length);
        });
        socket.on('notification', (n: Notification) => {
          setNotifications(prev => [n, ...prev]);
          setUnreadCount(c => c + 1);
        });
        socket.on('friend_request_received', () => {
          socket.emit('get_pending_requests');
        });
        socket.on('friends_list_updated', () => {
          socket.emit('get_friends_list');
        });
        socket.on('game_invitation_received', (inv: GameInvitation) => {
          setGameInvitations(prev => [inv, ...prev]);
          setUnreadCount(c => c + 1);
        });

        // DM entrante — incrementar badge y guardar para notificación
        socket.on('dm_message', (msg: ChatMessage) => {
          setUnreadCount(c => c + 1);
          setUnreadDms(prev => {
            const existing = prev.find(d => d.senderId === msg.sender_id);
            if (existing) {
              return prev.map(d => d.senderId === msg.sender_id
                ? { ...d, lastMessage: msg.content, count: d.count + 1 }
                : d
              );
            }
            return [...prev, {
              senderId: msg.sender_id,
              senderName: msg.sender_name || msg.sender_id,
              lastMessage: msg.content,
              count: 1,
            }];
          });
        });
      } catch (e) {
        console.error('useSocial setup error:', e);
      }
    };
    setup();
    return () => {
      if (socket) {
        socket.off('friends_list');
        socket.off('pending_requests');
        socket.off('notifications');
        socket.off('notification');
        socket.off('friend_request_received');
        socket.off('friends_list_updated');
        socket.off('game_invitation_received');
        socket.off('dm_message');
      }
    };
  }, []);

  const sendFriendRequest = useCallback(async (receiverId: string) => {
    const socket = await socketService.connect();
    socket.emit('send_friend_request', { receiverId });
  }, []);

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    const socket = await socketService.connect();
    socket.emit('accept_friend_request', { requestId });
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const rejectFriendRequest = useCallback(async (requestId: string) => {
    const socket = await socketService.connect();
    socket.emit('reject_friend_request', { requestId });
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const removeFriend = useCallback(async (friendId: string) => {
    const socket = await socketService.connect();
    socket.emit('remove_friend', { friendId });
    setFriends(prev => prev.filter(f => f.id !== friendId));
  }, []);

  const sendGameInvitation = useCallback(async (receiverId: string, roomId?: string) => {
    const socket = await socketService.connect();
    socket.emit('send_game_invitation', { receiverId, roomId });
  }, []);

  const acceptGameInvitation = useCallback(async (invitationId: string, roomId: string) => {
    const socket = await socketService.connect();
    socket.emit('accept_game_invitation', { invitationId, roomId });
    setGameInvitations(prev => prev.filter(i => i.id !== invitationId));
    setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  const rejectGameInvitation = useCallback(async (invitationId: string) => {
    const socket = await socketService.connect();
    socket.emit('reject_game_invitation', { invitationId });
    setGameInvitations(prev => prev.filter(i => i.id !== invitationId));
    setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    const socket = await socketService.connect();
    socket.emit('mark_all_notifications_read');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  const clearUnreadDm = useCallback((senderId: string) => {
    setUnreadDms(prev => {
      const dm = prev.find(d => d.senderId === senderId);
      if (dm) setUnreadCount(c => Math.max(0, c - dm.count));
      return prev.filter(d => d.senderId !== senderId);
    });
  }, []);

  const dismissNotification = useCallback(async (notificationId: string) => {
    const socket = await socketService.connect();
    socket.emit('delete_notification', { notificationId });
    setNotifications(prev => {
      const n = prev.find(n => n.id === notificationId);
      if (n && !n.is_read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  return {
    friends, pendingRequests, notifications, gameInvitations, unreadDms, unreadCount,
    sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
    removeFriend, sendGameInvitation, acceptGameInvitation, rejectGameInvitation,
    markAllRead, clearUnreadDm, dismissNotification,
  };
}
