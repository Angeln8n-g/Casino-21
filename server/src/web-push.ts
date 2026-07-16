import webpush from 'web-push';
import { supabase } from './supabase';
import dotenv from 'dotenv';

dotenv.config();

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:soporte@kasino21.com';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn('Faltan claves VAPID en server/.env. Las notificaciones push no funcionarán correctamente.');
} else {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushPayload {
  type: 'game_challenge' | 'challenge_response' | 'tournament_start' | 'tournament_match_invite';
  title: string;
  body: string;
  data: {
    invitationId?: string;
    roomId?: string;
    senderId?: string;
    senderName?: string;
    expiresAt?: string;
    eventId?: string;
    isTournament?: boolean;
  };
}

/**
 * Envía una notificación Push al usuario especificado.
 * Si alguna suscripción ha caducado (errores 404 o 410), se elimina automáticamente de la base de datos.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('Ignorando envío push: Claves VAPID no configuradas.');
    return;
  }

  try {
    // 1. Obtener todas las suscripciones activas del usuario desde Supabase
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', userId);

    if (error) {
      console.error(`Error al obtener suscripciones de push para usuario ${userId}:`, error);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return; // El usuario no tiene dispositivos suscritos
    }

    console.log(`Enviando notificación push a ${subscriptions.length} dispositivo(s) del usuario ${userId}`);

    // 2. Enviar la notificación en paralelo
    const promises = subscriptions.map(async (sub) => {
      try {
        const rawSub = sub.subscription as any;
        await webpush.sendNotification(rawSub, JSON.stringify(payload));
      } catch (err: any) {
        // Si el endpoint ha expirado o ya no es válido, eliminar de la base de datos
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Suscripción de push expirada o inválida (${err.statusCode}). Eliminando de la BD.`);
          const { error: deleteError } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
          if (deleteError) {
            console.error(`Error al eliminar suscripción de push obsoleta:`, deleteError);
          }
        } else {
          console.error(`Error enviando notificación push a suscripción ${sub.id}:`, err);
        }
      }
    });

    await Promise.all(promises);
  } catch (err) {
    console.error(`Error general al enviar push al usuario ${userId}:`, err);
  }
}
