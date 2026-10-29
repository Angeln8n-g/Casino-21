-- ========================================================================================
-- MIGRACIÓN: TORNEOS 2.0 — MOTOR UNIFICADO (SIT & GO + CHECK-IN) Y PREMIACIÓN ESCALONADA
-- Archivo: database/database-migration-tournaments-v3-rewards.sql
--
-- Incluye:
-- 1. Nuevas columnas en `events`, `event_entries` y `profiles` para formatos rápidos
--    (Sit & Go / Programados), pozo dinámico por entradas, reparto escalonado (Top 2/4/8),
--    XP de torneo y cosméticos exclusivos (`store_items`).
-- 2. Endurecimiento de seguridad RLS (eliminación de inserciones/ediciones directas de cliente
--    en `tournament_prize_claims`, `championship_participants` y `event_entries`).
-- 3. RPCs atómicas (`SECURITY DEFINER`):
--    - `join_tournament_v3` & `join_event` (pozo dinámico, validación min_elo, auto check-in en Sit & Go)
--    - `leave_tournament_v3` (retiro o expulsión con reembolso íntegro antes del inicio)
--    - `refund_unchecked_tournament_entries` (reembolso automático a quienes no hicieron check-in)
--    - `cancel_and_refund_tournament` (cancelación segura con devolución de entradas)
--    - `distribute_tournament_rewards` (reparto idempotente Top 1..8 en monedas + XP + cosmético)
-- ========================================================================================

SET search_path TO public;

-- ========================================================================================
-- 1. EXTENSIÓN DE ESQUEMA: `events`, `event_entries` y `profiles`
-- ========================================================================================

DO $$
BEGIN
  -- Formato del torneo: 'sit_and_go' (inicia al llenarse) o 'scheduled' (fecha fija + check-in)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='tournament_format') THEN
    ALTER TABLE public.events
      ADD COLUMN tournament_format TEXT NOT NULL DEFAULT 'scheduled'
      CHECK (tournament_format IN ('sit_and_go', 'scheduled'));
  END IF;

  -- Si es TRUE en Sit & Go, al llenarse e iniciar crea automáticamente una nueva mesa abierta
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='auto_recreate') THEN
    ALTER TABLE public.events ADD COLUMN auto_recreate BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- Ventana previa de check-in en minutos para torneos programados
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='check_in_window_minutes') THEN
    ALTER TABLE public.events ADD COLUMN check_in_window_minutes INTEGER NOT NULL DEFAULT 15;
  END IF;

  -- Pozo base garantizado aportado por la casa o patrocinador (en monedas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='guaranteed_prize_coins') THEN
    ALTER TABLE public.events ADD COLUMN guaranteed_prize_coins INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Porcentaje de cada entrada (`entry_fee`) que se suma al pozo dinámico (ej. 90% pozo, 10% sink)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='entry_pool_percent') THEN
    ALTER TABLE public.events
      ADD COLUMN entry_pool_percent INTEGER NOT NULL DEFAULT 90
      CHECK (entry_pool_percent BETWEEN 0 AND 100);
  END IF;

  -- Pozo acumulado actual en monedas (garantizado + entradas acumuladas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='current_prize_coins') THEN
    ALTER TABLE public.events ADD COLUMN current_prize_coins INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Tabla JSONB de distribución porcentual por puesto
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='prize_tiers') THEN
    ALTER TABLE public.events
      ADD COLUMN prize_tiers JSONB NOT NULL DEFAULT '[{"place":1,"percent":55},{"place":2,"percent":25},{"place":3,"percent":10},{"place":4,"percent":10}]'::jsonb;
  END IF;

  -- Recompensas de XP por desempeño en torneo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='reward_xp_winner') THEN
    ALTER TABLE public.events ADD COLUMN reward_xp_winner INTEGER NOT NULL DEFAULT 300;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='reward_xp_podium') THEN
    ALTER TABLE public.events ADD COLUMN reward_xp_podium INTEGER NOT NULL DEFAULT 150;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='reward_xp_participation') THEN
    ALTER TABLE public.events ADD COLUMN reward_xp_participation INTEGER NOT NULL DEFAULT 40;
  END IF;

  -- Artículo cosmético exclusivo opcional (`store_items`) para el campeón
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='reward_store_item_id') THEN
    ALTER TABLE public.events ADD COLUMN reward_store_item_id UUID REFERENCES public.store_items(id) ON DELETE SET NULL;
  END IF;

  -- Mejor de N partidas en la Gran Final (1 o 3)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='final_best_of') THEN
    ALTER TABLE public.events ADD COLUMN final_best_of INTEGER NOT NULL DEFAULT 1 CHECK (final_best_of IN (1, 3));
  END IF;

  -- Marca de tiempo de idempotencia para evitar doble pago de premios
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='rewards_distributed_at') THEN
    ALTER TABLE public.events ADD COLUMN rewards_distributed_at TIMESTAMPTZ;
  END IF;

  -- Columnas de resultado final y premios otorgados por participante en `event_entries`
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_entries' AND column_name='final_placement') THEN
    ALTER TABLE public.event_entries ADD COLUMN final_placement INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_entries' AND column_name='coins_awarded') THEN
    ALTER TABLE public.event_entries ADD COLUMN coins_awarded INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_entries' AND column_name='xp_awarded') THEN
    ALTER TABLE public.event_entries ADD COLUMN xp_awarded INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_entries' AND column_name='item_awarded_id') THEN
    ALTER TABLE public.event_entries ADD COLUMN item_awarded_id UUID REFERENCES public.store_items(id) ON DELETE SET NULL;
  END IF;

  -- Estadísticas de torneos en `profiles`
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tournaments_won') THEN
    ALTER TABLE public.profiles ADD COLUMN tournaments_won INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tournament_podiums') THEN
    ALTER TABLE public.profiles ADD COLUMN tournament_podiums INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tournaments_played') THEN
    ALTER TABLE public.profiles ADD COLUMN tournaments_played INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Backfill seguro de `guaranteed_prize_coins` y `current_prize_coins` a partir del texto `prize_pool` existente
