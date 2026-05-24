# Plan: Mejoras al Sistema de Notificaciones

## Diagnóstico

### Problemas identificados

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **Frontend escribe directo en `notifications`** — SocialPanel.tsx, FriendProfileModal.tsx hacen `supabase.from('notifications').insert()` | Seguridad: un cliente manipulado puede insertar notificaciones falsas. La `anon_key` tiene permiso de escritura. |
| 2 | **Servidor no toca `notifications`** — `server/src/index.ts` no escribe en la tabla, solo emite socket events. No hay autoridad central. | Inconsistencia: si el frontend omite crear la notificación por un error, se pierde. |
| 3 | **`markNotificationAsRead` hace DELETE** — en `useNotifications.ts:414` el nombre engaña; borra la notificación en vez de marcarla como leída. Inconsistente con `markAllAsRead` que sí hace UPDATE. | UX confuso: el elemento desaparece al hacer clic. El nombre no refleja la acción real. |
| 4 | **Sin RPCs para notificaciones** — todas las operaciones son directas desde el frontend. No hay validación centralizada de tipos, owners, etc. | Riesgo de datos inválidos, duplicados, orfandad. |
| 5 | **Metadata JSONB sin schema** — cada punto de inserción usa keys distintas (`senderName` vs `sender_username`, `roomId` vs `room_id`). | Dificulta consultas, no hay consistencia entre tipos. |
| 6 | **Sin trigger en `friend_requests`** — la notificación de solicitud de amistad se crea manualmente desde `FriendSearch.tsx`. Si falla ese paso, el receptor nunca se entera. | Falta de atomicidad: la solicitud se crea pero la notificación puede no llegar. |
| 7 | **Sin auto-cleanup** — las notificaciones leídas se acumulan indefinidamente. Solo hay borrado manual vía botón "Borrar leídas". | Degradación de performance con el tiempo. |
| 8 | **Polling fallback de 7s sin logging** — `setInterval(fetchCounts, 7000)` en `useNotifications.ts` no logea errores de Realtime. | Dificulta diagnosticar problemas de conectividad. |
| 9 | **Sin notificación al remitente** — cuando se acepta/rechaza una solicitud de amistad, el remitente no recibe notificación. | UX incompleta. |
| 10 | **Desafíos: frontend hace doble escritura** — `create_room` (socket) + `game_invitations` INSERT + `notifications` INSERT en tres pasos separados. Si uno falla, estado inconsistente. | Falta de atomicidad en el flujo de desafíos. |

---

## Fases de implementación

### Fase 1: RPCs de Postgres para notificaciones

**Archivo nuevo:** `database/database-migration-notification-rpcs.sql`

#### 1a. RPC `create_notification`

```sql
CREATE OR REPLACE FUNCTION create_notification(
  p_player_id UUID,
  p_type TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_allowed_types TEXT[] := ARRAY[
    'friend_request', 'game_invitation', 'tournament_start',
    'round_ready', 'achievement', 'level_up', 'division_change'
  ];
BEGIN
  IF NOT (p_type = ANY(v_allowed_types)) THEN
    RAISE EXCEPTION 'Tipo de notificación inválido: %', p_type;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_player_id) THEN
    RAISE EXCEPTION 'El jugador % no existe', p_player_id;
  END IF;

  INSERT INTO notifications (player_id, type, content, metadata)
  VALUES (p_player_id, p_type, p_content, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
```

#### 1b. RPC `mark_notification_read`

```sql
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id UUID,
  p_player_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE id = p_notification_id AND player_id = p_player_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notificación no encontrada o no pertenece al jugador';
  END IF;
END;
$$;
```

#### 1c. RPC `mark_all_notifications_read`

```sql
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_player_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE player_id = p_player_id AND is_read = FALSE;
END;
$$;
```

#### 1d. RPC `delete_notification`

```sql
CREATE OR REPLACE FUNCTION delete_notification(
  p_notification_id UUID,
  p_player_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications
  WHERE id = p_notification_id AND player_id = p_player_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notificación no encontrada o no pertenece al jugador';
  END IF;
END;
$$;
```

#### 1e. RPC `delete_read_notifications`

```sql
CREATE OR REPLACE FUNCTION delete_read_notifications(p_player_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications
  WHERE player_id = p_player_id AND is_read = TRUE;
END;
$$;
```

#### 1f. RPC `cleanup_old_notifications`

```sql
CREATE OR REPLACE FUNCTION cleanup_old_notifications(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE is_read = TRUE
    AND created_at < NOW() - (p_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
```

