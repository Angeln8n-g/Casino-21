// Feature: react-native-game-migration
// Requirements: 10.1
import { useState, useEffect, useCallback } from 'react';
import { socialService } from '../services/socialService';
import type { Friend, FriendRequest, GameInvitation, DirectMessage } from '../services/socialService';

export type { Friend, FriendRequest, GameInvitation, DirectMessage };

interface UseSocialReturn {
  friends: Friend[];
  friendRequests: FriendRequest[];
  gameInvitations: GameInvitation[];
  loading: boolean;
  error: string | null;
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
  }, []);

  const sendFriendRequest = useCallback(async (userId: string) => {
    await socialService.sendFriendRequest(userId);
  }, []);

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    await socialService.acceptFriendRequest(requestId);
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
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
