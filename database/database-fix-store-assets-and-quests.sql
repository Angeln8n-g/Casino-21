-- ====================================================================================
-- FIX: Store Assets (equip guarda image_url) + Daily Quests (409 conflict)
-- Ejecutar en el SQL Editor de Supabase
-- ====================================================================================

-- 1. FIX equip_store_item: Guardar la image_url/name en vez del UUID
CREATE OR REPLACE FUNCTION equip_store_item(p_item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_item_type TEXT;
    v_image_url TEXT;
    v_item_name TEXT;
BEGIN
    -- Verificar que el jugador posee el artículo
    IF NOT EXISTS (
        SELECT 1 FROM public.player_inventory 
        WHERE player_id = auth.uid() AND item_id = p_item_id
    ) THEN
        RAISE EXCEPTION 'No posees este artículo.';
    END IF;

    -- Obtener info del artículo
    SELECT item_type, image_url, "name" 
    INTO v_item_type, v_image_url, v_item_name 
    FROM public.store_items 
    WHERE id = p_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Artículo no encontrado.';
    END IF;

    -- Equipar según tipo, guardando la URL de la imagen (no el UUID)
    IF v_item_type = 'avatar' THEN
        UPDATE public.profiles SET equipped_avatar = v_image_url WHERE id = auth.uid();
    ELSIF v_item_type = 'card_back' THEN
        UPDATE public.profiles SET equipped_card_back = v_image_url WHERE id = auth.uid();
    ELSIF v_item_type = 'title' THEN
        UPDATE public.profiles SET equipped_title = v_item_name WHERE id = auth.uid();
    ELSIF v_item_type = 'board' THEN
        UPDATE public.profiles SET equipped_board = v_image_url WHERE id = auth.uid();
    ELSE
        RAISE EXCEPTION 'Tipo de artículo desconocido: %', v_item_type;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. FIX assign_daily_quests: Agregar ON CONFLICT DO NOTHING para evitar 409
CREATE OR REPLACE FUNCTION assign_daily_quests(p_player_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Comprobar si ya tiene misiones asignadas para hoy
    SELECT COUNT(*) INTO v_count FROM player_daily_quests 
    WHERE player_id = p_player_id AND assigned_date = CURRENT_DATE;

    -- Si ya tiene 3 o más, no hacer nada
    IF v_count >= 3 THEN
        RETURN FALSE;
    END IF;

    -- Insertar hasta completar 3 misiones aleatorias
    -- ON CONFLICT evita el error 409 si se llama múltiples veces simultáneamente
    INSERT INTO player_daily_quests (player_id, quest_id, assigned_date)
    SELECT p_player_id, id, CURRENT_DATE
    FROM quest_catalog
    WHERE is_active = TRUE 
      AND id NOT IN (
          SELECT quest_id FROM player_daily_quests 
          WHERE player_id = p_player_id AND assigned_date = CURRENT_DATE
      )
    ORDER BY random()
    LIMIT (3 - v_count)
    ON CONFLICT (player_id, quest_id, assigned_date) DO NOTHING;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
