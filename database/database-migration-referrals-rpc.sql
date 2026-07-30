-- ============================================================
-- MIGRACIÓN: SISTEMA DE REFERIDOS "INVITAR AMIGO"
-- ============================================================

SET search_path TO public;

-- 1. RPC: REGISTRAR REFERIDO EN CHAMPIONSHIP
CREATE OR REPLACE FUNCTION public.register_championship_referral(
  p_event_id UUID,
  p_referrer_username TEXT,
  p_referred_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_clean_username TEXT;
BEGIN
  -- Limpiar el username (remover '@' si fue incluido)
  v_clean_username := LOWER(REPLACE(p_referrer_username, '@', ''));

  -- Buscar al referente por su username (case insensitive)
  SELECT id INTO v_referrer_id FROM public.profiles
    WHERE LOWER(username) = v_clean_username;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'REFERRER_NOT_FOUND');
  END IF;

  -- No permitir auto-referidos
  IF v_referrer_id = p_referred_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'CANNOT_REFER_SELF');
  END IF;

  -- Insertar vínculo en la tabla championship_referrals
  INSERT INTO public.championship_referrals (
    event_id, referrer_id, referred_id, referred_ads_count, bonus_awarded
  ) VALUES (
    p_event_id, v_referrer_id, p_referred_id, 0, FALSE
  ) ON CONFLICT (event_id, referrer_id, referred_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'referred_id', p_referred_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. RPC: OBTENER ESTADÍSTICAS Y LISTA DE REFERIDOS DEL USUARIO
CREATE OR REPLACE FUNCTION public.get_user_referral_stats(
  p_user_id UUID,
  p_event_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_total_referrals INTEGER := 0;
  v_qualified_referrals INTEGER := 0;
  v_bonus_points INTEGER := 0;
  v_list JSONB := '[]'::jsonb;
BEGIN
  -- Contar totales
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE bonus_awarded = TRUE),
    COALESCE(SUM(CASE WHEN bonus_awarded = TRUE THEN 200 ELSE 0 END), 0)
  INTO v_total_referrals, v_qualified_referrals, v_bonus_points
  FROM public.championship_referrals
  WHERE event_id = p_event_id AND referrer_id = p_user_id;

  -- Obtener lista detallada de amigos referidos
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', cr.id,
      'referred_username', p.username,
      'avatar_url', p.avatar_url,
      'ads_count', cr.referred_ads_count,
      'bonus_awarded', cr.bonus_awarded,
      'created_at', cr.created_at
    ) ORDER BY cr.created_at DESC
  ), '[]'::jsonb) INTO v_list
  FROM public.championship_referrals cr
  JOIN public.profiles p ON p.id = cr.referred_id
  WHERE cr.event_id = p_event_id AND cr.referrer_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_referrals', v_total_referrals,
    'qualified_referrals', v_qualified_referrals,
    'bonus_points', v_bonus_points,
    'referrals_list', v_list
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
