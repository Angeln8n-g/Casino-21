-- Fase 5.1: Gestión de Misiones desde Admin + ELO por Dificultad

-- 1. Extender quest_catalog con nuevas columnas
ALTER TABLE public.quest_catalog 
ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard','elite')),
ADD COLUMN IF NOT EXISTS reward_elo INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by UUID NULL REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Tabla de Auditoría para quest_catalog
CREATE TABLE IF NOT EXISTS public.quest_catalog_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'TOGGLE'
    before_data JSONB,
    after_data JSONB,
    changed_by UUID REFERENCES public.profiles(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_quest_catalog_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_quest_catalog_timestamp
    BEFORE UPDATE ON public.quest_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_quest_catalog_timestamp();

-- 4. Actualizar RPC claim_quest_reward para incluir ELO
CREATE OR REPLACE FUNCTION claim_quest_reward(p_player_quest_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_player_id UUID;
    v_is_completed BOOLEAN;
    v_is_claimed BOOLEAN;
    v_reward_coins INTEGER;
    v_reward_xp INTEGER;
    v_reward_elo INTEGER;
BEGIN
    -- 1. Obtener la misión y validar (Incluimos reward_elo)
    SELECT pq.player_id, pq.is_completed, pq.is_claimed, qc.reward_coins, qc.reward_xp, qc.reward_elo
    INTO v_player_id, v_is_completed, v_is_claimed, v_reward_coins, v_reward_xp, v_reward_elo
    FROM player_daily_quests pq
    JOIN quest_catalog qc ON pq.quest_id = qc.id
    WHERE pq.id = p_player_quest_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Misión no encontrada.';
    END IF;

    -- Verificar que el que llama es el dueño
    IF v_player_id != auth.uid() THEN
        RAISE EXCEPTION 'No tienes permiso para reclamar esta misión.';
    END IF;

    IF NOT v_is_completed THEN
        RAISE EXCEPTION 'La misión aún no está completada.';
    END IF;

    IF v_is_claimed THEN
        RAISE EXCEPTION 'La recompensa ya fue reclamada.';
    END IF;

    -- 2. Marcar como reclamada
    UPDATE player_daily_quests SET is_claimed = TRUE WHERE id = p_player_quest_id;

    -- 3. Entregar recompensas (coins, xp, elo)
    UPDATE profiles 
    SET 
        coins = COALESCE(coins, 0) + v_reward_coins,
        elo = COALESCE(elo, 1000) + v_reward_elo
    WHERE id = v_player_id;

    -- Registrar transacción en wallet si existe
    BEGIN
        INSERT INTO wallet_transactions (player_id, amount, reason)
        VALUES (v_player_id, v_reward_coins, 'quest_reward');
    EXCEPTION WHEN undefined_table THEN
        -- Ignorar si la tabla no existe
    END;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPCs Admin para Gestión de Misiones

-- 5.1 Crear Misión
CREATE OR REPLACE FUNCTION admin_create_quest(
    p_code TEXT,
    p_title TEXT,
    p_description TEXT,
    p_target_amount INTEGER,
    p_reward_coins INTEGER,
    p_reward_xp INTEGER,
    p_reward_elo INTEGER,
    p_quest_type TEXT,
    p_difficulty TEXT
)
RETURNS UUID AS $$
DECLARE
    v_quest_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Verificar si es admin
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Acceso denegado. Se requieren permisos de administrador.';
    END IF;

    -- Validaciones básicas
    IF p_target_amount <= 0 THEN RAISE EXCEPTION 'target_amount debe ser mayor a 0'; END IF;
    IF p_reward_elo < 0 OR p_reward_elo > 20 THEN RAISE EXCEPTION 'reward_elo debe estar entre 0 y 20'; END IF;

    INSERT INTO public.quest_catalog (
        code, title, description, target_amount, reward_coins, reward_xp, reward_elo, quest_type, difficulty, created_by
    ) VALUES (
        p_code, p_title, p_description, p_target_amount, p_reward_coins, p_reward_xp, p_reward_elo, p_quest_type, p_difficulty, auth.uid()
    ) RETURNING id INTO v_quest_id;

    -- Auditoría
    INSERT INTO public.quest_catalog_audit (quest_id, action, after_data, changed_by)
    VALUES (v_quest_id, 'CREATE', to_jsonb((SELECT x FROM quest_catalog x WHERE id = v_quest_id)), auth.uid());

    RETURN v_quest_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Actualizar Misión
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
    p_is_active BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_before JSONB;
BEGIN
    -- Verificar si es admin
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Acceso denegado. Se requieren permisos de administrador.';
    END IF;

    -- Capturar datos antes
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
        is_active = p_is_active
    WHERE id = p_quest_id;

    -- Auditoría
    INSERT INTO public.quest_catalog_audit (quest_id, action, before_data, after_data, changed_by)
    VALUES (p_quest_id, 'UPDATE', v_before, to_jsonb((SELECT x FROM quest_catalog x WHERE id = p_quest_id)), auth.uid());

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Toggle Misión (Activar/Desactivar)
CREATE OR REPLACE FUNCTION admin_toggle_quest(p_quest_id UUID, p_is_active BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_before JSONB;
BEGIN
    -- Verificar si es admin
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Acceso denegado. Se requieren permisos de administrador.';
    END IF;

    SELECT to_jsonb(x) INTO v_before FROM quest_catalog x WHERE id = p_quest_id;

    UPDATE public.quest_catalog SET is_active = p_is_active WHERE id = p_quest_id;

    INSERT INTO public.quest_catalog_audit (quest_id, action, before_data, after_data, changed_by)
    VALUES (p_quest_id, 'TOGGLE', v_before, to_jsonb((SELECT x FROM quest_catalog x WHERE id = p_quest_id)), auth.uid());

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Índices Recomendados
CREATE INDEX IF NOT EXISTS idx_quest_catalog_active_difficulty ON public.quest_catalog(is_active, difficulty, quest_type);
CREATE INDEX IF NOT EXISTS idx_player_daily_quests_player_date ON public.player_daily_quests(player_id, assigned_date, is_completed, is_claimed);

-- 7. Semilla inicial (Opcional, si se desea actualizar las existentes)
UPDATE public.quest_catalog SET difficulty = 'easy', reward_elo = 1 WHERE code IN ('play_1_match', 'win_1_match');
UPDATE public.quest_catalog SET difficulty = 'medium', reward_elo = 3 WHERE code IN ('play_3_matches', 'win_3_matches');
UPDATE public.quest_catalog SET difficulty = 'hard', reward_elo = 6 WHERE code = 'play_5_matches';
