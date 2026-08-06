-- Migration: Expand Emote Slots from 4 to 8 (S1..S8)
-- Description: Updates equip_store_item RPC and profile defaults to support 8 emote slots.

-- 1. Update default for equipped_emotics column in profiles
ALTER TABLE public.profiles
ALTER COLUMN equipped_emotics SET DEFAULT ARRAY['😀', '😮', '🔥', '👏', '💀', '🎉', '💩', '😎']::TEXT[];

-- 2. Redefine equip_store_item RPC to support up to 8 slots
DROP FUNCTION IF EXISTS equip_store_item(UUID);
DROP FUNCTION IF EXISTS equip_store_item(UUID, INTEGER);

CREATE OR REPLACE FUNCTION equip_store_item(p_item_id UUID, p_slot INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
    v_item_type TEXT;
    v_image_url TEXT;
    v_item_name TEXT;
    v_theme_key TEXT;
    v_current_emotics TEXT[];
    v_defaults TEXT[] := ARRAY['😀', '😮', '🔥', '👏', '💀', '🎉', '💩', '😎'];
BEGIN
    -- 1. Verify ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.player_inventory 
        WHERE player_id = auth.uid() AND item_id = p_item_id
    ) THEN
        RAISE EXCEPTION 'No posees este artículo.';
    END IF;

    -- 2. Get item info
    SELECT item_type, image_url, "name", theme_key
    INTO v_item_type, v_image_url, v_item_name, v_theme_key
    FROM public.store_items 
    WHERE id = p_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Artículo no encontrado.';
    END IF;

    -- 3. Update profile based on type
    IF v_item_type = 'avatar' THEN
        UPDATE public.profiles SET equipped_avatar = v_image_url WHERE id = auth.uid();
    ELSIF v_item_type = 'card_back' THEN
        UPDATE public.profiles SET equipped_card_back = v_image_url WHERE id = auth.uid();
    ELSIF v_item_type = 'title' THEN
        UPDATE public.profiles SET equipped_title = v_item_name WHERE id = auth.uid();
    ELSIF v_item_type = 'board' THEN
        UPDATE public.profiles SET equipped_board = v_image_url WHERE id = auth.uid();
    ELSIF v_item_type = 'theme' THEN
        UPDATE public.profiles SET equipped_theme = v_theme_key WHERE id = auth.uid();
    ELSIF v_item_type = 'emotic' THEN
        -- Slot logic for emotics (1 to 8)
        IF p_slot < 1 OR p_slot > 8 THEN
            RAISE EXCEPTION 'El slot debe estar entre 1 y 8.';
        END IF;
        
        -- Get current emotics array
        SELECT equipped_emotics INTO v_current_emotics FROM public.profiles WHERE id = auth.uid();
        
        -- Ensure array is initialized
        IF v_current_emotics IS NULL THEN
            v_current_emotics := v_defaults;
        END IF;
        
        -- Pad array if smaller than requested slot
        WHILE array_length(v_current_emotics, 1) < 8 LOOP
            v_current_emotics := array_append(v_current_emotics, v_defaults[array_length(v_current_emotics, 1) + 1]);
        END LOOP;
        
        -- Update specific slot
        v_current_emotics[p_slot] := v_image_url;
        
        UPDATE public.profiles SET equipped_emotics = v_current_emotics WHERE id = auth.uid();
    ELSE
        RAISE EXCEPTION 'Tipo de artículo desconocido: %', v_item_type;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
