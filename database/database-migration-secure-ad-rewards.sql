-- ============================================================
-- MIGRACIÓN: Reclamo seguro de monedas por anuncios recompensados
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_rewarded_ad_coins(p_reward_amount INT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_on_cooldown BOOLEAN;
  v_config_id UUID;
  v_new_coins INT;
BEGIN
  -- 1. Verificar autenticación del usuario
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- 2. Validar cantidad de recompensa (máximo 1000 monedas por anuncio)
  IF p_reward_amount IS NULL OR p_reward_amount <= 0 OR p_reward_amount > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
  END IF;

  -- 3. Verificar Cooldown de 55 segundos contra abusos de scripts (comprobando logs con rpc_claimed = true)
  SELECT EXISTS (
    SELECT 1 FROM public.ad_logs
    WHERE user_id = v_user_id
      AND ad_type = 'rewarded'
      AND event_type = 'complete'
      AND (metadata->>'rpc_claimed')::boolean = true
      AND created_at > NOW() - INTERVAL '55 seconds'
  ) INTO v_on_cooldown;

  IF v_on_cooldown THEN
    RETURN jsonb_build_object('success', false, 'error', 'ON_COOLDOWN');
  END IF;

  -- 4. Obtener la configuración de anuncio recompensado activa para asociar el log
  SELECT id INTO v_config_id 
  FROM public.ad_configurations
  WHERE ad_type = 'rewarded' AND enabled = true
  ORDER BY priority ASC 
  LIMIT 1;

  -- 5. Actualizar el saldo de monedas en la tabla profiles
  UPDATE public.profiles
  SET coins = coins + p_reward_amount
  WHERE id = v_user_id
  RETURNING coins INTO v_new_coins;

  -- 6. Insertar el log de finalización en el servidor de forma atómica
  INSERT INTO public.ad_logs (config_id, ad_type, event_type, user_id, metadata)
  VALUES (
    v_config_id,
    'rewarded',
    'complete',
    v_user_id,
    jsonb_build_object('coins_rewarded', p_reward_amount, 'rpc_claimed', true)
  );

  RETURN jsonb_build_object('success', true, 'new_coins', v_new_coins);
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos de ejecución para usuarios autenticados
GRANT EXECUTE ON FUNCTION public.claim_rewarded_ad_coins(INT) TO authenticated;