**Archivos a modificar:**
- `database/database-migration-notification-rpcs.sql` (nuevo)

---

### Fase 2: Trigger en `friend_requests` para notificaciones automáticas

**Agregar al archivo:** `database/database-migration-notification-rpcs.sql`

#### 2a. Función de trigger

```sql
CREATE OR REPLACE FUNCTION notify_friend_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
  SELECT COALESCE(username, 'Un jugador') INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  PERFORM create_notification(
    NEW.receiver_id,
    'friend_request',
    v_sender_name || ' te ha enviado una solicitud de amistad.',
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'sender_name', v_sender_name,
      'request_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;
```

#### 2b. Trigger

```sql
CREATE TRIGGER trg_friend_request_notify
  AFTER INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request_insert();
```

#### 2c. (Opcional) Notificación al remitente cuando se acepta

```sql
CREATE OR REPLACE FUNCTION notify_friend_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receiver_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT COALESCE(username, 'Un jugador') INTO v_receiver_name
    FROM profiles WHERE id = NEW.receiver_id;

    PERFORM create_notification(
      NEW.sender_id,
      'friend_request',
      v_receiver_name || ' aceptó tu solicitud de amistad.',
      jsonb_build_object(
        'receiver_id', NEW.receiver_id,
        'receiver_name', v_receiver_name,
        'request_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_friend_request_accepted_notify
  AFTER UPDATE OF status ON friend_requests
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status = 'pending')
  EXECUTE FUNCTION notify_friend_request_accepted();
```

**Archivos a modificar:**
- `database/database-migration-notification-rpcs.sql` (contiene trigger functions + triggers)
- `src/web/components/FriendSearch.tsx` — eliminar el bloque que crea notificación manual (líneas ~203-224), ya no es necesario

---

### Fase 3: Servidor como autoridad para notificaciones de desafíos

#### 3a. Nuevo handler socket `send_challenge` en `server/src/index.ts`

```typescript
socket.on('send_challenge', async (data: {
  receiverId: string;
  betAmount?: number;
}) => {
  const { receiverId, betAmount = 0 } = data;
  const senderName = /* obtener de rooms o socket data */;

  // 1. Crear sala (misma lógica que create_room)
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  rooms[roomId] = {
    engine: new DefaultGameEngine(),
    state: null,
    players: [{
      socketId, playerId: userId,
      name: senderName, userId, team: undefined
    }],
    spectators: [], maxPlayers: 2,
    chatHistory: new RingBuffer<ChatMessage>(100),
    betAmount, prizePool: 0
  };
  socket.join(roomId);
  socketToRoomMap.set(socket.id, roomId);

  // 2. Insertar game_invitation vía service_role
  const { data: invitation, error: invError } = await supabase
    .from('game_invitations')
    .insert({
      sender_id: userId,
      receiver_id: receiverId,
      room_id: roomId,
      bet_amount: betAmount,
      status: 'pending',
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    })
    .select('id')
    .single();

  if (invError) {
    socket.emit('error', 'Error al crear el desafío');
    delete rooms[roomId];
    return;
  }

  // 3. Crear notificación vía RPC
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('username, elo, level, wins, losses, xp')
    .eq('id', userId)
    .single();

  await supabase.rpc('create_notification', {
    p_player_id: receiverId,
    p_type: 'game_invitation',
    p_content: `¡${senderProfile?.username || 'Un amigo'} te ha desafiado${betAmount > 0 ? ` por ${betAmount} 🪙` : ''}!`,
    p_metadata: JSON.stringify({
      sender_id: userId,
      sender_name: senderProfile?.username,
      sender_elo: senderProfile?.elo,
      sender_level: senderProfile?.level,
      sender_wins: senderProfile?.wins,
      sender_losses: senderProfile?.losses,
      sender_xp: senderProfile?.xp,
      invitation_id: invitation.id,
      room_id: roomId,
      bet_amount: betAmount,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    })
  });

  // 4. Responder al remitente
  socket.emit('challenge_sent', {
    roomId,
    invitationId: invitation.id,
    receiverId
  });
});
```

#### 3b. Actualizar frontend para usar `send_challenge`

**`SocialPanel.tsx`:**
- Reemplazar: `socket.emit('create_room', ...)` + esperar `room_created` + inserts DB
- Por: `socket.emit('send_challenge', { receiverId: friend.id, betAmount })` + esperar `challenge_sent`

