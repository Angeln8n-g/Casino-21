-- Migration: Remove unused card_back system
-- Removes equipped_card_back column, items, inventory entries,
-- updates CHECK constraint, and cleans up the equip RPC.

-- 1. Drop equipped_card_back column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS equipped_card_back;

-- 2. Delete card_back items from inventory first (FK constraint)
DELETE FROM public.player_inventory
WHERE item_id IN (SELECT id FROM public.store_items WHERE item_type = 'card_back');

-- 3. Delete card_back store items
DELETE FROM public.store_items WHERE item_type = 'card_back';

-- 4. Update CHECK constraint to remove card_back
ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_item_type_check;
ALTER TABLE public.store_items ADD CONSTRAINT store_items_item_type_check
  CHECK (item_type IN ('avatar', 'title', 'board', 'theme', 'emotic'));

-- 5. Redefine equip_store_item RPC without the card_back branch
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
    ELSIF v_item_type = 'title' THEN
        UPDATE public.profiles SET equipped_title = v_item_name WHERE id = auth.uid();
    ELSIF v_item_type = 'board' THEN
        UPDATE public.profiles SET equipped_board = v_image_url WHERE id = auth.uid();
    ELSIF v_item_type = 'theme' THEN
        UPDATE public.profiles SET equipped_theme = v_theme_key WHERE id = auth.uid();
    ELSIF v_item_type = 'emotic' THEN
        -- Slot logic for emotics (1 to 4)
        IF p_slot < 1 OR p_slot > 4 THEN
            RAISE EXCEPTION 'El slot debe estar entre 1 y 4.';
        END IF;

        -- Get current emotics array
        SELECT equipped_emotics INTO v_current_emotics FROM public.profiles WHERE id = auth.uid();

        -- Ensure array is initialized
        IF v_current_emotics IS NULL THEN
            v_current_emotics := ARRAY['😀', '😮', '🔥', '👏']::TEXT[];
        END IF;

        -- Pad array if smaller than requested slot
        WHILE array_length(v_current_emotics, 1) < p_slot LOOP
            v_current_emotics := array_append(v_current_emotics, '😀');
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
