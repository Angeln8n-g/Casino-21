import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

cleanupOutdatedCaches();

// Precargar recursos generados por Vite en la compilación
precacheAndRoute(self.__WB_MANIFEST || []);

// Reglas de caching en tiempo de ejecución (equivalentes a las originales)
registerRoute(
  ({ request, url }) => url.origin === self.location.origin && (request.destination === 'image' || request.destination === 'style' || request.destination === 'script' || request.destination === 'font'),
  new CacheFirst({
    cacheName: 'static-assets-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
      }),
    ],
  })
);

registerRoute(
  /^https:\/\/yarmgboyjjnodjszwiqi\.supabase\.co\/rest\/.*/i,
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60, // 1 hora
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Determinar la URL del servidor backend (localhost:4000 en desarrollo local, origin propio en producción)
const getBackendUrl = (): string => {
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }
  return self.location.origin;
};

// ── Evento Push: Mostrar Notificación ──────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    if (data.type === 'game_challenge') {
      const challengeData = data.data;
      const options: NotificationOptions = {
        body: data.body || '¡Te han invitado a jugar!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: `challenge-${challengeData.invitationId}`,
        renotify: true,
        requireInteraction: true, // Queda fija hasta que el usuario interactúe
        vibrate: [200, 100, 200],
        data: challengeData,
        actions: [
          { action: 'accept', title: '✅ Jugar' },
          { action: 'reject', title: '❌ Rechazar' },
          { action: 'chat', title: '💬 Chat' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Desafío KASINO21', options)
      );
    } else if (data.type === 'challenge_response') {
      const responseData = data.data;
      const options: NotificationOptions = {
        body: data.body || 'Sucedió un cambio en tu desafío',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: `response-${responseData.invitationId}`,
        vibrate: [100, 50, 100],
        data: responseData
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Respuesta a Desafío', options)
      );
    } else if (data.type === 'tournament_start') {
      const tournamentData = data.data;
      const options: NotificationOptions = {
        body: data.body || '¡Un torneo ha comenzado!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: `tournament-start-${tournamentData.eventId || Date.now()}`,
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        data: { ...tournamentData, pushType: 'tournament_start' },
        actions: [
          { action: 'open_tournament', title: '🏆 Ver Torneo' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || '🏆 ¡Torneo Iniciado!', options)
      );
    } else if (data.type === 'tournament_match_invite') {
      const matchData = data.data;
      const options: NotificationOptions = {
        body: data.body || '¡Tu rival te espera en el torneo!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: `tournament-match-${matchData.roomId || Date.now()}`,
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: { ...matchData, pushType: 'tournament_match_invite' },
        actions: [
          { action: 'join_match', title: '⚔️ Jugar' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || '⚔️ ¡Partida de Torneo!', options)
      );
    }
  } catch (err) {
    console.error('Error al procesar evento push:', err);
  }
});

// ── Evento Click en Notificación: Rutas y Acciones ────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data;
  if (!notifData) return;

  const pushType = notifData.pushType;

  // ── Notificaciones de Torneo ──
  if (pushType === 'tournament_start') {
    // Abrir la app en la pestaña de eventos
    const url = '/?openTab=events';
    const fullUrl = new URL(url, self.location.origin).href;

    const clickPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.navigate(fullUrl).then((c) => c?.focus());
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    });

    event.waitUntil(clickPromise);
    return;
  }

  if (pushType === 'tournament_match_invite' || event.action === 'join_match') {
    const { roomId } = notifData;
    const url = `/?joinInviteRoomId=${roomId}&isTournament=true`;
    const fullUrl = new URL(url, self.location.origin).href;

    const clickPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.navigate(fullUrl).then((c) => c?.focus());
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    });

    event.waitUntil(clickPromise);
    return;
  }

  // ── Notificaciones de Desafío (existentes) ──
  const { roomId, invitationId, senderId } = notifData;

  // Determinar la URL destino
  let url = '/';
  if (event.action === 'accept') {
    url = `/?joinInviteRoomId=${roomId}&invitationId=${invitationId}`;
  } else if (event.action === 'chat') {
    url = `/?openChatWith=${senderId}`;
  } else if (event.action === 'reject') {
    // Para rechazar, enviamos una petición HTTP silenciosa al backend (sin abrir la pestaña)
    const rejectPromise = fetch(`${getBackendUrl()}/api/challenge/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invitationId,
        action: 'rejected'
      })
    }).then(res => {
      if (!res.ok) {
        console.error('Error al rechazar desafío via REST desde SW:', res.statusText);
      }
    }).catch(err => {
      console.error('Error de red al rechazar desafío desde SW:', err);
    });

    event.waitUntil(rejectPromise);
    return; // No abrimos ninguna ventana en este caso
  } else {
    // Click en la notificación propiamente (cuerpo)
    url = `/?joinInviteRoomId=${roomId}&invitationId=${invitationId}`;
  }

  // Redirigir o enfocar pestaña existente
  const fullUrl = new URL(url, self.location.origin).href;

  const clickPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    // Si hay una ventana abierta de Kasino21, navegar en ella y enfocarla
    for (const client of clientList) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        return client.navigate(fullUrl).then((c) => c?.focus());
      }
    }
    // Si no hay ventana abierta, abrir una nueva
    if (self.clients.openWindow) {
      return self.clients.openWindow(fullUrl);
    }
  });

  event.waitUntil(clickPromise);
});
