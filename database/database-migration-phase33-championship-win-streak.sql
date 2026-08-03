-- ============================================================
-- MIGRACIÓN PHASE 33: WIN STREAK MULTIPLIER (🔥 x2) PARA CHAMPIONSHIP
-- Multiplica por 2 los puntos si el jugador tiene racha de victorias (win_streak >= 2)
-- ============================================================

SET search_path TO public;

CREATE OR REPLACE FUNCTION public.record_championship_ad_activity(
  p_user_id UUID,
  p_event_id UUID,
  p_type TEXT  -- 'view' | 'click'
) RETURNS JSONB SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event RECORD;
  v_participant RECORD;
  v_user_profile RECORD;
  v_points_to_add INTEGER;
  v_multiplier INTEGER := 1;
  v_win_streak INTEGER := 0;
  v_new_global_views BIGINT;
  v_new_prize NUMERIC;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- 1. Obtener evento y verificar que es un championship
  SELECT * INTO v_event FROM public.events
    WHERE id = p_event_id AND is_championship = TRUE
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHAMPIONSHIP_NOT_FOUND');
  END IF;

  -- 2. Obtener o crear participante
  INSERT INTO public.championship_participants (event_id, user_id)
    VALUES (p_event_id, p_user_id)
    ON CONFLICT (event_id, user_id) DO NOTHING;

  SELECT * INTO v_participant FROM public.championship_participants
    WHERE event_id = p_event_id AND user_id = p_user_id
    FOR UPDATE;

  IF v_participant.points_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'POINTS_FROZEN');
  END IF;

  -- 3. Consultar racha de victorias del perfil del usuario
  SELECT win_streak INTO v_win_streak FROM public.profiles WHERE id = p_user_id;
  IF v_win_streak IS NULL THEN
    v_win_streak := 0;
  END IF;

  IF v_win_streak >= 2 THEN
    v_multiplier := 2;
  END IF;

  -- 4. Resetear contador diario si cambió el día
  IF v_participant.last_ad_date IS NULL OR v_participant.last_ad_date < v_today THEN
    UPDATE public.championship_participants
      SET ads_today = 0, last_ad_date = v_today
      WHERE id = v_participant.id;
    v_participant.ads_today := 0;
  END IF;

  -- 5. Verificar tope diario
  IF v_participant.ads_today >= v_event.daily_ad_cap THEN
    RETURN jsonb_build_object('success', false, 'error', 'DAILY_CAP_REACHED',
      'ads_today', v_participant.ads_today, 'daily_cap', v_event.daily_ad_cap);
  END IF;

  -- 6. Calcular puntos según tipo y multiplicador de racha
  IF p_type = 'click' THEN
    v_points_to_add := 3 * v_multiplier;
  ELSE
    v_points_to_add := 1 * v_multiplier;
  END IF;

  -- 7. Actualizar participante
  UPDATE public.championship_participants SET
    points = points + v_points_to_add,
    ads_today = ads_today + 1,
    ads_watched = CASE WHEN p_type = 'view' THEN ads_watched + 1 ELSE ads_watched END,
    ad_clicks = CASE WHEN p_type = 'click' THEN ad_clicks + 1 ELSE ad_clicks END,
    last_ad_date = v_today,
    updated_at = NOW()
  WHERE id = v_participant.id;

  -- 8. Incrementar vistas globales del evento
  UPDATE public.events SET
    global_ad_views = global_ad_views + 1,
    updated_at = NOW()
  WHERE id = p_event_id
  RETURNING global_ad_views INTO v_new_global_views;

  -- 9. Recalcular pozo
  v_new_prize := LEAST(
    v_event.base_prize_usd + (v_new_global_views / v_event.views_per_prize_step) * v_event.prize_step_usd,
    v_event.max_prize_usd
  );

  UPDATE public.events SET current_prize_usd = v_new_prize WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'points_added', v_points_to_add,
    'win_streak', v_win_streak,
    'streak_multiplier', v_multiplier,
    'ads_today', v_participant.ads_today + 1,
    'daily_cap', v_event.daily_ad_cap,
    'new_total_points', v_participant.points + v_points_to_add,
    'current_prize_usd', v_new_prize
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.record_championship_ad_activity(UUID, UUID, TEXT) TO authenticated, anon;
