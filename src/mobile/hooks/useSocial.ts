// Feature: react-native-game-migration
// Requirements: 10.1
import { useState, useEffect, useCallback } from 'react';
import { socialService } from '../services/socialService';
import { socketService } from '../services/socketService';
import type { Friend, FriendRequest, GameInvitation, DirectMessage } from '../services/socialService';

export type { Friend, FriendRequest, GameInvitation, DirectMessage };

interface UseSocialReturn {
  friends: Friend[];
  friendRequests: FriendRequest[];
  gameInvitations: GameInvitation[];
  loading: boolean;
  error: string | null;
  refresh(): void;
  sendFriendRequest(userId: string): Promise<void>;
  acceptFriendRequest(requestId: string): Promise<void>;
  rejectFriendRequest(requestId: string): Promise<void>;
  getDirectMessages(friendId: string): Promise<DirectMessage[]>;
  sendDirectMessage(friendId: string, content: string): Promise<void>;
  acceptGameInvitation(invitationId: string): Promise<void>;
  rejectGameInvitation(invitationId: string): Promise<void>;
  searchPlayers(query: string): Promise<{ id: string; username: string }[]>;
}

export function useSocial(): UseSocialReturn {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [gameInvitations, setGameInvitations] = useState<GameInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [friendsData, requestsData, invitationsData] = await Promise.all([
          socialService.getFriends(),
          socialService.getFriendRequests(),
          socialService.getGameInvitations(),
        ]);
        if (!cancelled) {
          setFriends(friendsData);
          setFriendRequests(requestsData);
          setGameInvitations(invitationsData);

          // Request online status from the socket server after the friends list is loaded
          if (friendsData.length > 0) {
            try {
              const friendIds = friendsData.map((f) => f.id);
              socketService.emit('get_online_friends', { friendIds });
            } catch {
              // Socket not connected — presence will remain offline until connected
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar datos sociales');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  // ── Real-time presence updates from socket ──────────────────────────────────
  useEffect(() => {
    /**
     * Server should emit 'online_friends' with { onlineIds: string[] }
     * when a friend connects or disconnects, or in response to 'get_online_friends'.
     */
    const handleOnlineFriends = (data: unknown) => {
      const payload = data as { onlineIds?: string[] };
      const onlineIds = new Set(payload?.onlineIds ?? []);
      setFriends((prev) =>
        prev.map((f) => ({
          ...f,
          status: onlineIds.has(f.id) ? 'online' : 'offline',
        }))
      );
    };

    /**
     * Server emits 'friend_online' / 'friend_offline' for individual status changes.
     */
    const handleFriendOnline = (data: unknown) => {
      const { userId } = data as { userId: string };
      setFriends((prev) =>
        prev.map((f) => (f.id === userId ? { ...f, status: 'online' } : f))
      );
    };

    const handleFriendOffline = (data: unknown) => {
      const { userId } = data as { userId: string };
      setFriends((prev) =>
        prev.map((f) => (f.id === userId ? { ...f, status: 'offline' } : f))
      );
    };

    try {
      socketService.on('online_friends', handleOnlineFriends);
      socketService.on('friend_online', handleFriendOnline);
      socketService.on('friend_offline', handleFriendOffline);
    } catch { /* socket not connected */ }

    return () => {
      try {
        socketService.off('online_friends');
        socketService.off('friend_online');
        socketService.off('friend_offline');
      } catch { /* ignore */ }
    };
  }, []);

  const sendFriendRequest = useCallback(async (userId: string) => {
    await socialService.sendFriendRequest(userId);
  }, []);

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    await socialService.acceptFriendRequest(requestId);
    // Remove from pending list immediately
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    // Reload friends list so the new friend appears
    setRefreshTick((t) => t + 1);
  }, []);

  const rejectFriendRequest = useCallback(async (requestId: string) => {
    await socialService.rejectFriendRequest(requestId);
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const getDirectMessages = useCallback(async (friendId: string): Promise<DirectMessage[]> => {
    return socialService.getDirectMessages(friendId);
  }, []);

  const sendDirectMessage = useCallback(async (friendId: string, content: string) => {
    await socialService.sendDirectMessage(friendId, content);
  }, []);

  const acceptGameInvitation = useCallback(async (invitationId: string) => {
    await socialService.acceptGameInvitation(invitationId);
    setGameInvitations((prev) => prev.filter((i) => i.id !== invitationId));
  }, []);

  const rejectGameInvitation = useCallback(async (invitationId: string) => {
    await socialService.rejectGameInvitation(invitationId);
    setGameInvitations((prev) => prev.filter((i) => i.id !== invitationId));
  }, []);

  const searchPlayers = useCallback(async (query: string) => {
    return socialService.searchPlayers(query);
  }, []);

  return {
    friends,
    friendRequests,
    gameInvitations,
    loading,
    error,
    refresh,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getDirectMessages,
    sendDirectMessage,
    acceptGameInvitation,
    rejectGameInvitation,
    searchPlayers,
  };
}
