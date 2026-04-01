import { supabase } from '../supabase';
import { Notification } from '../domain/tournament';
import { Server } from 'socket.io';

export class NotificationManager {
  private static readonly RETENTION_HOURS = 24;

  async sendNotification(
    playerId: string,
    type: Notification['type'],
    content: string,
    io?: Server,
    metadata?: Record<string, any>
  ): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        player_id: playerId,
        type,
        content,
        is_read: false,
        created_at: new Date().toISOString(),
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Error al crear notificación: ${error.message}`);

    const notification = data as Notification;

    // Emitir en tiempo real si hay instancia de io
    if (io) {
      io.to(playerId).emit('notification', notification);
    }

    return notification;
  }

  async getNotifications(playerId: string): Promise<Notification[]> {
    const cutoff = new Date(Date.now() - NotificationManager.RETENTION_HOURS * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('player_id', playerId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error al obtener notificaciones: ${error.message}`);
    return (data || []) as Notification[];
  }

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw new Error(`Error al marcar notificación: ${error.message}`);
  }

  async markAllAsRead(playerId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('player_id', playerId)
      .eq('is_read', false);

    if (error) throw new Error(`Error al marcar notificaciones: ${error.message}`);
  }

  async getUnreadCount(playerId: string): Promise<number> {
    const cutoff = new Date(Date.now() - NotificationManager.RETENTION_HOURS * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .eq('is_read', false)
      .gte('created_at', cutoff);

    if (error) throw new Error(`Error al contar notificaciones: ${error.message}`);
    return count || 0;
  }

  async cleanupExpiredNotifications(): Promise<void> {
    const cutoff = new Date(Date.now() - NotificationManager.RETENTION_HOURS * 60 * 60 * 1000).toISOString();

    await supabase
      .from('notifications')
      .delete()
      .lt('created_at', cutoff);
  }
}
