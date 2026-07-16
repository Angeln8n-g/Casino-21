import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const supported = 'serviceWorker' in navigator && 'PushManager' in window;
        setIsSupported(supported);

        if (supported) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          if (subscription) {
            // Verificar si esta suscripción está guardada en nuestra base de datos
            const { data, error } = await supabase
              .from('push_subscriptions')
              .select('id')
              .eq('user_id', user.id)
              .eq('subscription->endpoint', subscription.endpoint)
              .maybeSingle();

            if (error) {
              console.error('Error verificando suscripción push en la BD:', error);
            }
            
            // Si está en el navegador pero no en la BD, la re-sincronizamos
            if (subscription && !data) {
              await supabase.from('push_subscriptions').insert({
                user_id: user.id,
                subscription: subscription.toJSON()
              });
            }

            setIsSubscribed(!!subscription);
          } else {
            setIsSubscribed(false);
          }
        }
      } catch (err) {
        console.error('Error al comprobar soporte o suscripción de push:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  const subscribeToPush = async (): Promise<boolean> => {
    if (!user || !isSupported) return false;
    setIsLoading(true);

    try {
      // 1. Solicitar permisos de notificación
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permiso de notificaciones denegado');
      }

      // 2. Obtener clave pública VAPID desde variables de entorno
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VITE_VAPID_PUBLIC_KEY no está configurada en el frontend');
      }

      const registration = await navigator.serviceWorker.ready;
      
      // 3. Suscribirse en el PushManager del navegador
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // 4. Guardar la suscripción en Supabase
      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: user.id,
        subscription: subscription.toJSON()
      });

      if (error) {
        // Si ya existía por la restricción única, no hay problema
        if (!error.message.includes('unique_user_endpoint')) {
          throw error;
        }
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Error al suscribirse a notificaciones push:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async (): Promise<boolean> => {
    if (!user || !isSupported) return false;
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // 1. Dar de baja en el PushManager del navegador
        await subscription.unsubscribe();

        // 2. Eliminar de Supabase usando el endpoint de la suscripción
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('subscription->endpoint', subscription.endpoint);

        if (error) throw error;
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Error al dar de baja notificaciones push:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush
  };
}
