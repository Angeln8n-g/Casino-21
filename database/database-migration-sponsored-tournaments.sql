-- ============================================================
-- MIGRACIÓN: Torneos Semánticos Patrocinados & Reclamo de Premios
-- ============================================================

SET search_path TO public;

-- 1. EXTENSIÓN DE LA TABLA EVENTS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='is_sponsored') THEN
    ALTER TABLE public.events ADD COLUMN is_sponsored BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='sponsor_name') THEN
    ALTER TABLE public.events ADD COLUMN sponsor_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='sponsor_logo_url') THEN
    ALTER TABLE public.events ADD COLUMN sponsor_logo_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='sponsor_banner_url') THEN
    ALTER TABLE public.events ADD COLUMN sponsor_banner_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='brand_theme') THEN
    ALTER TABLE public.events ADD COLUMN brand_theme JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='max_participants') THEN
    ALTER TABLE public.events ADD COLUMN max_participants INTEGER DEFAULT 500;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='entry_fee_coins') THEN
    ALTER TABLE public.events ADD COLUMN entry_fee_coins INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cash_prize_pool') THEN
    ALTER TABLE public.events ADD COLUMN cash_prize_pool NUMERIC DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='prize_distribution') THEN
    ALTER TABLE public.events ADD COLUMN prize_distribution JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='sponsor_ad_campaign_ids') THEN
    ALTER TABLE public.events ADD COLUMN sponsor_ad_campaign_ids UUID[] DEFAULT '{}';
  END IF;
END $$;

-- 2. TABLA DE RECLAMO DE PREMIOS BANCARIOS (7 DÍAS CADUCIDAD)
CREATE TABLE IF NOT EXISTS public.tournament_prize_claims (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank_position           INTEGER NOT NULL,
  amount_usd              NUMERIC NOT NULL,
  full_name               TEXT,
  id_card_number          TEXT,
  phone_number            TEXT,
  bank_name               TEXT,
  account_number          TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending_claim' CHECK (status IN ('pending_claim', 'claim_submitted', 'paid', 'expired')),
  verification_code_hash  TEXT,
  sms_verified            BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_at              TIMESTAMPTZ,
  paid_at                 TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_event_rank UNIQUE (event_id, rank_position)
);

ALTER TABLE public.tournament_prize_claims ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para Claims
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tournament_prize_claims' AND policyname='tpc_user_own') THEN
    CREATE POLICY "tpc_user_own" ON public.tournament_prize_claims
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tournament_prize_claims' AND policyname='tpc_user_update') THEN
    CREATE POLICY "tpc_user_update" ON public.tournament_prize_claims
      FOR UPDATE USING (auth.uid() = user_id AND status = 'pending_claim');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tournament_prize_claims' AND policyname='tpc_admin_all') THEN
    CREATE POLICY "tpc_admin_all" ON public.tournament_prize_claims
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

-- Index para agilizar consultas admin de pendientes
CREATE INDEX IF NOT EXISTS idx_tournament_prize_claims_status_expires
  ON public.tournament_prize_claims (status, expires_at);

-- 3. TABLA DE MÉTRICAS / METRICAS DE PATROCINADOR
CREATE TABLE IF NOT EXISTS public.sponsor_analytics_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID REFERENCES public.events(id) ON DELETE SET NULL,
  sponsor_name      TEXT NOT NULL,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type        TEXT NOT NULL CHECK (event_type IN ('ad_impression', 'ad_watch_complete', 'match_exposure', 'banner_click')),
  duration_seconds  INTEGER DEFAULT 0,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sponsor_analytics_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sponsor_analytics_logs' AND policyname='sal_insert_authenticated') THEN
    CREATE POLICY "sal_insert_authenticated" ON public.sponsor_analytics_logs
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sponsor_analytics_logs' AND policyname='sal_admin_all') THEN
    CREATE POLICY "sal_admin_all" ON public.sponsor_analytics_logs
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sponsor_analytics_logs_event_sponsor
  ON public.sponsor_analytics_logs (event_id, sponsor_name);

-- 4. RPC ATÓMICA DE INSCRIPCIÓN A TORNEO PATROCINADO (CON VALIDACIÓN DE CUPOS Y MONEDAS)
CREATE OR REPLACE FUNCTION public.register_sponsored_tournament(
  p_event_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_coins INTEGER;
  v_already_registered BOOLEAN;
BEGIN
  -- Obtener evento
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'TORNEO_NO_ENCONTRADO');
  END IF;

  -- Verificar si el torneo está en status válido
  IF v_event.status NOT IN ('upcoming', 'live') THEN
    RETURN jsonb_build_object('success', false, 'error', 'TORNEO_NO_ACTIVO');
  END IF;

  -- Verificar cupos
  IF v_event.participants_count >= v_event.max_participants THEN
    RETURN jsonb_build_object('success', false, 'error', 'CUPOS_LLENOS');
  END IF;

  -- Verificar si ya está inscrito
  SELECT EXISTS(
    SELECT 1 FROM public.event_participants 
    WHERE event_id = p_event_id AND user_id = p_user_id
  ) INTO v_already_registered;

  IF v_already_registered THEN
    RETURN jsonb_build_object('success', false, 'error', 'YA_INSCRITO');
  END IF;

  -- Verificar saldo de monedas del usuario
  SELECT coins INTO v_coins FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_coins IS NULL OR v_coins < v_event.entry_fee_coins THEN
    RETURN jsonb_build_object('success', false, 'error', 'MONEDAS_INSUFICIENTES');
  END IF;

  -- Descontar monedas
  UPDATE public.profiles
  SET coins = coins - v_event.entry_fee_coins
  WHERE id = p_user_id;

  -- Insertar participante e incrementar contador
  INSERT INTO public.event_participants (event_id, user_id, status)
  VALUES (p_event_id, p_user_id, 'registered')
  ON CONFLICT DO NOTHING;

  UPDATE public.events
  SET participants_count = participants_count + 1,
      updated_at = NOW()
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true, 
    'remaining_coins', v_coins - v_event.entry_fee_coins,
    'participants_count', v_event.participants_count + 1,
    'max_participants', v_event.max_participants
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
