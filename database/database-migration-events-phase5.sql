-- ====================================================================================
-- CASINO 21 - FASE 5 MIGRATION (MISIONES DIARIAS Y RECOMPENSAS)
-- ====================================================================================

-- 1. TABLA: quest_catalog (Catálogo global de misiones)
CREATE TABLE IF NOT EXISTS public.quest_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_amount INTEGER NOT NULL DEFAULT 1,
    reward_coins INTEGER NOT NULL DEFAULT 50,
    reward_xp INTEGER NOT NULL DEFAULT 10,
    quest_type TEXT NOT NULL, -- 'play_match', 'win_match'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: player_daily_quests (Misiones asignadas al jugador)
CREATE TABLE IF NOT EXISTS public.player_daily_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES public.quest_catalog(id) ON DELETE CASCADE,
    progress INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, quest_id, assigned_date) -- Evita que se repita la misma misión en el mismo día
);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.quest_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_daily_quests ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
-- Todo el mundo puede leer el catálogo
CREATE POLICY "Quest catalog is viewable by everyone" ON public.quest_catalog
    FOR SELECT USING (true);

-- Solo admins pueden modificar el catálogo
CREATE POLICY "Admins can insert quests" ON public.quest_catalog
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can update quests" ON public.quest_catalog
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Jugadores pueden ver sus propias misiones asignadas
CREATE POLICY "Players can view own daily quests" ON public.player_daily_quests
    FOR SELECT USING (auth.uid() = player_id);

-- Jugadores no pueden insertar, actualizar o borrar directamente (lo hace RPC o Backend Admin)

-- 5. Insertar Misiones de Ejemplo (Seed Data)
INSERT INTO public.quest_catalog (code, title, description, target_amount, reward_coins, reward_xp, quest_type)
VALUES
    ('play_1_match', 'Calentamiento', 'Juega 1 partida de cualquier tipo.', 1, 50, 10, 'play_match'),
    ('play_3_matches', 'Jugador Habitual', 'Juega 3 partidas de cualquier tipo.', 3, 150, 30, 'play_match'),
    ('play_5_matches', 'Maratón', 'Juega 5 partidas de cualquier tipo.', 5, 300, 50, 'play_match'),
    ('win_1_match', 'Primera Victoria', 'Gana 1 partida.', 1, 100, 20, 'win_match'),
    ('win_3_matches', 'Racha Ganadora', 'Gana 3 partidas.', 3, 400, 60, 'win_match')
ON CONFLICT (code) DO NOTHING;


-- 6. FUNCIONES RPC

-- Función para asignar misiones diarias (si no tiene)
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
    INSERT INTO player_daily_quests (player_id, quest_id, assigned_date)
    SELECT p_player_id, id, CURRENT_DATE
    FROM quest_catalog
    WHERE is_active = TRUE 
      AND id NOT IN (
          SELECT quest_id FROM player_daily_quests 
          WHERE player_id = p_player_id AND assigned_date = CURRENT_DATE
      )
    ORDER BY random()
    LIMIT (3 - v_count);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Función para reclamar recompensa
CREATE OR REPLACE FUNCTION claim_quest_reward(p_player_quest_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_player_id UUID;
    v_is_completed BOOLEAN;
    v_is_claimed BOOLEAN;
    v_reward_coins INTEGER;
    v_reward_xp INTEGER;
BEGIN
    -- 1. Obtener la misión y validar
    SELECT pq.player_id, pq.is_completed, pq.is_claimed, qc.reward_coins, qc.reward_xp
    INTO v_player_id, v_is_completed, v_is_claimed, v_reward_coins, v_reward_xp
    FROM player_daily_quests pq
    JOIN quest_catalog qc ON pq.quest_id = qc.id
    WHERE pq.id = p_player_quest_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Misión no encontrada.';
    END IF;

    -- Verificar que el que llama es el dueño (Seguridad extra)
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

    -- 3. Entregar recompensas
    -- (Asumiendo que profiles tiene columnas 'coins' y 'xp'. Si no tiene 'xp', se puede omitir o crear. 
    -- Como la Fase 4 introdujo 'coins', sumamos monedas. 'xp' asumo que existe o se ignora si falla,
    -- pero por seguridad sumamos coins primero).
    
    UPDATE profiles 
    SET coins = COALESCE(coins, 0) + v_reward_coins
    WHERE id = v_player_id;

    -- Opcional: Registrar transacción si existe wallet_transactions
    BEGIN
        INSERT INTO wallet_transactions (player_id, amount, reason)
        VALUES (v_player_id, v_reward_coins, 'quest_reward');
    EXCEPTION WHEN undefined_table THEN
        -- Si la tabla no existe (opcional de fase 4), ignorar
    END;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
