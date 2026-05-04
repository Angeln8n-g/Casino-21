-- ============================================================
-- MIGRACIÓN: Optimización de Resultados de Partida (Atomicidad)
-- ============================================================

-- Función para procesar todo el resultado de una partida de forma atómica
-- Esto evita múltiples round-trips desde el backend y previene estados inconsistentes.

CREATE OR REPLACE FUNCTION process_match_results(
  p_room_id TEXT,
  p_game_mode TEXT,
  p_winner_id UUID,
  p_is_tournament BOOLEAN,
  p_players_data JSONB
)
RETURNS VOID AS $$
DECLARE
  v_player JSONB;
  v_player_id UUID;
  v_is_winner BOOLEAN;
  v_elo_change INTEGER;
  v_coins_earned INTEGER;
  v_xp_gained INTEGER;
  v_score INTEGER;
  v_name TEXT;
  v_metadata JSONB := '[]'::JSONB;
BEGIN
  -- 1. Iterar sobre los datos de los jugadores para aplicar cambios y construir metadata
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players_data)
  LOOP
    v_player_id := (v_player->>'id')::UUID;
    v_is_winner := (v_player->>'is_winner')::BOOLEAN;
    v_elo_change := (v_player->>'elo_change')::INTEGER;
    v_coins_earned := (v_player->>'coins_earned')::INTEGER;
    v_xp_gained := (v_player->>'xp_gained')::INTEGER;
    v_score := (v_player->>'score')::INTEGER;
    v_name := v_player->>'name';

    -- Actualizar perfil (monedas, elo, wins, losses)
    UPDATE profiles
    SET
      coins = coins + v_coins_earned,
      elo = elo + v_elo_change,
      wins = wins + CASE WHEN v_is_winner THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN v_is_winner THEN 0 ELSE 1 END
    WHERE id = v_player_id;

    -- Registrar transacción de monedas si ganó alguna
    IF v_coins_earned > 0 THEN
      INSERT INTO wallet_transactions (player_id, amount, reason)
      VALUES (v_player_id, v_coins_earned, 'Match Prize: ' || p_room_id);
    END IF;

    -- Otorgar XP usando la función existente
    PERFORM add_player_xp(v_player_id, v_xp_gained);

    -- Incrementar progreso de misiones usando la función existente
    -- Nota: si increment_quest_progress no fue volcada en un .sql previo, asumimos que existe en DB.
    PERFORM increment_quest_progress(v_player_id, 'play_match');
    IF v_is_winner THEN
      PERFORM increment_quest_progress(v_player_id, 'win_match');
    END IF;

    -- Agregar a metadata para el historial
    v_metadata := v_metadata || jsonb_build_object(
      'id', v_player_id,
      'name', v_name,
      'score', v_score,
      'elo_change', v_elo_change,
      'coins_earned', v_coins_earned
    );
  END LOOP;

  -- 2. Guardar historial de la partida
  INSERT INTO match_history (game_mode, winner_id, metadata)
  VALUES (
    CASE WHEN p_is_tournament THEN 'tournament' ELSE p_game_mode END,
    p_winner_id,
    v_metadata
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
