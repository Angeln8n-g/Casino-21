-- database-migration-events-phase4.sql
-- Fase 4: Sistema de Economía y Recompensas (Wallet)

SET search_path TO public;

-- 1. AÑADIR COLUMNA DE MONEDAS A PERFILES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='coins') THEN
        ALTER TABLE public.profiles ADD COLUMN coins INTEGER NOT NULL DEFAULT 1000;
    END IF;
END $$;

-- 2. TABLA DE TRANSACCIONES DEL WALLET (Para historial y auditoría)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positivo (Ingreso) o Negativo (Gasto)
  reason TEXT NOT NULL, -- Ej: 'tournament_entry', 'tournament_prize', 'daily_bonus'
  reference_id UUID, -- Referencia a tabla foránea (ej: event_id) - no lo hacemos foreign key estricta para más flexibilidad
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wallet_transactions' AND policyname='wt_select_self') THEN
    CREATE POLICY "wt_select_self" ON public.wallet_transactions FOR SELECT USING (auth.uid() = player_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wallet_transactions' AND policyname='wt_service') THEN
    CREATE POLICY "wt_service" ON public.wallet_transactions FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 3. FUNCIÓN RPC PARA INSCRIPCIÓN SEGURA (Transacción atómica)
-- Resta el saldo y añade la inscripción en la misma transacción. Si algo falla, se hace rollback.
CREATE OR REPLACE FUNCTION public.join_event(event_id_param UUID, player_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_fee INTEGER;
  v_coins INTEGER;
  v_status TEXT;
  v_participants_count INTEGER;
  v_max_participants INTEGER;
  v_already_enrolled BOOLEAN;
BEGIN
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

  -- 5. Obtener saldo actual
  SELECT coins INTO v_coins FROM public.profiles WHERE id = player_id_param;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCIÓN RPC PARA ENTREGAR PREMIO (Llamada desde el backend/admin)
CREATE OR REPLACE FUNCTION public.award_tournament_prize(event_id_param UUID, winner_id_param UUID, prize_amount INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  IF prize_amount > 0 THEN
    -- Añadir saldo
    UPDATE public.profiles SET coins = coins + prize_amount WHERE id = winner_id_param;
    
    -- Registrar transacción
    INSERT INTO public.wallet_transactions (player_id, amount, reason, reference_id) 
    VALUES (winner_id_param, prize_amount, 'tournament_prize', event_id_param);
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
