-- ============================================================
-- MIGRACIÓN: KASINO21 CHAMPIONSHIP (Liga Patrocinada de Ads)
-- Sistema de liga de 7 días con pozo acumulable + Final de 32
-- ============================================================

SET search_path TO public;

-- ═══════════════════════════════════════════════════════════════
-- 1. EXTENSIÓN DE LA TABLA EVENTS (Columnas Championship)
-- ═══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='is_championship') THEN
    ALTER TABLE public.events ADD COLUMN is_championship BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='championship_phase') THEN
    ALTER TABLE public.events ADD COLUMN championship_phase TEXT DEFAULT 'league'
      CHECK (championship_phase IN ('league', 'cut', 'final', 'completed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='base_prize_usd') THEN
    ALTER TABLE public.events ADD COLUMN base_prize_usd NUMERIC NOT NULL DEFAULT 100;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='current_prize_usd') THEN
    ALTER TABLE public.events ADD COLUMN current_prize_usd NUMERIC NOT NULL DEFAULT 100;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='max_prize_usd') THEN
    ALTER TABLE public.events ADD COLUMN max_prize_usd NUMERIC NOT NULL DEFAULT 5000;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='global_ad_views') THEN
    ALTER TABLE public.events ADD COLUMN global_ad_views BIGINT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='views_per_prize_step') THEN
    ALTER TABLE public.events ADD COLUMN views_per_prize_step INTEGER NOT NULL DEFAULT 1000;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='prize_step_usd') THEN
    ALTER TABLE public.events ADD COLUMN prize_step_usd NUMERIC NOT NULL DEFAULT 10;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='daily_ad_cap') THEN
    ALTER TABLE public.events ADD COLUMN daily_ad_cap INTEGER NOT NULL DEFAULT 300;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='qualified_count') THEN
    ALTER TABLE public.events ADD COLUMN qualified_count INTEGER NOT NULL DEFAULT 32;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='final_datetime') THEN
    ALTER TABLE public.events ADD COLUMN final_datetime TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='is_final_paused') THEN
    ALTER TABLE public.events ADD COLUMN is_final_paused BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- Index para buscar championships activos rápidamente
CREATE INDEX IF NOT EXISTS idx_events_championship_phase
  ON public.events (is_championship, championship_phase)
  WHERE is_championship = TRUE;


-- ═══════════════════════════════════════════════════════════════
-- 2. TABLA: CHAMPIONSHIP PARTICIPANTS (Puntos, Ads, KYC)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.championship_participants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Puntuación
  points            INTEGER NOT NULL DEFAULT 0,
  ads_watched       INTEGER NOT NULL DEFAULT 0,
  ad_clicks         INTEGER NOT NULL DEFAULT 0,
  referrals_count   INTEGER NOT NULL DEFAULT 0,
  
  -- Control diario anti-trampa
  ads_today         INTEGER NOT NULL DEFAULT 0,
  last_ad_date      DATE,
  
  -- Anti-fraude: congelar puntos de un usuario sospechoso
  points_frozen     BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Ranking
  rank_position     INTEGER,
  is_qualified      BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- KYC (verificación de identidad para finalistas)
  kyc_status        TEXT NOT NULL DEFAULT 'not_required'
                    CHECK (kyc_status IN ('not_required', 'pending', 'submitted', 'approved', 'rejected')),
  kyc_id_url        TEXT,
  kyc_selfie_url    TEXT,
  kyc_reject_reason TEXT,
  kyc_submitted_at  TIMESTAMPTZ,
  kyc_reviewed_at   TIMESTAMPTZ,
  kyc_reviewer_id   UUID REFERENCES public.profiles(id),
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_championship_participant UNIQUE (event_id, user_id)
);

ALTER TABLE public.championship_participants ENABLE ROW LEVEL SECURITY;

