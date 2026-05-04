-- ========================================================================================
-- FASE: Corrección y Optimización del Sistema de Misiones Diarias (Quests)
-- Descripción: Crea formalmente la función `increment_quest_progress` y asegura que las 
-- misiones se completen automáticamente cuando el progreso alcanza la meta.
-- ========================================================================================

-- Función robusta para incrementar progreso de misiones
CREATE OR REPLACE FUNCTION public.increment_quest_progress(p_player_id UUID, p_quest_type TEXT)
RETURNS VOID AS $$
DECLARE
  v_quest RECORD;
BEGIN
  -- Buscar las misiones activas de ese jugador y tipo para el día de hoy
  FOR v_quest IN 
    SELECT pdq.id as player_quest_id, pdq.progress, qc.target_amount
    FROM public.player_daily_quests pdq
    JOIN public.quest_catalog qc ON pdq.quest_id = qc.id
    WHERE pdq.player_id = p_player_id 
      AND pdq.assigned_date = CURRENT_DATE
      AND pdq.is_completed = false
      AND qc.quest_type = p_quest_type
  LOOP
    -- Actualizar el progreso y verificar si se completó
    UPDATE public.player_daily_quests
    SET 
      progress = LEAST(progress + 1, v_quest.target_amount),
      is_completed = CASE WHEN (progress + 1) >= v_quest.target_amount THEN true ELSE false END,
      updated_at = NOW()
    WHERE id = v_quest.player_quest_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
