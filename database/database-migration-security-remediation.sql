-- database-migration-security-remediation.sql
-- Fase 1: Adición y Compatibilidad (Seguridad de Postgres y RPCs)

SET search_path TO public;

-- 1. RPCs ATÓMICAS PARA WALLET (Evitar Race Conditions con SELECT FOR UPDATE)
CREATE OR REPLACE FUNCTION public.atomic_charge_coins(
  p_player_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_ref_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_coins INTEGER;
BEGIN
  -- Validar que el monto sea positivo
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto a cobrar debe ser mayor a cero';
  END IF;

  -- Bloqueo de fila para evitar modificaciones concurrentes
  SELECT coins INTO v_coins
  FROM public.profiles
  WHERE id = p_player_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de jugador no encontrado';
  END IF;

  IF v_coins < p_amount THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET coins = coins - p_amount
  WHERE id = p_player_id;

  INSERT INTO public.wallet_transactions (player_id, amount, reason, reference_id)
  VALUES (p_player_id, -p_amount, p_reason, p_ref_id);

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.atomic_refund_coins(
  p_player_id UUID,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Validar que el monto sea positivo
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto a reembolsar debe ser mayor a cero';
  END IF;

  -- Verificar existencia del jugador
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_player_id) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Perfil de jugador no encontrado';
  END IF;

  UPDATE public.profiles
  SET coins = coins + p_amount
  WHERE id = p_player_id;

  INSERT INTO public.wallet_transactions (player_id, amount, reason, reference_id)
  VALUES (p_player_id, p_amount, p_reason, NULL);

  RETURN TRUE;
END;
$$;


-- 2. ENFORZAR SEGURIDAD EN FUNCIONES EXISTENTES DE EVENTOS
CREATE OR REPLACE FUNCTION public.join_event(event_id_param UUID, player_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fee INTEGER;
  v_coins INTEGER;
  v_status TEXT;
  v_participants_count INTEGER;
  v_max_participants INTEGER;
  v_already_enrolled BOOLEAN;
BEGIN
  -- Validar que el actor coincida con el usuario autenticado
  IF player_id_param != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: No puedes inscribir a otro jugador.';
  END IF;

  -- 1. Validar que el evento existe y obtener datos
  SELECT entry_fee, status, participants_count, max_participants 
  INTO v_fee, v_status, v_participants_count, v_max_participants 
  FROM public.events WHERE id = event_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El evento no existe';
  END IF;

  -- 2. Validar estado del evento
  IF v_status != 'upcoming' THEN
    RAISE EXCEPTION 'El evento no está abierto para inscripciones';
  END IF;

  -- 3. Validar cupo
  IF v_participants_count >= v_max_participants THEN
    RAISE EXCEPTION 'El evento está lleno';
  END IF;

  -- 4. Validar si ya está inscrito
  SELECT EXISTS(SELECT 1 FROM public.event_entries WHERE event_id = event_id_param AND player_id = player_id_param) INTO v_already_enrolled;
  IF v_already_enrolled THEN
    RAISE EXCEPTION 'Ya estás inscrito en este evento';
  END IF;

  -- 5. Obtener saldo actual con FOR UPDATE para evitar race condition
  SELECT coins INTO v_coins FROM public.profiles WHERE id = player_id_param FOR UPDATE;

  -- 6. Validar saldo
  IF v_coins < v_fee THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  -- 7. Deducir saldo
  IF v_fee > 0 THEN
    UPDATE public.profiles SET coins = coins - v_fee WHERE id = player_id_param;
    
    -- Registrar transacción
    INSERT INTO public.wallet_transactions (player_id, amount, reason, reference_id) 
    VALUES (player_id_param, -v_fee, 'tournament_entry', event_id_param);
  END IF;

  -- 8. Inscribir jugador
  INSERT INTO public.event_entries (event_id, player_id) VALUES (event_id_param, player_id_param);

  -- 9. Actualizar contador de participantes
  UPDATE public.events SET participants_count = participants_count + 1 WHERE id = event_id_param;

  RETURN TRUE;
END;
$$;


-- 3. ENFORZAR SEGURIDAD EN FUNCIONES DE AMISTADES
CREATE OR REPLACE FUNCTION public.respond_friend_request(
  p_request_id UUID,
  p_user_id UUID,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sender_id UUID;
  v_receiver_id UUID;
  v_current_status TEXT;
BEGIN
  -- Validar que el usuario autenticado coincida con el argumento
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: Identidad inválida.';
  END IF;

  -- Validar acción
  IF p_action NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Acción inválida. Use accepted o rejected.';
  END IF;

  -- Obtener datos de la solicitud
  SELECT sender_id, receiver_id, status
  INTO v_sender_id, v_receiver_id, v_current_status
  FROM public.friend_requests
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
  UPDATE public.friend_requests
  SET status = p_action,
      responded_at = NOW()
  WHERE id = p_request_id;

  -- Si se acepta, crear registro en friendships
  IF p_action = 'accepted' THEN
    INSERT INTO public.friendships (player1_id, player2_id, status)
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

CREATE OR REPLACE FUNCTION public.resend_friend_request(
  p_sender_id UUID,
  p_receiver_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_id UUID;
  v_existing_status TEXT;
  v_new_id UUID;
BEGIN
  -- Validar que el actor coincida con el sender
  IF p_sender_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: Identidad inválida.';
  END IF;

  -- Buscar solicitud existente
  SELECT id, status
  INTO v_existing_id, v_existing_status
  FROM public.friend_requests
  WHERE sender_id = p_sender_id AND receiver_id = p_receiver_id;

  IF FOUND THEN
    IF v_existing_status = 'pending' THEN
      RAISE EXCEPTION 'Ya tienes una solicitud pendiente con este jugador';
    ELSIF v_existing_status = 'accepted' THEN
      RAISE EXCEPTION 'Ya son amigos';
    END IF;

    UPDATE public.friend_requests
    SET status = 'pending',
        responded_at = NULL,
        created_at = NOW()
    WHERE id = v_existing_id;

    RETURN v_existing_id;
  ELSE
    INSERT INTO public.friend_requests (sender_id, receiver_id, status)
    VALUES (p_sender_id, p_receiver_id, 'pending')
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_accept_friend_request(
  p_user_id UUID,
  p_other_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Validar que el actor coincida con p_user_id
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: Identidad inválida.';
  END IF;

  SELECT id INTO v_request_id
  FROM public.friend_requests
  WHERE sender_id = p_other_id
    AND receiver_id = p_user_id
    AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  PERFORM public.respond_friend_request(v_request_id, p_user_id, 'accepted');
  RETURN TRUE;
END;
$$;


-- 4. ENFORZAR SEGURIDAD EN FUNCIONES DE NOTIFICACIONES
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID,
  p_player_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_player_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: Identidad inválida.';
  END IF;

  UPDATE public.notifications
  SET is_read = TRUE
  WHERE id = p_notification_id AND player_id = p_player_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notificación no encontrada o no pertenece al jugador';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_player_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_player_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: Identidad inválida.';
  END IF;

  UPDATE public.notifications
  SET is_read = TRUE
  WHERE player_id = p_player_id AND is_read = FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_notification(
  p_notification_id UUID,
  p_player_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_player_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: Identidad inválida.';
  END IF;

  DELETE FROM public.notifications
  WHERE id = p_notification_id AND player_id = p_player_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notificación no encontrada o no pertenece al jugador';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_read_notifications(p_player_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_player_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: Identidad inválida.';
  END IF;

  DELETE FROM public.notifications
  WHERE player_id = p_player_id AND is_read = TRUE;
END;
$$;


-- 5. CONFIGURAR SEARCH_PATH EN TRIGGERS / FUNCIONES DEL SISTEMA (SECURITY DEFINER)
-- handle_new_user es un trigger SECURITY DEFINER que se ejecuta al registrarse
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
