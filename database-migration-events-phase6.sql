-- ====================================================================================
-- CASINO 21 - FASE 6 MIGRATION (TIENDA IN-GAME E INVENTARIO)
-- ====================================================================================

-- 1. Actualizar tabla profiles con campos de equipamiento
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_avatar TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_card_back TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_board TEXT;

-- 2. Crear tabla store_items (Catálogo de la Tienda)
CREATE TABLE IF NOT EXISTS public.store_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    description TEXT,
    item_type TEXT NOT NULL, -- 'avatar', 'card_back', 'title', 'board'
    price INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Crear tabla player_inventory (Inventario de cada jugador)
CREATE TABLE IF NOT EXISTS public.player_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(player_id, item_id) -- Un jugador no puede tener el mismo artículo dos veces
);

-- 4. Habilitar RLS
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;

-- 5. Políticas
-- Todo el mundo puede ver la tienda
CREATE POLICY "Store items are viewable by everyone" ON public.store_items FOR SELECT USING (true);
-- Los jugadores solo pueden ver su propio inventario
CREATE POLICY "Players can view own inventory" ON public.player_inventory FOR SELECT USING (auth.uid() = player_id);

-- Solo Admins pueden modificar la tienda
CREATE POLICY "Admins can manage store" ON public.store_items
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 6. Insertar Artículos de Ejemplo (Seed Data)
INSERT INTO public.store_items ("name", description, item_type, price, image_url)
VALUES 
    ('Reverso Dorado', 'Un elegante reverso con bordes de oro puro.', 'card_back', 500, 'gold_back.png'),
    ('Reverso Neón', 'Reverso con luces de neón ciberpunk.', 'card_back', 800, 'neon_back.png'),
    ('Título: El Rey del Casino', 'Muestra a todos quién manda.', 'title', 1500, NULL),
    ('Título: Estratega', 'Para los que calculan cada movimiento.', 'title', 1000, NULL),
    ('Tapete VIP', 'Mesa de fieltro oscuro exclusivo VIP.', 'board', 2500, 'vip_board.png'),
    ('Avatar: El Gato', 'Un gato con gafas de sol.', 'avatar', 1200, 'cat_avatar.png')
ON CONFLICT DO NOTHING;

-- 7. Función RPC: Comprar un artículo
CREATE OR REPLACE FUNCTION buy_store_item(p_item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_price INTEGER;
    v_coins INTEGER;
BEGIN
    -- Verificar si el artículo existe y obtener precio
    SELECT price INTO v_price FROM public.store_items WHERE id = p_item_id AND is_active = TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Artículo no disponible.';
    END IF;

    -- Verificar si ya lo tiene
    IF EXISTS (SELECT 1 FROM public.player_inventory WHERE player_id = auth.uid() AND item_id = p_item_id) THEN
        RAISE EXCEPTION 'Ya posees este artículo.';
    END IF;

    -- Obtener monedas del jugador
    SELECT coins INTO v_coins FROM public.profiles WHERE id = auth.uid();
    IF v_coins IS NULL OR v_coins < v_price THEN
        RAISE EXCEPTION 'Monedas insuficientes.';
    END IF;

    -- Descontar monedas
    UPDATE public.profiles SET coins = coins - v_price WHERE id = auth.uid();

    -- Añadir al inventario
    INSERT INTO public.player_inventory (player_id, item_id) VALUES (auth.uid(), p_item_id);

    -- Registrar transacción (si existe wallet_transactions)
    BEGIN
        INSERT INTO public.wallet_transactions (player_id, amount, reason)
        VALUES (auth.uid(), -v_price, 'store_purchase');
    EXCEPTION WHEN undefined_table THEN
        -- Ignorar si no existe
    END;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Función RPC: Equipar un artículo
CREATE OR REPLACE FUNCTION equip_store_item(p_item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_item_type TEXT;
BEGIN
    -- Verificar que el jugador lo tiene en su inventario
    IF NOT EXISTS (SELECT 1 FROM public.player_inventory WHERE player_id = auth.uid() AND item_id = p_item_id) THEN
        RAISE EXCEPTION 'No posees este artículo.';
    END IF;

    -- Obtener el tipo de artículo
    SELECT item_type INTO v_item_type FROM public.store_items WHERE id = p_item_id;

    -- Actualizar el perfil según el tipo
    IF v_item_type = 'avatar' THEN
        UPDATE public.profiles SET equipped_avatar = p_item_id::TEXT WHERE id = auth.uid();
    ELSIF v_item_type = 'card_back' THEN
        UPDATE public.profiles SET equipped_card_back = p_item_id::TEXT WHERE id = auth.uid();
    ELSIF v_item_type = 'title' THEN
        UPDATE public.profiles SET equipped_title = p_item_id::TEXT WHERE id = auth.uid();
    ELSIF v_item_type = 'board' THEN
        UPDATE public.profiles SET equipped_board = p_item_id::TEXT WHERE id = auth.uid();
    ELSE
        RAISE EXCEPTION 'Tipo de artículo desconocido.';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
