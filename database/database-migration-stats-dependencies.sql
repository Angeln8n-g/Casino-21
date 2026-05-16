-- ============================================================
-- FIX: Asegurar dependencias de process_match_results
-- 
-- La función process_match_results (creada en 
-- database-migration-match-results-atomic.sql) requiere varias
-- columnas/tablas que fueron creadas en migraciones posteriores.
-- Esta migración asegura que todo exista.
-- ============================================================

SET search_path TO public;

-- ============================================================
-- 1. Asegurar columna coins en profiles
-- (originalmente en database-migration-events-phase4.sql)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='coins') THEN
    ALTER TABLE public.profiles ADD COLUMN coins INTEGER NOT NULL DEFAULT 1000;
  END IF;
END $$;

-- ============================================================
-- 2. Asegurar columna avatar_url en profiles (usada por amigos)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- ============================================================
-- 3. Asegurar tabla wallet_transactions
-- (originalmente en database-migration-events-phase4.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wallet_transactions' AND policyname='wt_select_self') THEN
    CREATE POLICY "wt_select_self" ON public.wallet_transactions FOR SELECT USING (auth.uid() = player_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wallet_transactions' AND policyname='wt_service') THEN
    CREATE POLICY "wt_service" ON public.wallet_transactions FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wt_player ON public.wallet_transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_wt_created ON public.wallet_transactions(created_at DESC);

-- ============================================================
-- 4. Asegurar tabla match_history
-- (originalmente en database-migration-events-phase10.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.match_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_mode TEXT NOT NULL,
    winner_id UUID REFERENCES public.profiles(id),
    end_time TIMESTAMPTZ DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='match_history' AND policyname='Users can view their own match history') THEN
    CREATE POLICY "Users can view their own match history"
      ON public.match_history
      FOR SELECT
      USING (
        metadata @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_match_history_metadata ON public.match_history USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_match_history_end_time ON public.match_history (end_time DESC);

-- ============================================================
-- 5. Asegurar que add_player_xp existe
-- (originalmente en supabase-full-migration.sql)
-- Si la función depende de calculate_level_from_xp, la creamos también
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_level_from_xp(p_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_level INTEGER := 1;
  v_xp_needed INTEGER;
BEGIN
  LOOP
    v_xp_needed := v_level * 100;
    IF p_xp < v_xp_needed THEN
      RETURN v_level;
    END IF;
    p_xp := p_xp - v_xp_needed;
    v_level := v_level + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION add_player_xp(p_player_id UUID, p_xp INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    xp = xp + p_xp,
    level = calculate_level_from_xp(xp + p_xp)
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. Asegurar que increment_quest_progress existe
-- (puede ser un stub si la tabla de quests no existe)
-- ============================================================
CREATE OR REPLACE FUNCTION increment_quest_progress(p_player_id UUID, p_quest_type TEXT)
RETURNS VOID AS $$
BEGIN
  -- Si la tabla player_daily_quests existe, incrementar progreso
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_daily_quests') THEN
    UPDATE player_daily_quests
    SET progress = progress + 1
    WHERE player_id = p_player_id
      AND quest_type = p_quest_type
      AND status = 'in_progress';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. Asegurar que assign_daily_quests existe (stub)
-- ============================================================
CREATE OR REPLACE FUNCTION assign_daily_quests(p_player_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Stub: si la tabla existe, asignar quests diarias
  -- La implementación real está en su propia migración
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. Asegurar tabla messages (para chat privado)
-- El frontend (ChatWindow.tsx, SocialPanel.tsx) usa la tabla
-- 'messages' para chat privado, pero solo existía 'chat_messages'
-- para el chat global.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='msg_select') THEN
    CREATE POLICY "msg_select" ON public.messages FOR SELECT
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='msg_insert') THEN
    CREATE POLICY "msg_insert" ON public.messages FOR INSERT
      WITH CHECK (auth.uid() = sender_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='msg_update') THEN
    CREATE POLICY "msg_update" ON public.messages FOR UPDATE
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='msg_delete') THEN
    CREATE POLICY "msg_delete" ON public.messages FOR DELETE
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON public.messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
  ON public.messages(receiver_id, is_read) WHERE is_read = FALSE;
