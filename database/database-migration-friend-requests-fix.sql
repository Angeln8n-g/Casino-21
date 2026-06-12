-- ============================================================
-- FIX: Friend Requests - RPC functions + RLS policies + Realtime
-- 
-- Problema original:
--   El frontend intentaba UPDATE/DELETE directo en friend_requests
--   usando la anon key, pero las políticas RLS requerían service_role.
--   
-- Solución:
--   1. Función RPC SECURITY DEFINER para responder solicitudes (accept/reject)
--   2. Función RPC SECURITY DEFINER para re-enviar solicitud (reemplazar rejected)
--   3. Política DELETE para service_role (coherencia)
--   4. Agregar tablas a la publicación supabase_realtime
-- ============================================================

SET search_path TO public;

-- ============================================================
-- 1. FUNCIÓN: respond_friend_request
-- Permite al receptor aceptar o rechazar una solicitud de amistad.
-- Si se acepta, también crea el registro bidireccional en friendships.
-- ============================================================
CREATE OR REPLACE FUNCTION respond_friend_request(
  p_request_id UUID,
  p_user_id UUID,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_receiver_id UUID;
  v_current_status TEXT;
BEGIN
  -- Validar acción
  IF p_action NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Acción inválida. Use accepted o rejected.';
  END IF;

  -- Obtener datos de la solicitud
  SELECT sender_id, receiver_id, status
  INTO v_sender_id, v_receiver_id, v_current_status
  FROM friend_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud de amistad no encontrada';
  END IF;

  -- Verificar que el usuario sea el receptor
  IF v_receiver_id != p_user_id THEN
    RAISE EXCEPTION 'Solo el receptor puede responder a esta solicitud';
  END IF;

  -- Verificar que esté pendiente
  IF v_current_status != 'pending' THEN
    RAISE EXCEPTION 'La solicitud ya fue respondida (estado actual: %)', v_current_status;
  END IF;

  -- Actualizar estado
  UPDATE friend_requests
  SET status = p_action,
      responded_at = NOW()
  WHERE id = p_request_id;

  -- Si se acepta, crear registro en friendships (ordenado: ID menor primero)
  IF p_action = 'accepted' THEN
    INSERT INTO friendships (player1_id, player2_id, status)
    VALUES (
      LEAST(v_sender_id, v_receiver_id),
      GREATEST(v_sender_id, v_receiver_id),
      'accepted'
    )
    ON CONFLICT (player1_id, player2_id) DO NOTHING;
  END IF;

  RETURN TRUE;
END;
$$;


-- ============================================================
-- 2. FUNCIÓN: resend_friend_request
-- Permite re-enviar una solicitud previamente rechazada.
-- Reemplaza el registro anterior (evita el DELETE+INSERT manual).
-- ============================================================
CREATE OR REPLACE FUNCTION resend_friend_request(
  p_sender_id UUID,
  p_receiver_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_existing_status TEXT;
  v_new_id UUID;
BEGIN
  -- Buscar solicitud existente
  SELECT id, status
  INTO v_existing_id, v_existing_status
  FROM friend_requests
  WHERE sender_id = p_sender_id AND receiver_id = p_receiver_id;

  IF FOUND THEN
    IF v_existing_status = 'pending' THEN
      RAISE EXCEPTION 'Ya tienes una solicitud pendiente con este jugador';
    ELSIF v_existing_status = 'accepted' THEN
      RAISE EXCEPTION 'Ya son amigos';
    END IF;

    -- Era 'rejected' → reemplazar
    UPDATE friend_requests
    SET status = 'pending',
        responded_at = NULL,
        created_at = NOW()
    WHERE id = v_existing_id;

    RETURN v_existing_id;
  ELSE
    -- No existe → crear nueva
    INSERT INTO friend_requests (sender_id, receiver_id, status)
    VALUES (p_sender_id, p_receiver_id, 'pending')
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
  END IF;
END;
$$;


-- ============================================================
-- 3. FUNCIÓN: auto_accept_friend_request (usado en FriendSearch)
-- Cuando el usuario A busca al usuario B y B ya le había enviado
-- solicitud, esta función acepta automáticamente.
-- ============================================================
CREATE OR REPLACE FUNCTION auto_accept_friend_request(
  p_user_id UUID,
  p_other_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Buscar solicitud pendiente donde p_other_id es sender y p_user_id es receiver
  SELECT id INTO v_request_id
  FROM friend_requests
  WHERE sender_id = p_other_id
    AND receiver_id = p_user_id
    AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Usar respond_friend_request para aceptar
  PERFORM respond_friend_request(v_request_id, p_user_id, 'accepted');
  RETURN TRUE;
END;
$$;


-- ============================================================
-- 4. POLÍTICA DELETE para friend_requests (service_role)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friend_requests' AND policyname='fr_delete_service') THEN
    CREATE POLICY "fr_delete_service" ON friend_requests FOR DELETE USING (auth.role() = 'service_role');
  END IF;
END $$;


-- ============================================================
-- 5. Agregar tablas a la publicación supabase_realtime
-- IMPORTANTE: En Supabase self-hosted, las tablas deben estar
-- en esta publicación para que Realtime funcione.
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['profiles', 'friend_requests', 'friendships', 'notifications', 'game_invitations', 'messages', 'chat_messages', 'match_history'];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY tables
    LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
      EXCEPTION
        WHEN others THEN
          NULL; -- ignorar cualquier error (si ya existe o no existe)
      END;
    END LOOP;
  END IF;
END $$;
