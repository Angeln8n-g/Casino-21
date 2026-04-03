// Feature: react-native-game-migration
// Requirements: 10.1
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { authService } from './authService';

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

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export interface GameInvitation {
  id: string;
  sender_id: string;
  sender_username: string;
  room_id: string;
  created_at: string;
}

// Lazy-initialized Supabase client (shares same config as authService)
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

async function getCurrentUserId(): Promise<string> {
  const session = await authService.getSession();
  if (!session?.user?.id) {
    throw new Error('No hay sesión activa');
  }
  return session.user.id;
}

class SocialServiceImpl {
  async getFriends(): Promise<Friend[]> {
    const userId = await getCurrentUserId();
    const db = getClient();

    // friendships table uses player1_id / player2_id
    const { data: friendships, error } = await db
      .from('friendships')
      .select('player1_id, player2_id')
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`);

    if (error) throw new Error(error.message);
    if (!friendships || friendships.length === 0) return [];

    const friendIds = friendships.map((f: any) =>
      f.player1_id === userId ? f.player2_id : f.player1_id
    );

    const { data: profiles, error: profilesError } = await db
      .from('profiles')
      .select('id, username')
      .in('id', friendIds);

    if (profilesError) throw new Error(profilesError.message);

    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      username: p.username ?? '',
      status: 'offline' as 'online' | 'offline', // profiles table has no status column
    }));
  }

  async searchPlayers(query: string): Promise<{ id: string; username: string }[]> {
    if (!query.trim()) return [];
    const db = getClient();

    const { data, error } = await db
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${query.trim()}%`)
      .limit(10);

    if (error) throw new Error(error.message);
    return (data ?? []).map((p: any) => ({ id: p.id, username: p.username ?? '' }));
  }

  async getFriendRequests(): Promise<FriendRequest[]> {
    const userId = await getCurrentUserId();
    const db = getClient();

    const { data, error } = await db
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'pending');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async sendFriendRequest(userId: string): Promise<void> {
    const senderId = await getCurrentUserId();
    const db = getClient();

    const { error } = await db.from('friend_requests').insert({
      sender_id: senderId,
      receiver_id: userId,
      status: 'pending',
    });

    if (error) throw new Error(error.message);
  }

  async acceptFriendRequest(requestId: string): Promise<void> {
    const db = getClient();

    const { error } = await db
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) throw new Error(error.message);
  }

  async rejectFriendRequest(requestId: string): Promise<void> {
    const db = getClient();

    const { error } = await db
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw new Error(error.message);
  }

  async getDirectMessages(friendId: string): Promise<DirectMessage[]> {
    const userId = await getCurrentUserId();
    const db = getClient();

    const { data, error } = await db
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`,
      )
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async sendDirectMessage(friendId: string, content: string): Promise<void> {
    const userId = await getCurrentUserId();
    const db = getClient();

    const { error } = await db.from('direct_messages').insert({
      sender_id: userId,
      receiver_id: friendId,
      content,
    });

    if (error) throw new Error(error.message);
  }

  async getGameInvitations(): Promise<GameInvitation[]> {
    const userId = await getCurrentUserId();
    const db = getClient();

    const { data, error } = await db
      .from('game_invitations')
      .select('id, sender_id, room_id, created_at')
      .eq('receiver_id', userId)
      .eq('status', 'pending');

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: any) => ({
      id: row.id,
      sender_id: row.sender_id,
      sender_username: row.sender_id.slice(0, 8),
      room_id: row.room_id,
      created_at: row.created_at,
    }));
  }

  async acceptGameInvitation(invitationId: string): Promise<void> {
    const db = getClient();

    const { error } = await db
      .from('game_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    if (error) throw new Error(error.message);
  }

  async rejectGameInvitation(invitationId: string): Promise<void> {
    const db = getClient();

    const { error } = await db
      .from('game_invitations')
      .update({ status: 'rejected' })
      .eq('id', invitationId);

    if (error) throw new Error(error.message);
  }
}

export const socialService = new SocialServiceImpl();