UPDATE public.events
SET
  guaranteed_prize_coins = COALESCE(
    NULLIF(regexp_replace(split_part(COALESCE(prize_pool, '0'), ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER,
    0
  ),
  current_prize_coins = GREATEST(
    current_prize_coins,
    COALESCE(
      NULLIF(regexp_replace(split_part(COALESCE(prize_pool, '0'), ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER,
      0
    ) + FLOOR(COALESCE(entry_fee, 0) * COALESCE(participants_count, 0) * (COALESCE(entry_pool_percent, 90) / 100.0))::INTEGER
  )
WHERE guaranteed_prize_coins = 0
  AND current_prize_coins = 0
  AND COALESCE(prize_pool, '') NOT ILIKE '%USD%';

-- ========================================================================================
-- 2. ENDURECIMIENTO DE SEGURIDAD RLS (BLOQUEO DE MUTACIONES DIRECTAS DESDE CLIENTE)
-- ========================================================================================

DO $$
BEGIN
  -- Bloquear INSERT directo de reclamos de premios en USD desde el navegador
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tournament_prize_claims' AND policyname='tpc_user_own_insert') THEN
    DROP POLICY "tpc_user_own_insert" ON public.tournament_prize_claims;
  END IF;

  -- Bloquear UPDATE libre de puntos/ranking/kyc en championship_participants desde el navegador
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='championship_participants' AND policyname='cp_user_own_update') THEN
    DROP POLICY "cp_user_own_update" ON public.championship_participants;
  END IF;

  -- Bloquear INSERT directo en event_entries sin pasar por join_tournament_v3 / join_event
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_entries' AND policyname='ee_insert_self') THEN
    DROP POLICY "ee_insert_self" ON public.event_entries;
  END IF;

  -- Bloquear DELETE directo en event_entries desde cliente (debe usar leave_tournament_v3 para reembolso/conteo)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_entries' AND policyname='ee_delete_self') THEN
    DROP POLICY "ee_delete_self" ON public.event_entries;
  END IF;
END $$;

-- Asegurar lectura pública de `event_entries` para mostrar participantes y podio en TournamentView
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_entries' AND policyname='ee_select_public') THEN
    CREATE POLICY "ee_select_public" ON public.event_entries FOR SELECT USING (true);
  END IF;
END $$;

-- ========================================================================================
-- 3. RPC: INSCRIPCIÓN CON POZO DINÁMICO Y AUTO CHECK-IN EN SIT & GO (`join_tournament_v3`)
-- ========================================================================================

CREATE OR REPLACE FUNCTION public.join_tournament_v3(
  p_event_id UUID,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event RECORD;
  v_profile RECORD;
  v_already_enrolled BOOLEAN;
  v_pot_contribution INTEGER;
  v_new_count INTEGER;
  v_new_pot INTEGER;
  v_auto_checkin BOOLEAN;
BEGIN
  -- Permitir llamada desde service_role (backend autenticado) o desde el propio usuario autenticado
  IF auth.role() <> 'service_role' AND (auth.uid() IS NULL OR p_player_id <> auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- Bloquear fila del evento para evitar sobrecupo en inscripciones concurrentes
  SELECT * INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'El torneo no existe.');
  END IF;

  IF v_event.status <> 'upcoming' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Las inscripciones para este torneo ya están cerradas.');
  END IF;

  IF v_event.participants_count >= v_event.max_participants THEN
    RETURN jsonb_build_object('success', false, 'error', 'El torneo ya alcanzó su cupo máximo.');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.event_entries
    WHERE event_id = p_event_id AND player_id = p_player_id
  ) INTO v_already_enrolled;

  IF v_already_enrolled THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya estás inscrito en este torneo.');
  END IF;

  -- Bloquear perfil del jugador para verificar ELO y descontar monedas de forma atómica
  SELECT coins, elo INTO v_profile
  FROM public.profiles
  WHERE id = p_player_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil de jugador no encontrado.');
  END IF;

  IF COALESCE(v_event.min_elo, 0) > 0 AND COALESCE(v_profile.elo, 1000) < v_event.min_elo THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Necesitas al menos %s de ELO para inscribirte (tu ELO: %s).', v_event.min_elo, COALESCE(v_profile.elo, 1000))
    );
  END IF;

  IF COALESCE(v_profile.coins, 0) < COALESCE(v_event.entry_fee, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Monedas insuficientes para cubrir la entrada.');
  END IF;

  -- Descontar entrada si tiene costo
  IF COALESCE(v_event.entry_fee, 0) > 0 THEN
    UPDATE public.profiles
    SET coins = coins - v_event.entry_fee
    WHERE id = p_player_id;

    INSERT INTO public.wallet_transactions (player_id, amount, reason, reference_id)
    VALUES (p_player_id, -v_event.entry_fee, 'tournament_entry', p_event_id);
  END IF;

  v_auto_checkin := (COALESCE(v_event.tournament_format, 'scheduled') = 'sit_and_go')
                    OR COALESCE(v_event.check_in_enabled, FALSE);

  INSERT INTO public.event_entries (event_id, player_id, checked_in, checked_in_at)
  VALUES (
    p_event_id,
    p_player_id,
    v_auto_checkin,
    CASE WHEN v_auto_checkin THEN NOW() ELSE NULL END
  );

  v_pot_contribution := FLOOR(COALESCE(v_event.entry_fee, 0) * (COALESCE(v_event.entry_pool_percent, 90) / 100.0))::INTEGER;
  v_new_count := COALESCE(v_event.participants_count, 0) + 1;
  v_new_pot := GREATEST(COALESCE(v_event.current_prize_coins, 0), COALESCE(v_event.guaranteed_prize_coins, 0)) + v_pot_contribution;

  UPDATE public.events
  SET
    participants_count = v_new_count,
    current_prize_coins = v_new_pot,
    prize_pool = format('%s Monedas', to_char(v_new_pot, 'FM999,999,999'))
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'participants_count', v_new_count,
    'max_participants', v_event.max_participants,
    'current_prize_coins', v_new_pot,
    'tournament_format', v_event.tournament_format,
    'checked_in', v_auto_checkin,
    'should_start', (v_event.tournament_format = 'sit_and_go' AND v_new_count >= v_event.max_participants)
  );
END;
$$;

-- Mantener `join_event` compatible delegando en `join_tournament_v3`
CREATE OR REPLACE FUNCTION public.join_event(event_id_param UUID, player_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res JSONB;
BEGIN
  v_res := public.join_tournament_v3(event_id_param, player_id_param);
  IF NOT COALESCE((v_res->>'success')::BOOLEAN, FALSE) THEN
    RAISE EXCEPTION '%', COALESCE(v_res->>'error', 'No se pudo completar la inscripción');
  END IF;
  RETURN TRUE;
END;
$$;

-- ========================================================================================
-- 4. RPC: RETIRO O EXPULSIÓN CON REEMBOLSO ÍNTEGRO (`leave_tournament_v3`)
-- ========================================================================================

CREATE OR REPLACE FUNCTION public.leave_tournament_v3(
  p_event_id UUID,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event RECORD;
  v_is_admin BOOLEAN := FALSE;
  v_pot_contribution INTEGER;
  v_new_count INTEGER;
  v_new_pot INTEGER;
  v_has_matches BOOLEAN;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;
    SELECT COALESCE(is_admin, FALSE) INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
    IF auth.uid() <> p_player_id AND NOT v_is_admin THEN
      RETURN jsonb_build_object('success', false, 'error', 'No autorizado para retirar a este jugador.');
    END IF;
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Torneo no encontrado.');
  END IF;

  IF v_event.status <> 'upcoming' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No es posible retirarse una vez iniciado el torneo.');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.tournament_matches WHERE event_id = p_event_id) INTO v_has_matches;
  IF v_has_matches THEN
    RETURN jsonb_build_object('success', false, 'error', 'Las llaves ya fueron generadas.');
  END IF;

  DELETE FROM public.event_entries
  WHERE event_id = p_event_id AND player_id = p_player_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'El jugador no está inscrito en este torneo.');
  END IF;

  -- Reembolsar entrada si aplica
  IF COALESCE(v_event.entry_fee, 0) > 0 THEN
    UPDATE public.profiles
    SET coins = coins + v_event.entry_fee
    WHERE id = p_player_id;

    INSERT INTO public.wallet_transactions (player_id, amount, reason, reference_id)
    VALUES (p_player_id, v_event.entry_fee, 'tournament_refund', p_event_id);
  END IF;

  v_pot_contribution := FLOOR(COALESCE(v_event.entry_fee, 0) * (COALESCE(v_event.entry_pool_percent, 90) / 100.0))::INTEGER;
  v_new_count := GREATEST(0, COALESCE(v_event.participants_count, 1) - 1);
  v_new_pot := GREATEST(
    COALESCE(v_event.guaranteed_prize_coins, 0),
    COALESCE(v_event.guaranteed_prize_coins, 0) + (v_new_count * v_pot_contribution)
  );

  UPDATE public.events
  SET
    participants_count = v_new_count,
    current_prize_coins = v_new_pot,
    prize_pool = format('%s Monedas', to_char(v_new_pot, 'FM999,999,999'))
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'refunded_coins', COALESCE(v_event.entry_fee, 0),
    'participants_count', v_new_count,
    'current_prize_coins', v_new_pot
  );
END;
$$;

-- ========================================================================================
-- 5. RPCs DE LIMPIEZA DE CHECK-IN Y CANCELACIÓN CON REEMBOLSO
-- ========================================================================================

CREATE OR REPLACE FUNCTION public.refund_unchecked_tournament_entries(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event RECORD;
  v_unchecked RECORD;
  v_refunded_ids UUID[] := ARRAY[]::UUID[];
  v_checked_count INTEGER;
  v_pot_contribution INTEGER;
  v_new_pot INTEGER;
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_FOUND');
  END IF;

  FOR v_unchecked IN
    SELECT player_id FROM public.event_entries
    WHERE event_id = p_event_id AND COALESCE(checked_in, FALSE) = FALSE
  LOOP
    DELETE FROM public.event_entries
    WHERE event_id = p_event_id AND player_id = v_unchecked.player_id;

    IF COALESCE(v_event.entry_fee, 0) > 0 THEN
      UPDATE public.profiles
      SET coins = coins + v_event.entry_fee
      WHERE id = v_unchecked.player_id;

      INSERT INTO public.wallet_transactions (player_id, amount, reason, reference_id)
      VALUES (v_unchecked.player_id, v_event.entry_fee, 'tournament_checkin_missed_refund', p_event_id);
    END IF;

    v_refunded_ids := array_append(v_refunded_ids, v_unchecked.player_id);
  END LOOP;

  SELECT COUNT(*)::INTEGER INTO v_checked_count
  FROM public.event_entries
  WHERE event_id = p_event_id;

  v_pot_contribution := FLOOR(COALESCE(v_event.entry_fee, 0) * (COALESCE(v_event.entry_pool_percent, 90) / 100.0))::INTEGER;
  v_new_pot := COALESCE(v_event.guaranteed_prize_coins, 0) + (v_checked_count * v_pot_contribution);

  UPDATE public.events
  SET
    participants_count = v_checked_count,
    current_prize_coins = v_new_pot,
    prize_pool = format('%s Monedas', to_char(v_new_pot, 'FM999,999,999'))
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'refunded_player_ids', to_jsonb(v_refunded_ids),
    'active_participants_count', v_checked_count,
    'current_prize_coins', v_new_pot
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_and_refund_tournament(
  p_event_id UUID,
  p_reason TEXT DEFAULT 'tournament_cancelled_refund'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event RECORD;
  v_entry RECORD;
  v_refunded_count INTEGER := 0;
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_FOUND');
  END IF;

  FOR v_entry IN
    SELECT player_id FROM public.event_entries WHERE event_id = p_event_id
  LOOP
    IF COALESCE(v_event.entry_fee, 0) > 0 THEN
      UPDATE public.profiles
      SET coins = coins + v_event.entry_fee
      WHERE id = v_entry.player_id;

      INSERT INTO public.wallet_transactions (player_id, amount, reason, reference_id)
      VALUES (v_entry.player_id, v_event.entry_fee, p_reason, p_event_id);
    END IF;
    v_refunded_count := v_refunded_count + 1;
  END LOOP;

  DELETE FROM public.event_entries WHERE event_id = p_event_id;

  UPDATE public.events
  SET
    status = 'completed',
    participants_count = 0,
    current_prize_coins = COALESCE(guaranteed_prize_coins, 0)
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'refunded_count', v_refunded_count
  );
END;
$$;

-- ========================================================================================
-- 6. RPC: DISTRIBUCIÓN ESCALONADA E IDEMPOTENTE DE PREMIOS (`distribute_tournament_rewards`)
-- ========================================================================================

CREATE OR REPLACE FUNCTION public.distribute_tournament_rewards(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event RECORD;
  v_total_pot INTEGER;
  v_max_round INTEGER;
  v_champion_id UUID;
  v_runner_up_id UUID;
  v_final_match RECORD;
  v_rec RECORD;
  v_place_cursor INTEGER;
  v_percent NUMERIC;
  v_coin_reward INTEGER;
  v_xp_reward INTEGER;
  v_item_reward UUID;
  v_payouts JSONB := '[]'::jsonb;
  v_placed_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_FOUND');
  END IF;

  -- Candado de idempotencia: nunca pagar dos veces el mismo torneo
  IF v_event.rewards_distributed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_distributed', true,
      'distributed_at', v_event.rewards_distributed_at
    );
  END IF;

  SELECT MAX(round_number) INTO v_max_round
  FROM public.tournament_matches
  WHERE event_id = p_event_id;

  IF v_max_round IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_MATCHES_FOUND');
  END IF;

  -- Obtener último partido completado de la Gran Final (soporta Bo1 y Bo3)
  SELECT * INTO v_final_match
  FROM public.tournament_matches
  WHERE event_id = p_event_id
    AND round_number = v_max_round
    AND status = 'completed'
    AND winner_id IS NOT NULL
  ORDER BY COALESCE(series_game, 1) DESC, completed_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND OR v_final_match.winner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'FINAL_NOT_COMPLETED');
  END IF;

  v_champion_id := v_final_match.winner_id;
  v_runner_up_id := CASE
    WHEN v_final_match.player1_id = v_champion_id THEN v_final_match.player2_id
    ELSE v_final_match.player1_id
  END;

  -- Determinar pozo total efectivo
  v_total_pot := GREATEST(
    COALESCE(v_event.current_prize_coins, 0),
    COALESCE(v_event.guaranteed_prize_coins, 0),
    COALESCE(
      NULLIF(regexp_replace(split_part(COALESCE(v_event.prize_pool, '0'), ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER,
      0
    )
  );

  -- Crear tabla temporal de posiciones del torneo en esta transacción
  CREATE TEMP TABLE IF NOT EXISTS tmp_tournament_placements (
    player_id UUID PRIMARY KEY,
    place INTEGER NOT NULL
  ) ON COMMIT DROP;
  TRUNCATE TABLE tmp_tournament_placements;

  -- 1er Lugar (Campeón)
  INSERT INTO tmp_tournament_placements (player_id, place)
  VALUES (v_champion_id, 1);
  v_placed_ids := array_append(v_placed_ids, v_champion_id);

  -- 2do Lugar (Subcampeón)
  IF v_runner_up_id IS NOT NULL AND NOT (v_runner_up_id = ANY(v_placed_ids)) THEN
    INSERT INTO tmp_tournament_placements (player_id, place)
    VALUES (v_runner_up_id, 2);
    v_placed_ids := array_append(v_placed_ids, v_runner_up_id);
  END IF;

  -- 3er y 4to Lugar (Perdedores de Semifinales: v_max_round - 1)
  v_place_cursor := 3;
  FOR v_rec IN
    SELECT DISTINCT ON (loser_id)
      loser_id,
      match_order
    FROM (
      SELECT
        CASE WHEN winner_id = player1_id THEN player2_id ELSE player1_id END AS loser_id,
        match_order
      FROM public.tournament_matches
      WHERE event_id = p_event_id
        AND round_number = v_max_round - 1
        AND status = 'completed'
        AND winner_id IS NOT NULL
        AND player1_id IS NOT NULL
        AND player2_id IS NOT NULL
    ) s
    WHERE loser_id IS NOT NULL
    ORDER BY loser_id, match_order ASC
  LOOP
    IF NOT (v_rec.loser_id = ANY(v_placed_ids)) AND v_place_cursor <= 4 THEN
      INSERT INTO tmp_tournament_placements (player_id, place)
      VALUES (v_rec.loser_id, v_place_cursor);
      v_placed_ids := array_append(v_placed_ids, v_rec.loser_id);
      v_place_cursor := v_place_cursor + 1;
    END IF;
  END LOOP;

  -- 5to a 8vo Lugar (Perdedores de Cuartos: v_max_round - 2)
  v_place_cursor := 5;
  FOR v_rec IN
    SELECT DISTINCT ON (loser_id)
      loser_id,
      match_order
    FROM (
      SELECT
        CASE WHEN winner_id = player1_id THEN player2_id ELSE player1_id END AS loser_id,
        match_order
      FROM public.tournament_matches
      WHERE event_id = p_event_id
        AND round_number = v_max_round - 2
        AND status = 'completed'
        AND winner_id IS NOT NULL
        AND player1_id IS NOT NULL
        AND player2_id IS NOT NULL
    ) q
    WHERE loser_id IS NOT NULL
    ORDER BY loser_id, match_order ASC
  LOOP
    IF NOT (v_rec.loser_id = ANY(v_placed_ids)) AND v_place_cursor <= 8 THEN
      INSERT INTO tmp_tournament_placements (player_id, place)
      VALUES (v_rec.loser_id, v_place_cursor);
      v_placed_ids := array_append(v_placed_ids, v_rec.loser_id);
      v_place_cursor := v_place_cursor + 1;
    END IF;
  END LOOP;

  -- Resto de participantes inscritos que jugaron en rondas previas (9no+)
  v_place_cursor := 9;
  FOR v_rec IN
    SELECT player_id
    FROM public.event_entries
    WHERE event_id = p_event_id
      AND NOT (player_id = ANY(v_placed_ids))
  LOOP
    INSERT INTO tmp_tournament_placements (player_id, place)
    VALUES (v_rec.player_id, v_place_cursor);
    v_placed_ids := array_append(v_placed_ids, v_rec.player_id);
    v_place_cursor := v_place_cursor + 1;
  END LOOP;

  -- Procesar acreditación para cada jugador clasificado
  FOR v_rec IN
    SELECT tp.player_id, tp.place
    FROM tmp_tournament_placements tp
    ORDER BY tp.place ASC
  LOOP
    -- Buscar porcentaje configurado en `prize_tiers` para esta posición
    SELECT COALESCE((tier->>'percent')::NUMERIC, 0)
    INTO v_percent
    FROM jsonb_array_elements(COALESCE(v_event.prize_tiers, '[]'::jsonb)) AS tier
    WHERE (tier->>'place')::INTEGER = v_rec.place
    LIMIT 1;

    v_percent := COALESCE(v_percent, 0);
    v_coin_reward := FLOOR(v_total_pot * (v_percent / 100.0))::INTEGER;

    -- XP según tramo
    IF v_rec.place = 1 THEN
      v_xp_reward := COALESCE(v_event.reward_xp_winner, 300);
      v_item_reward := v_event.reward_store_item_id;
    ELSIF v_rec.place IN (2, 3, 4) THEN
      v_xp_reward := COALESCE(v_event.reward_xp_podium, 150);
      v_item_reward := NULL;
    ELSE
      v_xp_reward := COALESCE(v_event.reward_xp_participation, 40);
      v_item_reward := NULL;
    END IF;

    -- Actualizar perfil (monedas, XP, trofeos y podios)
    UPDATE public.profiles
    SET
      coins = coins + v_coin_reward,
      xp = COALESCE(xp, 0) + v_xp_reward,
      tournaments_won = COALESCE(tournaments_won, 0) + CASE WHEN v_rec.place = 1 THEN 1 ELSE 0 END,
      tournament_podiums = COALESCE(tournament_podiums, 0) + CASE WHEN v_rec.place <= 4 THEN 1 ELSE 0 END,
      tournaments_played = COALESCE(tournaments_played, 0) + 1
    WHERE id = v_rec.player_id;

    -- Registrar en wallet_transactions si recibió monedas
    IF v_coin_reward > 0 THEN
      INSERT INTO public.wallet_transactions (player_id, amount, reason, reference_id)
      VALUES (
        v_rec.player_id,
        v_coin_reward,
        format('tournament_prize_place_%s', v_rec.place),
        p_event_id
      );
    END IF;

    -- Entregar cosmético exclusivo al campeón si fue configurado
    IF v_item_reward IS NOT NULL THEN
      INSERT INTO public.player_inventory (player_id, item_id)
      VALUES (v_rec.player_id, v_item_reward)
      ON CONFLICT (player_id, item_id) DO NOTHING;
    END IF;

    -- Persistir resultado oficial en `event_entries` (o insertar si vino de llave especial)
    UPDATE public.event_entries
    SET
      final_placement = v_rec.place,
      coins_awarded = v_coin_reward,
      xp_awarded = v_xp_reward,
      item_awarded_id = v_item_reward
    WHERE event_id = p_event_id AND player_id = v_rec.player_id;

    v_payouts := v_payouts || jsonb_build_array(
      jsonb_build_object(
        'player_id', v_rec.player_id,
        'place', v_rec.place,
        'coins_awarded', v_coin_reward,
        'xp_awarded', v_xp_reward,
        'item_awarded_id', v_item_reward
      )
    );
  END LOOP;

  -- Marcar torneo como completado y premiado
  UPDATE public.events
  SET
    status = 'completed',
    rewards_distributed_at = NOW(),
    current_prize_coins = v_total_pot
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'total_pot', v_total_pot,
    'champion_id', v_champion_id,
    'payouts', v_payouts
  );
END;
$$;
