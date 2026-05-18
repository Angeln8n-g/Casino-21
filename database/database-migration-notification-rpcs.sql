-- ============================================================
-- NOTIFICATION RPCs + TRIGGERS
--
-- Centraliza la creación/lectura/borrado de notificaciones
-- vía RPCs SECURITY DEFINER para que tanto el frontend (anon key)
-- como el servidor (service_role) puedan operar sin exponer
-- la tabla directamente.
--
-- También agrega triggers automáticos:
--   - Al INSERT en friend_requests → notifica al receptor
--   - Al UPDATE (accepted) en friend_requests → notifica al remitente
-- ============================================================

SET search_path TO public;

-- ============================================================
-- 1. RPC: create_notification
-- Crea una notificación validando tipo y existencia del jugador.
-- ============================================================
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


-- ============================================================
-- 2. RPC: mark_notification_read
-- Marca una notificación individual como leída.
-- Valida que pertenezca al jugador.
-- ============================================================
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


-- ============================================================
-- 3. RPC: mark_all_notifications_read
-- Marca todas las notificaciones no leídas de un jugador como leídas.
-- ============================================================
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


-- ============================================================
-- 4. RPC: delete_notification
-- Elimina una notificación individual.
-- Valida que pertenezca al jugador.
-- ============================================================
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


-- ============================================================
-- 5. RPC: delete_read_notifications
-- Elimina todas las notificaciones leídas de un jugador.
-- ============================================================
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


-- ============================================================
-- 6. RPC: cleanup_old_notifications
-- Elimina notificaciones leídas más antiguas que p_days días.
-- Devuelve la cantidad de registros eliminados.
-- Útil para tareas programadas (pg_cron o setInterval).
-- ============================================================
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


-- ============================================================
-- 7. RPC: cleanup_expired_invitations
-- Marca como expiradas las game_invitations cuyo expires_at pasó.
-- Devuelve la cantidad de invitaciones actualizadas.
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE game_invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;


-- ============================================================
-- 8. TRIGGER: Notificar al receptor al crear solicitud de amistad
-- ============================================================
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

DROP TRIGGER IF EXISTS trg_friend_request_notify ON friend_requests;
CREATE TRIGGER trg_friend_request_notify
  AFTER INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request_insert();


-- ============================================================
-- 9. TRIGGER: Notificar al remitente cuando se acepta su solicitud
-- ============================================================
CREATE OR REPLACE FUNCTION notify_friend_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receiver_name TEXT;
BEGIN
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friend_request_accepted_notify ON friend_requests;
CREATE TRIGGER trg_friend_request_accepted_notify
  AFTER UPDATE OF status ON friend_requests
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status = 'pending')
  EXECUTE FUNCTION notify_friend_request_accepted();
