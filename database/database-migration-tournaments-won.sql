-- ========================================================================================
-- FASE: Estadísticas Adicionales (Torneos Ganados)
-- Descripción: Añade la columna 'tournaments_won' a la tabla profiles y actualiza 
-- el RPC 'award_tournament_prize' para incrementarla automáticamente al ganar un torneo.
-- ========================================================================================

-- 1. Añadir la columna si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tournaments_won') THEN
        ALTER TABLE public.profiles ADD COLUMN tournaments_won INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 2. Actualizar el RPC award_tournament_prize para que sume 1 a tournaments_won
CREATE OR REPLACE FUNCTION public.award_tournament_prize(event_id_param UUID, winner_id_param UUID, prize_amount INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  -- Incrementar el contador de torneos ganados independientemente del premio
  UPDATE public.profiles 
  SET tournaments_won = tournaments_won + 1 
  WHERE id = winner_id_param;

  -- Procesar el premio en monedas si existe
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