**`FriendProfileModal.tsx`:**
- Mismo reemplazo

#### 3c. Manejo de expiry en el servidor (opcional)

Agregar un map de timeouts por desafío en el servidor para auto-expirar:

```typescript
const challengeTimeouts = new Map<string, NodeJS.Timeout>();

// Al crear desafío:
challengeTimeouts.set(invitation.id, setTimeout(async () => {
  await supabase.from('game_invitations')
    .update({ status: 'expired' })
    .eq('id', invitation.id)
    .eq('status', 'pending');

  // Notificar al emisor si está conectado
  const room = rooms[roomId];
  if (room && room.players[0]) {
    io.to(room.players[0].socketId).emit('challenge_expired', { roomId });
  }
  closeRoom(roomId, 'challenge_expired');
}, 5 * 60 * 1000));
```

**Archivos a modificar:**
- `server/src/index.ts` — agregar handler `send_challenge`, opcionalmente timeout management
- `src/web/components/SocialPanel.tsx` — migrar a `send_challenge`
- `src/web/components/FriendProfileModal.tsx` — migrar a `send_challenge`

---

### Fase 4: Refactor frontend — RPCs y consistencia

#### 4a. Reemplazar operaciones directas por RPCs en `useNotifications.ts`

| Operación actual | Código actual | Nueva implementación |
|---|---|---|
| `markNotificationAsRead` | `delete().eq('id', id)` | `supabase.rpc('mark_notification_read', { p_notification_id: id, p_player_id: user.id })` |
| `markAllAsRead` | `update({ is_read: true })` | `supabase.rpc('mark_all_notifications_read', { p_player_id: user.id })` |
| `deleteReadNotifications` | `delete().eq('is_read', true)` | `supabase.rpc('delete_read_notifications', { p_player_id: user.id })` |
| `deleteNotification` | `delete().eq('id', id)` | `supabase.rpc('delete_notification', { p_notification_id: id, p_player_id: user.id })` |
| `handleGameInvite` - actualiza status | `update({ status })` | Mantener directo (game_invitations es tabla distinta, no necesita RPC) o crear RPC opcional |

#### 4b. Renombrar `markNotificationAsRead` → `deleteNotification`

Actualmente `markNotificationAsRead` hace DELETE pero se llama desde `ProfileHeader.tsx` cuando el usuario hace clic en una notificación individual. Hay dos opciones:

**Opción A (recomendada):** Separar en dos funciones:
- `markNotificationAsRead` → realmente marca como leída (UPDATE `is_read = true`)
- Mantener `deleteNotification` para el botón (×) individual

**Opción B:** Renombrar a `deleteNotification` y cambiar el comportamiento del clic para que marque como leída.

→ **Opción A** porque el clic en la notificación debe abrirla/marcarla como leída, no borrarla. El botón × debe borrar.

**Cambios en `ProfileHeader.tsx`:**
- Clic en notificación → `markNotificationAsRead` (marca como leída, no borra)
- Botón × → `deleteNotification` (borra)

#### 4c. Definir tipos consistentes para metadata

```typescript
// src/web/types/notifications.ts (nuevo archivo)

export interface FriendRequestMetadata {
  sender_id: string;
  sender_name: string;
  request_id: string;
}

export interface GameInvitationMetadata {
  sender_id: string;
  sender_name: string;
  sender_elo?: number;
  sender_level?: number;
  sender_wins?: number;
  sender_losses?: number;
  sender_xp?: number;
  invitation_id: string;
  room_id: string;
  bet_amount?: number;
  expires_at: string;
}

export interface TournamentMetadata {
  event_id: string;
  game_room_id: string;
  round: number;
}

export type NotificationMetadata =
  | FriendRequestMetadata
  | GameInvitationMetadata
  | TournamentMetadata
  | Record<string, unknown>;
```

#### 4d. Eliminar inserts directos en `SocialPanel.tsx` y `FriendProfileModal.tsx`

Ya no serán necesarios porque:
- `notifications` INSERT → lo hace el servidor vía `send_challenge`
- `game_invitations` INSERT → lo hace el servidor vía `send_challenge`

**Archivos a modificar:**
- `src/web/hooks/useNotifications.ts`
- `src/web/components/ProfileHeader.tsx`
- `src/web/types/notifications.ts` (nuevo)

---

### Fase 5: Auto-cleanup programado

#### 5a. Vía servidor (setInterval en `server/src/index.ts`)

