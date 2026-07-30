-- ============================================================
-- MIGRACIÓN PHASE 31: SECURITY DEFINER PARA CHAMPIONSHIP AD ACTIVITY
-- Permite que usuarios autenticados y anónimos puedan registrar vistas/clics de ads
-- ============================================================

SET search_path TO public;

-- Grant RLS Insert/Update policies for championship_participants
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='championship_participants' AND policyname='cp_user_own_insert') THEN
    CREATE POLICY "cp_user_own_insert" ON public.championship_participants
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='championship_participants' AND policyname='cp_user_own_update') THEN
    CREATE POLICY "cp_user_own_update" ON public.championship_participants
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Update record_championship_ad_activity with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.record_championship_ad_activity(
  p_user_id UUID,
  p_event_id UUID,
  p_type TEXT  -- 'view' | 'click'
) RETURNS JSONB SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event RECORD;
  v_participant RECORD;
  v_points_to_add INTEGER;
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

  -- 6. Calcular puntos según tipo
  IF p_type = 'click' THEN
    v_points_to_add := 3;
  ELSE
    v_points_to_add := 1;
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
    'ads_today', v_participant.ads_today + 1,
    'daily_cap', v_event.daily_ad_cap,
    'new_total_points', v_participant.points + v_points_to_add,
    'current_prize_usd', v_new_prize
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.record_championship_ad_activity(UUID, UUID, TEXT) TO authenticated, anon;
