import { supabase } from '../supabase';
import { ChatMessage } from '../domain/tournament';

export class ChatManager {
  private static readonly MAX_MESSAGE_LENGTH = 200;
  private static readonly MIN_MESSAGE_LENGTH = 1;
  private static readonly MESSAGE_HISTORY_LIMIT = 50;
  private static readonly RATE_LIMIT_WINDOW_MS = 30000; // 30 segundos
  private static readonly RATE_LIMIT_MAX_MESSAGES = 10;

  async sendMessage(
    roomId: string,
    senderId: string,
    senderName: string,
    content: string
  ): Promise<{ success: boolean; value?: ChatMessage; error?: string }> {
    try {
      if (
        content.length < ChatManager.MIN_MESSAGE_LENGTH ||
        content.length > ChatManager.MAX_MESSAGE_LENGTH
      ) {
        return { success: false, error: 'MESSAGE_LENGTH_INVALID' };
      }

      const rateLimited = await this.checkRateLimit(senderId);
      if (rateLimited) {
        return { success: false, error: 'RATE_LIMIT_EXCEEDED' };
      }

      const filteredContent = this.filterProfanity(content);

      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: senderId,
          content: filteredContent,
          reported: false,
          moderation_status: 'pending',
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      await this.updateRateLimit(senderId);
      return { success: true, value: message as ChatMessage };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async getMessageHistory(roomId: string, limit?: number): Promise<ChatMessage[]> {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('timestamp', { ascending: false })
      .limit(limit || ChatManager.MESSAGE_HISTORY_LIMIT);

    if (error) throw new Error(`Error al obtener historial: ${error.message}`);
    return (messages as ChatMessage[]).reverse();
  }

  async reportMessage(messageId: string, reporterId: string, reason: string): Promise<{ success: boolean; value?: any; error?: string }> {
    try {
      const { error } = await supabase.from('player_reports').insert({
        reporter_id: reporterId,
        reported_id: messageId,
        reason: reason,
        evidence: messageId,
        status: 'pending',
      });

      if (error) return { success: false, error: error.message };

      await supabase
        .from('chat_messages')
        .update({ reported: true, moderation_status: 'pending' })
        .eq('id', messageId);

      return { success: true, value: { messageId } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async checkRateLimit(playerId: string): Promise<boolean> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - ChatManager.RATE_LIMIT_WINDOW_MS);

    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('sender_id', playerId)
      .gte('timestamp', windowStart.toISOString());

    return (recentMessages?.length || 0) >= ChatManager.RATE_LIMIT_MAX_MESSAGES;
  }

  private async updateRateLimit(playerId: string): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - ChatManager.RATE_LIMIT_WINDOW_MS);

    // Verificar si ya existe un registro para esta ventana
    const { data: existingRecord } = await supabase
      .from('rate_limits')
      .select('id, count')
      .eq('player_id', playerId)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (existingRecord) {
      await supabase
        .from('rate_limits')
        .update({ count: existingRecord.count + 1 })
        .eq('id', existingRecord.id);
    } else {
      await supabase.from('rate_limits').insert({
        player_id: playerId,
        action_type: 'chat_message',
        count: 1,
        window_start: now.toISOString(),
      });
    }
  }

  filterContent(text: string): string {
    return this.filterProfanity(text);
  }

  private filterProfanity(text: string): string {
    // Lista básica de palabras ofensivas (en producción usaría un diccionario más completo)
    const profanityList = ['badword1', 'badword2']; // Placeholder

    let filtered = text;
    for (const word of profanityList) {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    }

    return filtered;
  }
}
