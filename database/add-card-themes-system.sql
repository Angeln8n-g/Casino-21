-- ====================================================================================
-- MIGRACIÓN: Sistema de Temas Visuales (Card Themes)
-- Ejecutar en el SQL Editor de Supabase: https://supabase.com/dashboard/project/yarmgboyjjnodjszwiqi/sql
-- ====================================================================================

-- ─── 1. Añadir columna equipped_theme a profiles ──────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_theme TEXT DEFAULT 'default';

-- ─── 2. Añadir columna theme_key a store_items ────────────────────────────────
ALTER TABLE public.store_items
  ADD COLUMN IF NOT EXISTS theme_key TEXT;

-- ─── 3. Ampliar la restricción de item_type para incluir 'theme' ──────────────
-- Primero eliminamos la constraint existente (si la hay)
ALTER TABLE public.store_items
  DROP CONSTRAINT IF EXISTS store_items_item_type_check;

-- Recreamos con los valores actualizados
ALTER TABLE public.store_items
  ADD CONSTRAINT store_items_item_type_check
  CHECK (item_type IN ('avatar', 'card_back', 'title', 'board', 'theme'));

-- ─── 4. Reemplazar equip_store_item para manejar el tipo 'theme' ──────────────
CREATE OR REPLACE FUNCTION equip_store_item(p_item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_item_type TEXT;
    v_image_url TEXT;
    v_item_name TEXT;
    v_theme_key TEXT;
BEGIN
    -- Verificar que el jugador posee el artículo
    IF NOT EXISTS (
        SELECT 1 FROM public.player_inventory 
        WHERE player_id = auth.uid() AND item_id = p_item_id
    ) THEN
        RAISE EXCEPTION 'No posees este artículo.';
    END IF;

    -- Obtener info del artículo (incluye theme_key)
    SELECT item_type, image_url, "name", theme_key
    INTO v_item_type, v_image_url, v_item_name, v_theme_key
    FROM public.store_items 
    WHERE id = p_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Artículo no encontrado.';
    END IF;

    -- Equipar según tipo
    IF v_item_type = 'avatar' THEN
        UPDATE public.profiles SET equipped_avatar = v_image_url WHERE id = auth.uid();
    ELSIF v_item_type = 'card_back' THEN
        UPDATE public.profiles SET equipped_card_back = v_image_url WHERE id = auth.uid();
    ELSIF v_item_type = 'title' THEN
        UPDATE public.profiles SET equipped_title = v_item_name WHERE id = auth.uid();
    ELSIF v_item_type = 'board' THEN
        UPDATE public.profiles SET equipped_board = v_image_url WHERE id = auth.uid();
    ELSIF v_item_type = 'theme' THEN
        -- Guarda el theme_key (ej: 'vault_noir') en el perfil
        UPDATE public.profiles SET equipped_theme = v_theme_key WHERE id = auth.uid();
    ELSE
        RAISE EXCEPTION 'Tipo de artículo desconocido: %', v_item_type;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 5. Insertar los temas en la tienda ───────────────────────────────────────
-- Usamos ON CONFLICT DO NOTHING para que sea seguro re-ejecutar
INSERT INTO public.store_items (name, description, item_type, price, image_url, theme_key, is_active)
VALUES
  (
    'Vault Noir',
    'Casino de lujo. Cartas crema envejecidas sobre terciopelo negro.',
    'theme',
    600,
    NULL,
    'vault_noir',
    TRUE
  ),
  (
    'Neon Dealer',
    'Cyberpunk neón. Cada palo brilla con su propio color.',
    'theme',
    800,
    NULL,
    'neon_dealer',
    TRUE
  ),
  (
    'Gold Rush',
    'Glassmorphism premium. Dorado y cristal sobre fondo oscuro.',
    'theme',
    750,
    NULL,
    'gold_rush',
    TRUE
  ),
  (
    'Bento Casino',
    'Minimalismo Apple. Tarjetas limpias, sombras perfectas.',
    'theme',
    500,
    NULL,
    'bento_casino',
    TRUE
  ),
  (
    'Tactile Vegas',
    'Efecto clay 3D con colores vibrantes y físicas de rebote.',
    'theme',
    900,
    NULL,
    'tactile_vegas',
    TRUE
  )
ON CONFLICT DO NOTHING;

-- ─── 6. Verificación ──────────────────────────────────────────────────────────
-- Ejecuta esto para confirmar que todo quedó bien:
-- SELECT id, name, item_type, price, theme_key FROM store_items WHERE item_type = 'theme';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'equipped_theme';
