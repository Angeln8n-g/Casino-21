-- ============================================================
-- MIGRACIÓN: Mejoras Avanzadas y Resiliencia de Torneos V2
-- - Soporte para Walkover / No-Show automático y manual
-- - Registro de tiempo de espera de jugadores en el bracket
-- - Sistema de Check-in previo para eventos y torneos
-- ============================================================

SET search_path TO public;

-- 1. EXTENSIÓN DE TOURNAMENT_MATCHES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournament_matches' AND column_name='walkover_reason') THEN
    ALTER TABLE public.tournament_matches ADD COLUMN walkover_reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournament_matches' AND column_name='waiting_player_id') THEN
    ALTER TABLE public.tournament_matches ADD COLUMN waiting_player_id UUID REFERENCES public.profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournament_matches' AND column_name='waiting_since') THEN
    ALTER TABLE public.tournament_matches ADD COLUMN waiting_since TIMESTAMPTZ;
  END IF;
END $$;

-- 2. EXTENSIÓN DE EVENTS PARA CHECK-IN PREVIO
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='check_in_enabled') THEN
    ALTER TABLE public.events ADD COLUMN check_in_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='check_in_deadline') THEN
    ALTER TABLE public.events ADD COLUMN check_in_deadline TIMESTAMPTZ;
  END IF;
END $$;

-- 3. EXTENSIÓN DE EVENT_ENTRIES PARA REGISTRO DE CHECK-IN
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_entries' AND column_name='checked_in') THEN
    ALTER TABLE public.event_entries ADD COLUMN checked_in BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_entries' AND column_name='checked_in_at') THEN
    ALTER TABLE public.event_entries ADD COLUMN checked_in_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. RPC PARA HACER CHECK-IN EN UN EVENTO
CREATE OR REPLACE FUNCTION public.check_in_to_event(
  p_event_id UUID,
  p_player_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_entry RECORD;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_FOUND');
  END IF;

  IF NOT v_event.check_in_enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHECK_IN_NOT_ACTIVE');
  END IF;

  IF v_event.check_in_deadline IS NOT NULL AND NOW() > v_event.check_in_deadline THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHECK_IN_EXPIRED');
  END IF;

  SELECT * INTO v_entry FROM public.event_entries 
  WHERE event_id = p_event_id AND player_id = p_player_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_ENROLLED');
  END IF;

  UPDATE public.event_entries
  SET checked_in = TRUE,
      checked_in_at = NOW()
  WHERE event_id = p_event_id AND player_id = p_player_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC ATÓMICA PARA RECLAMAR WALKOVER POR NO-SHOW
-- Un jugador que espera a su oponente por más de 180 segundos (3 minutos) puede reclamar victoria.
CREATE OR REPLACE FUNCTION public.claim_tournament_walkover(
  p_match_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_match RECORD;
  v_opponent_id UUID;
  v_seconds_waited INTEGER;
BEGIN
  SELECT * INTO v_match FROM public.tournament_matches WHERE id = p_match_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'MATCH_NOT_FOUND');
  END IF;

  IF v_match.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'MATCH_ALREADY_COMPLETED');
  END IF;

  IF v_match.player1_id <> p_user_id AND v_match.player2_id <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_A_MATCH_PARTICIPANT');
  END IF;

  v_opponent_id := CASE WHEN v_match.player1_id = p_user_id THEN v_match.player2_id ELSE v_match.player1_id END;

  IF v_opponent_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'OPPONENT_NOT_SET');
  END IF;

  -- Validar tiempo de espera registrado (mínimo 180 segundos = 3 minutos)
  IF v_match.waiting_since IS NULL THEN
    -- Si no estaba registrado, lo registramos ahora para iniciar la cuenta
    UPDATE public.tournament_matches
    SET waiting_player_id = p_user_id,
        waiting_since = NOW()
    WHERE id = p_match_id;

    RETURN jsonb_build_object(
      'success', false, 
      'error', 'WAIT_TIMER_STARTED', 
      'remaining_seconds', 180
    );
  END IF;

  v_seconds_waited := EXTRACT(EPOCH FROM (NOW() - v_match.waiting_since))::INTEGER;

  IF v_seconds_waited < 180 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'WAIT_TIME_NOT_MET', 
      'remaining_seconds', 180 - v_seconds_waited
    );
  END IF;

  -- Adjudicar victoria por walkover
  UPDATE public.tournament_matches
  SET winner_id = p_user_id,
      status = 'completed',
      walkover_reason = 'opponent_no_show',
      completed_at = NOW()
  WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_match_id,
    'winner_id', p_user_id,
    'opponent_id', v_opponent_id,
    'event_id', v_match.event_id,
    'round_number', v_match.round_number,
    'match_order', v_match.match_order
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