-- RLS: El usuario puede ver su propia participación
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='championship_participants' AND policyname='cp_user_own_select') THEN
    CREATE POLICY "cp_user_own_select" ON public.championship_participants
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- RLS: Lectura pública del ranking (sin datos KYC sensibles)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='championship_participants' AND policyname='cp_public_ranking') THEN
    CREATE POLICY "cp_public_ranking" ON public.championship_participants
      FOR SELECT USING (TRUE);
  END IF;

  -- RLS: Admin acceso total
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='championship_participants' AND policyname='cp_admin_all') THEN
    CREATE POLICY "cp_admin_all" ON public.championship_participants
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cp_event_points 
  ON public.championship_participants (event_id, points DESC);
CREATE INDEX IF NOT EXISTS idx_cp_event_qualified 
  ON public.championship_participants (event_id, is_qualified) WHERE is_qualified = TRUE;
CREATE INDEX IF NOT EXISTS idx_cp_user 
  ON public.championship_participants (user_id);


-- ═══════════════════════════════════════════════════════════════
-- 3. TABLA: CHAMPIONSHIP REFERRALS (Seguimiento de invitados)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.championship_referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  referrer_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_ads_count INTEGER NOT NULL DEFAULT 0,
  bonus_awarded     BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE cuando llega a 100 ads
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_championship_referral UNIQUE (event_id, referrer_id, referred_id)
);

ALTER TABLE public.championship_referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='championship_referrals' AND policyname='cr_user_own') THEN
    CREATE POLICY "cr_user_own" ON public.championship_referrals
      FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='championship_referrals' AND policyname='cr_admin_all') THEN
    CREATE POLICY "cr_admin_all" ON public.championship_referrals
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cr_event_referrer 
  ON public.championship_referrals (event_id, referrer_id);


-- ═══════════════════════════════════════════════════════════════
-- 4. TABLA: CHAMPIONSHIP ADMIN AUDIT LOG
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.championship_admin_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  admin_user_id   UUID NOT NULL REFERENCES public.profiles(id),
  action          TEXT NOT NULL,
  reason          TEXT,
  target_user_id  UUID REFERENCES public.profiles(id),
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.championship_admin_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='championship_admin_audit_log' AND policyname='caal_admin_all') THEN
    CREATE POLICY "caal_admin_all" ON public.championship_admin_audit_log
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_caal_event 
  ON public.championship_admin_audit_log (event_id, created_at DESC);


