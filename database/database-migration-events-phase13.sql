-- Fase 13: Rediseño Alta Fidelidad y Tapetes Dinámicos

-- 1. Agregar board_theme_url a la tabla de eventos
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS board_theme_url TEXT;

-- 2. Agregar board_theme_url a la tabla de catálogo de misiones
ALTER TABLE public.quest_catalog 
ADD COLUMN IF NOT EXISTS board_theme_url TEXT;

-- 3. Comentario informativo sobre la columna
COMMENT ON COLUMN public.events.board_theme_url IS 'URL de la imagen o textura para el tapete de la mesa durante el evento';
COMMENT ON COLUMN public.quest_catalog.board_theme_url IS 'URL de la imagen o textura para el tapete de la mesa durante la misión';

-- 4. Extender RPCs de admin para permitir configurar board_theme_url en misiones
CREATE OR REPLACE FUNCTION admin_create_quest(
    p_code TEXT,
    p_title TEXT,
    p_description TEXT,
    p_target_amount INTEGER,
    p_reward_coins INTEGER,
    p_reward_xp INTEGER,
    p_reward_elo INTEGER,
    p_quest_type TEXT,
    p_difficulty TEXT,
    p_board_theme_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_quest_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Acceso denegado. Se requieren permisos de administrador.';
    END IF;

    IF p_target_amount <= 0 THEN RAISE EXCEPTION 'target_amount debe ser mayor a 0'; END IF;
    IF p_reward_elo < 0 OR p_reward_elo > 20 THEN RAISE EXCEPTION 'reward_elo debe estar entre 0 y 20'; END IF;

    INSERT INTO public.quest_catalog (
        code, title, description, target_amount, reward_coins, reward_xp, reward_elo, quest_type, difficulty, board_theme_url, created_by
    ) VALUES (
        p_code, p_title, p_description, p_target_amount, p_reward_coins, p_reward_xp, p_reward_elo, p_quest_type, p_difficulty, p_board_theme_url, auth.uid()
    ) RETURNING id INTO v_quest_id;

    INSERT INTO public.quest_catalog_audit (quest_id, action, after_data, changed_by)
    VALUES (v_quest_id, 'CREATE', to_jsonb((SELECT x FROM quest_catalog x WHERE id = v_quest_id)), auth.uid());

    RETURN v_quest_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_quest(
    p_quest_id UUID,
    p_code TEXT,
    p_title TEXT,
    p_description TEXT,
    p_target_amount INTEGER,
    p_reward_coins INTEGER,
    p_reward_xp INTEGER,
    p_reward_elo INTEGER,
    p_quest_type TEXT,
    p_difficulty TEXT,
    p_is_active BOOLEAN,
    p_board_theme_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_before JSONB;
BEGIN
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Acceso denegado. Se requieren permisos de administrador.';
    END IF;

    SELECT to_jsonb(x) INTO v_before FROM quest_catalog x WHERE id = p_quest_id;

    UPDATE public.quest_catalog SET
        code = p_code,
        title = p_title,
        description = p_description,
        target_amount = p_target_amount,
        reward_coins = p_reward_coins,
        reward_xp = p_reward_xp,
        reward_elo = p_reward_elo,
        quest_type = p_quest_type,
        difficulty = p_difficulty,
        is_active = p_is_active,
        board_theme_url = p_board_theme_url
    WHERE id = p_quest_id;

    INSERT INTO public.quest_catalog_audit (quest_id, action, before_data, after_data, changed_by)
    VALUES (p_quest_id, 'UPDATE', v_before, to_jsonb((SELECT x FROM quest_catalog x WHERE id = p_quest_id)), auth.uid());

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