```typescript
// Cada hora, limpiar notificaciones leídas > 30 días
setInterval(async () => {
  try {
    const { data, error } = await supabase.rpc('cleanup_old_notifications', {
      p_days: 30
    });
    if (error) {
      console.error('Error en cleanup de notificaciones:', error);
    } else if (data && data > 0) {
      console.log(`Notificaciones limpiadas: ${data}`);
    }
  } catch (err) {
    console.error('Error en cleanup de notificaciones:', err);
  }
}, 60 * 60 * 1000); // cada hora
```

#### 5b. Alternativa vía pg_cron (self-hosted)

```sql
SELECT cron.schedule(
  'cleanup-notifications',
  '0 3 * * *',  -- 3 AM daily
  $$SELECT cleanup_old_notifications(30)$$
);
```

Elegir según preferencia. La vía servidor es más portable.

**Archivos a modificar:**
- `server/src/index.ts` — agregar setInterval (o `database/` si se usa pg_cron)

---

### Fase 6: Logging y monitoreo

#### 6a. Logging de errores de Realtime en `useNotifications.ts`

```typescript
// Al suscribirse a canales Realtime:
const channel = supabase.channel(`notifications:${user.id}`);
channel.on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'notifications', filter: `player_id=eq.${user.id}` },
  (payload) => { /* ... */ }
).subscribe((status, err) => {
  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
    console.warn('[Realtime] Error en canal notifications:', status, err);
    // Opcional: reportar a métricas
  }
});
```

#### 6b. Mejorar el polling fallback

No eliminar el polling de 7s (es un safety net útil), pero logear explícitamente cuando Realtime entrega datos que el polling no tenía (o viceversa) para diagnosticar discrepancias.

**Archivos a modificar:**
- `src/web/hooks/useNotifications.ts`

---

### Fase 7: (Opcional) Limpieza de `game_invitations` expiradas

Agregar al cleanup periódico:

```sql
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  UPDATE game_invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
```

Incluir en el setInterval del servidor o pg_cron.

**Archivos a modificar:**
- `database/database-migration-notification-rpcs.sql`
- `server/src/index.ts` (opcional)

---

## Resumen de archivos

### Nuevos

| Archivo | Contenido |
|---|---|
| `database/database-migration-notification-rpcs.sql` | Todos los RPCs + triggers |
| `src/web/types/notifications.ts` | Tipos TypeScript para metadata |

### Modificados

| Archivo | Cambio |
|---|---|
| `server/src/index.ts` | Nuevo handler `send_challenge`, setInterval cleanup, opcional timeout management |
| `src/web/hooks/useNotifications.ts` | Reemplazar operaciones directas por RPCs, renombrar/split `markNotificationAsRead`, logging Realtime |
| `src/web/components/ProfileHeader.tsx` | Clic en notificación → `markNotificationAsRead` (UPDATE), × → `deleteNotification` |
| `src/web/components/SocialPanel.tsx` | Migrar de `create_room` + inserts a `send_challenge` |
| `src/web/components/FriendProfileModal.tsx` | Migrar de `create_room` + inserts a `send_challenge` |
| `src/web/components/FriendSearch.tsx` | Eliminar notificación manual (trigger DB la crea) |

---

## Orden de implementación

1. **Fase 1** (RPCs) — prerequisite para todo lo demás
2. **Fase 2** (trigger + eliminar código en FriendSearch) — independiente, se puede hacer en paralelo con Fase 3
3. **Fase 3** (send_challenge servidor) — requiere Fase 1
4. **Fase 4** (refactor frontend RPCs) — requiere Fase 1, puede ir después de 2+3
5. **Fase 5** (cleanup) — requiere Fase 1 (RPC cleanup)
6. **Fase 6** (logging) — independiente
7. **Fase 7** (cleanup invites, opcional) — independiente

**Orden recomendado:** 1 → 2 + 3 → 4 → 5 + 6 → 7

---

## Notas técnicas

- Todos los RPCs son `SECURITY DEFINER` para que el frontend (con anon key) y el servidor (con service_role) puedan llamarlos
- Los triggers también son `SECURITY DEFINER` para poder llamar a los RPCs internamente
- El servidor usa `supabase.rpc()` para llamar a los RPCs de Postgres (ya tiene service_role configurado)
- El esquema de metadata debe ser el mismo en el servidor (Fase 3) y en los tipos de TypeScript (Fase 4)
- La migración SQL debe ser idempotente (usar `IF NOT EXISTS`, `CREATE OR REPLACE`)