-- ═══════════════════════════════════════════════════════════════
-- 5. RPC: REGISTRAR ACTIVIDAD DE AD EN CHAMPIONSHIP
-- Incrementa puntos (1 por vista, 3 por clic), respeta tope diario,
-- actualiza vistas globales y recalcula el pozo.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.record_championship_ad_activity(
  p_user_id UUID,
  p_event_id UUID,
  p_type TEXT  -- 'view' | 'click'
) RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_participant RECORD;
  v_points_to_add INTEGER;
  v_new_global_views BIGINT;
  v_new_prize NUMERIC;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- 1. Obtener evento y verificar que es un championship en fase 'league'
  SELECT * INTO v_event FROM public.events
    WHERE id = p_event_id AND is_championship = TRUE
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHAMPIONSHIP_NOT_FOUND');
  END IF;

  IF v_event.championship_phase <> 'league' THEN
    RETURN jsonb_build_object('success', false, 'error', 'LEAGUE_NOT_ACTIVE');
  END IF;

  IF v_event.status NOT IN ('upcoming', 'live') THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHAMPIONSHIP_NOT_ACTIVE');
  END IF;

  -- 2. Obtener o crear participante
  INSERT INTO public.championship_participants (event_id, user_id)
    VALUES (p_event_id, p_user_id)
    ON CONFLICT (event_id, user_id) DO NOTHING;

  SELECT * INTO v_participant FROM public.championship_participants
    WHERE event_id = p_event_id AND user_id = p_user_id
    FOR UPDATE;

  -- 3. Verificar si está congelado
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

  -- 9. Recalcular pozo: base + (global_views / views_per_step) * prize_step, capped at max
  v_new_prize := LEAST(
    v_event.base_prize_usd + (v_new_global_views / v_event.views_per_prize_step) * v_event.prize_step_usd,
    v_event.max_prize_usd
  );

  UPDATE public.events SET current_prize_usd = v_new_prize WHERE id = p_event_id;

  -- 10. Actualizar referral si aplica (incrementar ads del referido)
  UPDATE public.championship_referrals SET
    referred_ads_count = referred_ads_count + 1
  WHERE event_id = p_event_id AND referred_id = p_user_id AND bonus_awarded = FALSE;

  -- 11. Verificar si algún referral alcanzó 100 ads → dar bonus de 200 pts
  UPDATE public.championship_participants AS cp SET
    points = cp.points + 200,
    referrals_count = cp.referrals_count + 1,
    updated_at = NOW()
  FROM public.championship_referrals AS cr
  WHERE cr.event_id = p_event_id
    AND cr.referred_id = p_user_id
    AND cr.referred_ads_count >= 100
    AND cr.bonus_awarded = FALSE
    AND cp.event_id = cr.event_id
    AND cp.user_id = cr.referrer_id;

  UPDATE public.championship_referrals SET bonus_awarded = TRUE
  WHERE event_id = p_event_id AND referred_id = p_user_id
    AND referred_ads_count >= 100 AND bonus_awarded = FALSE;

  RETURN jsonb_build_object(
    'success', true,
    'points_added', v_points_to_add,
    'ads_today', v_participant.ads_today + 1,
    'daily_cap', v_event.daily_ad_cap,
    'global_ad_views', v_new_global_views,
    'current_prize_usd', v_new_prize
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════
-- 6. RPC: CONGELAR LIGA Y SELECCIONAR TOP 32
-- Determina ranking, marca clasificados y cambia fase a 'cut'.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.freeze_championship_league(
  p_event_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_qualified_count INTEGER;
  v_total_participants INTEGER;
BEGIN
  SELECT * INTO v_event FROM public.events
    WHERE id = p_event_id AND is_championship = TRUE
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHAMPIONSHIP_NOT_FOUND');
  END IF;

  IF v_event.championship_phase <> 'league' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_FROZEN');
  END IF;

  v_qualified_count := v_event.qualified_count;

  -- 1. Asignar rank_position basado en puntos (desc), desempate por ads_watched (desc)
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY points DESC, ads_watched DESC, created_at ASC) AS rn
    FROM public.championship_participants
    WHERE event_id = p_event_id AND points_frozen = FALSE
  )
  UPDATE public.championship_participants cp SET
    rank_position = ranked.rn,
    is_qualified = (ranked.rn <= v_qualified_count),
    kyc_status = CASE WHEN ranked.rn <= v_qualified_count THEN 'pending' ELSE 'not_required' END,
    updated_at = NOW()
  FROM ranked
  WHERE cp.id = ranked.id;

  -- 2. Cambiar fase del evento
  UPDATE public.events SET
    championship_phase = 'cut',
    status = 'live',
    updated_at = NOW()
  WHERE id = p_event_id;

  -- 3. Contar total
  SELECT COUNT(*) INTO v_total_participants
    FROM public.championship_participants WHERE event_id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_participants', v_total_participants,
    'qualified_count', v_qualified_count,
    'current_prize_usd', v_event.current_prize_usd
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════
-- 7. RPC: SUBMIT KYC (Verificación de Identidad)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.submit_championship_kyc(
  p_user_id UUID,
  p_event_id UUID,
  p_id_url TEXT,
  p_selfie_url TEXT
) RETURNS JSONB AS $$
DECLARE
  v_participant RECORD;
