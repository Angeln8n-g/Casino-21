import { supabase } from '../supabase';
import { FriendRequest } from '../domain/tournament';

export class FriendsManager {
  private static readonly MAX_FRIENDS = 100;
  private onlineStatus: Map<string, 'online' | 'offline'> = new Map();

  updateFriendStatus(playerId: string, status: 'online' | 'offline'): void {
    this.onlineStatus.set(playerId, status);
  }

  async searchPlayers(username: string, excludePlayerId?: string): Promise<{ id: string; username: string }[]> {
    let query = supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${username}%`)
      .limit(10) as any;

    if (excludePlayerId) query = query.neq('id', excludePlayerId);

    const { data, error } = await query;
    if (error) throw new Error(`Error al buscar jugadores: ${error.message}`);
    return (data || []) as { id: string; username: string }[];
  }

  async sendFriendRequest(senderId: string, receiverId: string): Promise<{ success: boolean; value?: any; error?: string }> {
    try {
      // Verificar si ya existe amistad
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(player1_id.eq.${senderId},player2_id.eq.${receiverId}),and(player1_id.eq.${receiverId},player2_id.eq.${senderId})`)
        .maybeSingle();

      if (existing) return { success: false, error: 'Ya son amigos' };

      // Verificar límite de amigos
      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`player1_id.eq.${senderId},player2_id.eq.${senderId}`);

      if (count && count >= FriendsManager.MAX_FRIENDS) {
        return { success: false, error: 'Has alcanzado el límite máximo de amigos' };
      }

      // Verificar si ya hay solicitud pendiente
      const { data: existingReq } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', senderId)
        .eq('receiver_id', receiverId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingReq) return { success: false, error: 'Ya enviaste una solicitud a este jugador' };

      const { data, error } = await supabase
        .from('friend_requests')
        .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, value: data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async acceptFriendRequest(requestId: string, receiverId: string): Promise<{ success: boolean; value?: any; error?: string }> {
    try {
      const { data: request, error: reqError } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status')
        .eq('id', requestId)
        .single();

      if (reqError || !request) return { success: false, error: 'Solicitud no encontrada' };
      if (request.receiver_id !== receiverId) return { success: false, error: 'No puedes aceptar esta solicitud' };
      if (request.status !== 'pending') return { success: false, error: 'Esta solicitud ya fue respondida' };

      // Actualizar solicitud
      await supabase
        .from('friend_requests')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', requestId);

      // Crear amistad — sin accepted_at, la tabla no tiene esa columna
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          player1_id: request.sender_id,
          player2_id: request.receiver_id,
          status: 'accepted',
        });

      if (friendshipError) return { success: false, error: friendshipError.message };
      return { success: true, value: { requestId } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async rejectFriendRequest(requestId: string, receiverId: string): Promise<{ success: boolean; value?: any; error?: string }> {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('receiver_id', receiverId);

      if (error) return { success: false, error: error.message };
      return { success: true, value: { requestId } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async getPendingRequests(playerId: string): Promise<FriendRequest[]> {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', playerId)
      .eq('status', 'pending');

    if (error) throw new Error(`Error al obtener solicitudes: ${error.message}`);
    return (data || []) as FriendRequest[];
  }

  async getFriendsList(playerId: string): Promise<{ id: string; username: string; status: string }[]> {
    // Obtener amistades
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('player1_id, player2_id')
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`);

    if (error) throw new Error(`Error al obtener amigos: ${error.message}`);
    if (!friendships || friendships.length === 0) return [];

    // Extraer IDs de amigos
    const friendIds = friendships.map((f: any) =>
      f.player1_id === playerId ? f.player2_id : f.player1_id
    );

    // Obtener perfiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', friendIds);

    if (profilesError) throw new Error(`Error al obtener perfiles: ${profilesError.message}`);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));

    return friendIds.map(id => ({
      id,
      username: profileMap.get(id) || 'Unknown',
      status: this.onlineStatus.get(id) || 'offline',
    }));
  }

  async getFriends(playerId: string): Promise<{ id: string; username: string; status: string }[]> {
    return this.getFriendsList(playerId);
  }

  async getFriendCount(playerId: string): Promise<number> {
    const { count } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`);
    return count || 0;
  }

  async removeFriend(playerId: string, friendId: string): Promise<{ success: boolean; value?: any; error?: string }> {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(player1_id.eq.${playerId},player2_id.eq.${friendId}),and(player1_id.eq.${friendId},player2_id.eq.${playerId})`);

      if (error) return { success: false, error: error.message };
      return { success: true, value: { friendId } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async sendGameInvitation(
    senderId: string,
    receiverId: string,
    tournamentId?: string,
    roomId?: string
  ): Promise<{ success: boolean; value?: any; error?: string }> {
    try {
      const [{ data, error }, { data: senderProfile }] = await Promise.all([
        supabase
          .from('game_invitations')
          .insert({
            sender_id: senderId,
            receiver_id: receiverId,
            room_id: roomId || null,
            status: 'pending',
          })
          .select()
          .single(),
        supabase.from('profiles').select('username').eq('id', senderId).single(),
      ]);

      if (error) return { success: false, error: error.message };
      return { success: true, value: { ...data, sender_username: senderProfile?.username || senderId } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async acceptGameInvitation(invitationId: string, receiverId: string): Promise<{ success: boolean; value?: any; error?: string }> {
    try {
      const { data: invitation, error: invError } = await supabase
        .from('game_invitations')
        .select('id, sender_id, receiver_id, room_id, status')
        .eq('id', invitationId)
        .single();

      if (invError || !invitation) return { success: false, error: 'Invitación no encontrada' };
      if (invitation.receiver_id !== receiverId) return { success: false, error: 'No puedes aceptar esta invitación' };
      if (invitation.status !== 'pending') return { success: false, error: 'Esta invitación ya fue respondida' };

      await supabase
        .from('game_invitations')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', invitationId);

      return { success: true, value: invitation };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async rejectGameInvitation(invitationId: string, receiverId: string): Promise<{ success: boolean; value?: any; error?: string }> {
    try {
      const { error } = await supabase
        .from('game_invitations')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', invitationId)
        .eq('receiver_id', receiverId);

      if (error) return { success: false, error: error.message };
      return { success: true, value: { invitationId } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async getUsername(userId: string): Promise<string | null> {
    const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
    return data?.username || null;
  }
}