BEGIN
  SELECT * INTO v_participant FROM public.championship_participants
    WHERE event_id = p_event_id AND user_id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_PARTICIPANT');
  END IF;

  IF NOT v_participant.is_qualified THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_QUALIFIED');
  END IF;

  IF v_participant.kyc_status NOT IN ('pending', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'KYC_ALREADY_PROCESSED');
  END IF;

  UPDATE public.championship_participants SET
    kyc_status = 'submitted',
    kyc_id_url = p_id_url,
    kyc_selfie_url = p_selfie_url,
    kyc_submitted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_participant.id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════
-- 8. RPC: CALCULAR Y GENERAR DISTRIBUCIÓN DE PREMIOS
-- Genera los registros en tournament_prize_claims para los 32.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.calculate_championship_prize_distribution(
  p_event_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_pool NUMERIC;
  v_participant RECORD;
  v_amount NUMERIC;
  v_claims_created INTEGER := 0;
BEGIN
  SELECT * INTO v_event FROM public.events
    WHERE id = p_event_id AND is_championship = TRUE
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHAMPIONSHIP_NOT_FOUND');
  END IF;

  v_pool := v_event.current_prize_usd;

  -- Iterar sobre los 32 clasificados con su rank_position final (del bracket)
  FOR v_participant IN
    SELECT cp.user_id, cp.rank_position
    FROM public.championship_participants cp
    WHERE cp.event_id = p_event_id AND cp.is_qualified = TRUE
    ORDER BY cp.rank_position ASC
  LOOP
    -- Calcular monto según posición
    v_amount := CASE v_participant.rank_position
      WHEN 1 THEN ROUND(v_pool * 0.40, 2)    -- Campeón: 40%
      WHEN 2 THEN ROUND(v_pool * 0.20, 2)    -- Subcampeón: 20%
      WHEN 3 THEN ROUND(v_pool * 0.10, 2)    -- Semifinalista: 10%
      WHEN 4 THEN ROUND(v_pool * 0.10, 2)    -- Semifinalista: 10%
      WHEN 5 THEN ROUND(v_pool * 0.05, 2)    -- Cuartos: 5%
      WHEN 6 THEN ROUND(v_pool * 0.05, 2)
      WHEN 7 THEN ROUND(v_pool * 0.05, 2)
      WHEN 8 THEN ROUND(v_pool * 0.05, 2)
      ELSE
        CASE
          WHEN v_participant.rank_position BETWEEN 9 AND 16 THEN 15.00   -- Octavos: $15
          WHEN v_participant.rank_position BETWEEN 17 AND 32 THEN 5.00   -- 32avos: $5
          ELSE 0
        END
    END;

    IF v_amount > 0 THEN
      INSERT INTO public.tournament_prize_claims (
        event_id, user_id, rank_position, amount_usd, status, expires_at
      ) VALUES (
        p_event_id, v_participant.user_id, v_participant.rank_position,
        v_amount, 'pending_claim', NOW() + INTERVAL '7 days'
      ) ON CONFLICT (event_id, rank_position) DO NOTHING;

      v_claims_created := v_claims_created + 1;
    END IF;
  END LOOP;

  -- Marcar championship como completado
  UPDATE public.events SET
    championship_phase = 'completed',
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'claims_created', v_claims_created,
    'total_pool', v_pool
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════
-- 9. RPC: DESCALIFICAR PARTICIPANTE + PROMOVER SIGUIENTE
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.disqualify_championship_participant(
  p_event_id UUID,
  p_user_id UUID,
  p_reason TEXT,
  p_admin_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_disqualified_rank INTEGER;
  v_next_user_id UUID;
  v_qualified_count INTEGER;
BEGIN
  -- Obtener el rank del descalificado
  SELECT rank_position INTO v_disqualified_rank
    FROM public.championship_participants
    WHERE event_id = p_event_id AND user_id = p_user_id AND is_qualified = TRUE;

  IF v_disqualified_rank IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_QUALIFIED_PARTICIPANT');
  END IF;

  -- Descalificar
  UPDATE public.championship_participants SET
    is_qualified = FALSE,
    kyc_status = 'rejected',
    kyc_reject_reason = p_reason,
    points_frozen = TRUE,
    updated_at = NOW()
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- Obtener qualified_count del evento
  SELECT qualified_count INTO v_qualified_count FROM public.events WHERE id = p_event_id;

  -- Promover al siguiente no calificado (rank #33)
  SELECT user_id INTO v_next_user_id
    FROM public.championship_participants
    WHERE event_id = p_event_id
      AND is_qualified = FALSE
      AND points_frozen = FALSE
      AND rank_position = v_qualified_count + 1;

  IF v_next_user_id IS NOT NULL THEN
    UPDATE public.championship_participants SET
      is_qualified = TRUE,
      rank_position = v_disqualified_rank,
      kyc_status = 'pending',
      updated_at = NOW()
    WHERE event_id = p_event_id AND user_id = v_next_user_id;

    -- Re-rank los demás
    UPDATE public.championship_participants SET
      rank_position = rank_position - 1
    WHERE event_id = p_event_id
      AND is_qualified = FALSE
      AND points_frozen = FALSE
      AND rank_position > v_qualified_count + 1;
  END IF;

  -- Log de auditoría
  INSERT INTO public.championship_admin_audit_log (event_id, admin_user_id, action, reason, target_user_id)
    VALUES (p_event_id, p_admin_id, 'disqualify', p_reason, p_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'disqualified_user', p_user_id,
    'promoted_user', v_next_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════
-- 10. RPC: OBTENER ANALYTICS DEL CHAMPIONSHIP (para Sponsor)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_championship_analytics(
  p_event_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_total_views BIGINT;
  v_total_clicks BIGINT;
  v_unique_users BIGINT;
  v_total_referrals BIGINT;
  v_avg_ads_per_user NUMERIC;
  v_total_impressions BIGINT;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id AND is_championship = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHAMPIONSHIP_NOT_FOUND');
  END IF;

  SELECT
    COALESCE(SUM(ads_watched), 0),
    COALESCE(SUM(ad_clicks), 0),
    COUNT(*),
    COALESCE(SUM(referrals_count), 0),
    CASE WHEN COUNT(*) > 0 THEN ROUND(AVG(ads_watched), 1) ELSE 0 END
  INTO v_total_views, v_total_clicks, v_unique_users, v_total_referrals, v_avg_ads_per_user
  FROM public.championship_participants
  WHERE event_id = p_event_id;

  -- Total impressions from sponsor analytics logs
  SELECT COALESCE(COUNT(*), 0) INTO v_total_impressions
    FROM public.sponsor_analytics_logs
    WHERE event_id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_ad_views', v_total_views,
    'total_ad_clicks', v_total_clicks,
    'ctr', CASE WHEN v_total_views > 0
             THEN ROUND((v_total_clicks::NUMERIC / v_total_views) * 100, 2)
             ELSE 0 END,
    'unique_users', v_unique_users,
    'total_referrals', v_total_referrals,
    'avg_ads_per_user', v_avg_ads_per_user,
    'total_sponsor_impressions', v_total_impressions,
    'current_prize_usd', v_event.current_prize_usd,
    'global_ad_views', v_event.global_ad_views,
    'sponsor_name', v_event.sponsor_name,
    'championship_phase', v_event.championship_phase
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════
-- 11. VISTA: LEADERBOARD PÚBLICO (Top 1000, sin datos KYC)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.championship_leaderboard AS
  SELECT
    cp.event_id,
    cp.user_id,
    p.username,
    p.avatar_url,
    p.elo,
    cp.points,
    cp.ads_watched,
    cp.ad_clicks,
    cp.referrals_count,
    cp.rank_position,
    cp.is_qualified,
    cp.ads_today,
    cp.points_frozen
  FROM public.championship_participants cp
  JOIN public.profiles p ON p.id = cp.user_id
  ORDER BY cp.points DESC, cp.ads_watched DESC, cp.created_at ASC;
