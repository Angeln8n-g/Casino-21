-- ====================================================================================
-- CASINO 21 — CONFIGURACIÓN COMPLETA DE BASE DE DATOS (UNIFICADA)
-- Ejecutar en el SQL Editor de tu Supabase Studio (Self-Hosted o Cloud).
-- ====================================================================================

SET search_path TO public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================================
-- 1. TABLA: PROFILES
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT UNIQUE NOT NULL,
  elo                 INTEGER NOT NULL DEFAULT 1000,
  wins                INTEGER NOT NULL DEFAULT 0,
  losses              INTEGER NOT NULL DEFAULT 0,
  xp                  INTEGER NOT NULL DEFAULT 0,
  level               INTEGER NOT NULL DEFAULT 1,
  coins               INTEGER NOT NULL DEFAULT 1000, -- Monedas iniciales
  is_admin            BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url          TEXT,
  equipped_avatar     TEXT,
  equipped_card_back  TEXT,
  equipped_title      TEXT,
  equipped_board      TEXT,
  equipped_theme      TEXT DEFAULT 'default',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_select') THEN
    CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_insert') THEN
    CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_update') THEN
    CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Triggers de actualización automática de fecha
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Función handle_new_user robusta (con OAuth y resolución de colisión de usernames)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  user_avatar TEXT;
  counter INTEGER := 1;
  max_attempts INTEGER := 10;
BEGIN
  -- Extraer nombre base dependiendo de los metadatos disponibles (Email, Google, Discord)
  base_username := COALESCE(
    new.raw_user_meta_data->>'username',           -- Email signup tradicional
    new.raw_user_meta_data#>>'{custom_claims,global_name}', -- Discord
    new.raw_user_meta_data->>'full_name',          -- Google
    new.raw_user_meta_data->>'name',               -- Otros proveedores
    'Jugador'                                      -- Fallback
  );

  -- Limpiar el nombre de usuario (quitar espacios en blanco, etc.)
  base_username := trim(base_username);
  
  -- Si el nombre está vacío después de limpiar, usar fallback
  IF base_username = '' THEN
    base_username := 'Jugador';
  END IF;

  -- Inicializar el nombre final con el base
  final_username := base_username;

  -- Bucle para encontrar un nombre de usuario único
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) AND counter <= max_attempts LOOP
    -- Si el nombre ya existe, agregar un sufijo aleatorio de 4 dígitos
    final_username := base_username || '_' || floor(random() * 9000 + 1000)::TEXT;
    counter := counter + 1;
  END LOOP;

  -- Si después de 10 intentos (muy improbable) sigue habiendo colisión, usar el UUID
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := 'Jugador_' || substr(new.id::TEXT, 1, 8);
  END IF;

  -- Extraer avatar URL si está disponible
  user_avatar := COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    NULL
  );

  BEGIN
    INSERT INTO public.profiles (id, username, avatar_url)
    VALUES (new.id, final_username, user_avatar)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    -- Ocurrió una colisión de username por race condition entre
    -- transacciones concurrentes. Reintentar con UUID como fallback.
    INSERT INTO public.profiles (id, username, avatar_url)
    VALUES (new.id, 'Jugador_' || substr(new.id::TEXT, 1, 8), user_avatar)
    ON CONFLICT (id) DO NOTHING;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================================
-- 2. TABLA: MATCHES
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES public.profiles(id),
  player2_id UUID NOT NULL REFERENCES public.profiles(id),
  winner_id  UUID REFERENCES public.profiles(id),
  status     TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matches' AND policyname='matches_select') THEN
    CREATE POLICY "matches_select" ON public.matches FOR SELECT USING (true);
  END IF;
END $$;

-- ====================================================================================
-- 3. TABLA: TITLES
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.titles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL,
  xp_requirement INTEGER NOT NULL DEFAULT 0,
  is_premium     BOOLEAN NOT NULL DEFAULT FALSE
);
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='titles' AND policyname='titles_select') THEN
    CREATE POLICY "titles_select"  ON public.titles FOR SELECT USING (true);
    CREATE POLICY "titles_service" ON public.titles FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_title_id UUID REFERENCES public.titles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_active_title ON public.profiles(active_title_id);

-- ====================================================================================
-- 4. TABLA: TOURNAMENTS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.tournaments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  creator_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT '',
  max_players     INTEGER NOT NULL CHECK (max_players IN (4, 8, 16, 32)),
  current_players INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'in_progress', 'completed')),
  bracket         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tournaments_code    ON public.tournaments(code);
CREATE INDEX IF NOT EXISTS idx_tournaments_status  ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_creator ON public.tournaments(creator_id);
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tournaments' AND policyname='tournaments_select') THEN
    CREATE POLICY "tournaments_select"  ON public.tournaments FOR SELECT USING (true);
    CREATE POLICY "tournaments_insert"  ON public.tournaments FOR INSERT WITH CHECK (auth.uid() = creator_id);
    CREATE POLICY "tournaments_service" ON public.tournaments FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 5. TABLA: TOURNAMENT_PARTICIPANTS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  final_position INTEGER,
  UNIQUE(tournament_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_tp_tournament ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tp_player     ON public.tournament_participants(player_id);
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tournament_participants' AND policyname='tp_select') THEN
    CREATE POLICY "tp_select"  ON public.tournament_participants FOR SELECT USING (true);
    CREATE POLICY "tp_service" ON public.tournament_participants FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 6. TABLA: TOURNAMENT_MATCHES
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number  INTEGER NOT NULL,
  player1_id    UUID REFERENCES public.profiles(id),
  player2_id    UUID REFERENCES public.profiles(id),
  winner_id     UUID REFERENCES public.profiles(id),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'completed', 'no_show')),
  room_id       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tm_tournament ON public.tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tm_round      ON public.tournament_matches(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_tm_player1    ON public.tournament_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_tm_player2    ON public.tournament_matches(player2_id);
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tournament_matches' AND policyname='tm_select') THEN
    CREATE POLICY "tm_select"  ON public.tournament_matches FOR SELECT USING (true);
    CREATE POLICY "tm_service" ON public.tournament_matches FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 7. TABLA: SEASONS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.seasons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number     INTEGER UNIQUE NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date   TIMESTAMPTZ NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed'))
);
CREATE INDEX IF NOT EXISTS idx_seasons_status ON public.seasons(status);
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='seasons' AND policyname='seasons_select') THEN
    CREATE POLICY "seasons_select"  ON public.seasons FOR SELECT USING (true);
    CREATE POLICY "seasons_service" ON public.seasons FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 8. TABLA: SEASON_RANKINGS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.season_rankings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id     UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  player_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  division      TEXT NOT NULL,
  elo           INTEGER NOT NULL DEFAULT 1000,
  final_rank    INTEGER,
  final_elo     INTEGER,
  wins          INTEGER NOT NULL DEFAULT 0,
  losses        INTEGER NOT NULL DEFAULT 0,
  UNIQUE(season_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_sr_season  ON public.season_rankings(season_id);
CREATE INDEX IF NOT EXISTS idx_sr_player  ON public.season_rankings(player_id);
CREATE INDEX IF NOT EXISTS idx_sr_div_elo ON public.season_rankings(season_id, division, elo DESC);
ALTER TABLE public.season_rankings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='season_rankings' AND policyname='sr_select') THEN
    CREATE POLICY "sr_select"  ON public.season_rankings FOR SELECT USING (true);
    CREATE POLICY "sr_service" ON public.season_rankings FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 9. TABLA: CHAT_MESSAGES
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id           TEXT NOT NULL,
  sender_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content           TEXT NOT NULL CHECK (LENGTH(content) BETWEEN 1 AND 200),
  reported          BOOLEAN NOT NULL DEFAULT FALSE,
  moderation_status TEXT NOT NULL DEFAULT 'pending'
                      CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cm_room   ON public.chat_messages(room_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cm_sender ON public.chat_messages(sender_id, timestamp DESC);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='chat_messages' AND policyname='cm_select') THEN
    CREATE POLICY "cm_select"  ON public.chat_messages FOR SELECT USING (true);
    CREATE POLICY "cm_insert"  ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
    CREATE POLICY "cm_service" ON public.chat_messages FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 10. TABLA: FRIENDSHIPS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player1_id, player2_id)
);
CREATE INDEX IF NOT EXISTS idx_fs_player1 ON public.friendships(player1_id);
CREATE INDEX IF NOT EXISTS idx_fs_player2 ON public.friendships(player2_id);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friendships' AND policyname='fs_select') THEN
    CREATE POLICY "fs_select"  ON public.friendships FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);
    CREATE POLICY "fs_service" ON public.friendships FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 11. TABLA: FRIEND_REQUESTS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(sender_id, receiver_id)
);
CREATE INDEX IF NOT EXISTS idx_fr_sender   ON public.friend_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_fr_receiver ON public.friend_requests(receiver_id, status);
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friend_requests' AND policyname='fr_select') THEN
    CREATE POLICY "fr_select"  ON public.friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    CREATE POLICY "fr_insert"  ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
    CREATE POLICY "fr_service" ON public.friend_requests FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 12. TABLA: GAME_INVITATIONS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.game_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  room_id       TEXT,
  bet_amount    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes'
);
CREATE INDEX IF NOT EXISTS idx_gi_sender   ON public.game_invitations(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_gi_receiver ON public.game_invitations(receiver_id, status);
ALTER TABLE public.game_invitations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='game_invitations' AND policyname='gi_select') THEN
    CREATE POLICY "gi_select"  ON public.game_invitations FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    CREATE POLICY "gi_insert"  ON public.game_invitations FOR INSERT WITH CHECK (auth.uid() = sender_id);
    CREATE POLICY "gi_service" ON public.game_invitations FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 13. TABLA: ELO_HISTORY
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.elo_history (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  elo       INTEGER NOT NULL,
  change    INTEGER NOT NULL DEFAULT 0,
  reason    TEXT NOT NULL DEFAULT 'match' CHECK (reason IN ('match', 'season_reset', 'tournament')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eh_player_ts ON public.elo_history(player_id, timestamp DESC);
ALTER TABLE public.elo_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='elo_history' AND policyname='eh_select') THEN
    CREATE POLICY "eh_select"  ON public.elo_history FOR SELECT USING (true);
    CREATE POLICY "eh_service" ON public.elo_history FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 14. TABLA: ACHIEVEMENTS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('beginner', 'intermediate', 'advanced', 'master')),
  xp_reward   INTEGER NOT NULL DEFAULT 0,
  criteria    TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='achievements' AND policyname='ach_select') THEN
    CREATE POLICY "ach_select"  ON public.achievements FOR SELECT USING (true);
    CREATE POLICY "ach_service" ON public.achievements FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 15. TABLA: PLAYER_ACHIEVEMENTS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.player_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS idx_pa_player      ON public.player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_pa_achievement ON public.player_achievements(achievement_id);
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_achievements' AND policyname='pa_select') THEN
    CREATE POLICY "pa_select"  ON public.player_achievements FOR SELECT USING (auth.uid() = player_id);
    CREATE POLICY "pa_service" ON public.player_achievements FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 16. TABLA: PLAYER_TITLES
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.player_titles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title_id    UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(player_id, title_id)
);
CREATE INDEX IF NOT EXISTS idx_pt_player ON public.player_titles(player_id);
ALTER TABLE public.player_titles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_titles' AND policyname='pt_select') THEN
    CREATE POLICY "pt_select"  ON public.player_titles FOR SELECT USING (auth.uid() = player_id);
    CREATE POLICY "pt_service" ON public.player_titles FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 17. TABLA: NOTIFICATIONS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  content    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_player ON public.notifications(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON public.notifications(player_id, is_read) WHERE is_read = FALSE;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_select') THEN
    CREATE POLICY "notif_select"  ON public.notifications FOR SELECT USING (auth.uid() = player_id);
    CREATE POLICY "notif_service" ON public.notifications FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 18. TABLA: PLAYER_REPORTS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.player_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  evidence    TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pr_reported ON public.player_reports(reported_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pr_status   ON public.player_reports(status);
ALTER TABLE public.player_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_reports' AND policyname='pr_service') THEN
    CREATE POLICY "pr_service" ON public.player_reports FOR ALL USING (auth.role() = 'service_role');
    CREATE POLICY "pr_insert"  ON public.player_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
  END IF;
END $$;

-- ====================================================================================
-- 19. TABLA: PLAYER_BLOCKS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.player_blocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_pb_blocker ON public.player_blocks(blocker_id);
ALTER TABLE public.player_blocks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_blocks' AND policyname='pb_select') THEN
    CREATE POLICY "pb_select"  ON public.player_blocks FOR SELECT USING (auth.uid() = blocker_id);
    CREATE POLICY "pb_service" ON public.player_blocks FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 20. TABLA: TEMPORARY_BANS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.temporary_bans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason         TEXT NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 24,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tb_player ON public.temporary_bans(player_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_active ON public.temporary_bans(is_active, expires_at) WHERE is_active = TRUE;
ALTER TABLE public.temporary_bans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='temporary_bans' AND policyname='tb_service') THEN
    CREATE POLICY "tb_service" ON public.temporary_bans FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 21. TABLA: RATE_LIMITS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type  TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rl_player_action ON public.rate_limits(player_id, action_type, window_start DESC);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rate_limits' AND policyname='rl_service') THEN
    CREATE POLICY "rl_service" ON public.rate_limits FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ====================================================================================
-- 22. TABLAS DE TIENDA, INVENTARIOS Y TEMAS VISUALES (FASE 6 + SISTEMA DE TEMAS)
-- ====================================================================================

-- 22.1 Tabla store_items (Catálogo de la Tienda)
CREATE TABLE IF NOT EXISTS public.store_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"      TEXT NOT NULL,
    description TEXT,
    item_type   TEXT NOT NULL, -- 'avatar', 'card_back', 'title', 'board', 'theme'
    price       INTEGER NOT NULL DEFAULT 0,
    image_url   TEXT,
    theme_key   TEXT UNIQUE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT store_items_item_type_check CHECK (item_type IN ('avatar', 'card_back', 'title', 'board', 'theme'))
);

-- 22.2 Tabla player_inventory (Inventario de cada jugador)
CREATE TABLE IF NOT EXISTS public.player_inventory (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id     UUID NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(player_id, item_id)
);

-- 22.3 Tabla themes (Contiene la estructura detallada de colores CSS/estilos)
CREATE TABLE IF NOT EXISTS public.themes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key           TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    description   TEXT DEFAULT '',
    emoji         TEXT DEFAULT '🎨',
    preview_color TEXT NOT NULL DEFAULT '#111827',
    price         INTEGER NOT NULL DEFAULT 500,
    card_theme    JSONB NOT NULL,
    board_theme   JSONB NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en Tienda y Temas
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='store_items' AND policyname='Store items are viewable by everyone') THEN
    CREATE POLICY "Store items are viewable by everyone" ON public.store_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='player_inventory' AND policyname='Players can view own inventory') THEN
    CREATE POLICY "Players can view own inventory" ON public.player_inventory FOR SELECT USING (auth.uid() = player_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='store_items' AND policyname='Admins can manage store') THEN
    CREATE POLICY "Admins can manage store" ON public.store_items
        FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='themes' AND policyname='Anyone can read active themes') THEN
    CREATE POLICY "Anyone can read active themes" ON public.themes FOR SELECT USING (is_active = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='themes' AND policyname='Admins can manage themes') THEN
    CREATE POLICY "Admins can manage themes" ON public.themes 
        FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));
  END IF;
END $$;

-- ====================================================================================
-- 23. TABLA: AD_CONFIGURATIONS (CONFIGURACIÓN DINÁMICA DE ANUNCIOS)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.ad_configurations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  ad_type       TEXT NOT NULL CHECK (ad_type IN ('banner', 'social_bar', 'interstitial', 'rewarded')),
  enabled       BOOLEAN NOT NULL DEFAULT false,
  script_url    TEXT,
  container_id  TEXT,
  smartlink_url TEXT,
  csp_domains   TEXT[] DEFAULT '{}',
  priority      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ad_configurations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ad_configurations' AND policyname='ad_configurations_admin_all') THEN
    CREATE POLICY "ad_configurations_admin_all" ON public.ad_configurations FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ad_configurations' AND policyname='ad_configurations_read_enabled') THEN
    CREATE POLICY "ad_configurations_read_enabled" ON public.ad_configurations FOR SELECT USING (enabled = true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ad_configurations_type_enabled
  ON public.ad_configurations(ad_type, enabled) WHERE enabled = true;

-- ====================================================================================
-- 24. FUNCIONES RPC COMPLETA (ESTADÍSTICAS, NIVEL, COMPRAR Y EQUIPAR)
-- ====================================================================================

-- ELO Division Helper
CREATE OR REPLACE FUNCTION public.get_player_division(player_elo INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF    player_elo < 1200 THEN RETURN 'bronze';
  ELSIF player_elo < 1500 THEN RETURN 'silver';
  ELSIF player_elo < 1800 THEN RETURN 'gold';
  ELSIF player_elo < 2100 THEN RETURN 'platinum';
  ELSE                         RETURN 'diamond';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Level Helper
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(SQRT(xp / 100.0))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add XP
CREATE OR REPLACE FUNCTION public.add_player_xp(p_player_id UUID, p_xp INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    xp    = xp + p_xp,
    level = FLOOR(SQRT((xp + p_xp) / 100.0))::INTEGER
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Stats
CREATE OR REPLACE FUNCTION public.update_player_stats(
  p_player_id  UUID,
  p_is_winner  BOOLEAN,
  p_elo_change INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    elo    = elo + p_elo_change,
    wins   = wins   + CASE WHEN p_is_winner THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN p_is_winner THEN 0 ELSE 1 END
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seasonal Elo Reset
CREATE OR REPLACE FUNCTION public.apply_seasonal_elo_reset()
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET elo = ROUND(elo + 0.2 * (1500 - elo))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comprar un artículo de la tienda
CREATE OR REPLACE FUNCTION public.buy_store_item(p_item_id UUID)
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

    -- Verificar si ya lo tiene en su inventario
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

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Equipar un artículo del inventario (Soporta avatars, títulos, tapetes y temas visuales)
CREATE OR REPLACE FUNCTION public.equip_store_item(p_item_id UUID)
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

    -- Obtener info del artículo
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
        UPDATE public.profiles SET equipped_theme = v_theme_key WHERE id = auth.uid();
    ELSE
        RAISE EXCEPTION 'Tipo de artículo desconocido.';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================================
-- 25. DATOS INICIALES (LOGROS, TÍTULOS Y TEMAS VISUALES)
-- ====================================================================================

-- 25.1 Logros
INSERT INTO public.achievements (code, name, description, category, xp_reward, criteria) VALUES
  ('FIRST_WIN',         'Primera Victoria',     'Gana tu primera partida',             'beginner',      50, 'wins >= 1'),
  ('TEN_WINS',          'Diez Victorias',        'Gana 10 partidas',                    'beginner',     100, 'wins >= 10'),
  ('FIFTY_WINS',        'Cincuenta Victorias',   'Gana 50 partidas',                    'intermediate', 300, 'wins >= 50'),
  ('HUNDRED_WINS',      'Cien Victorias',        'Gana 100 partidas',                   'intermediate', 500, 'wins >= 100'),
  ('FIVE_HUNDRED_WINS', 'Quinientas Victorias',  'Gana 500 partidas',                   'advanced',    1000, 'wins >= 500'),
  ('ELO_1200',          'Plata',                 'Alcanza 1200 de ELO',                 'beginner',     100, 'elo >= 1200'),
  ('ELO_1500',          'Maestro de Oro',        'Alcanza 1500 de ELO',                 'intermediate', 200, 'elo >= 1500'),
  ('ELO_1800',          'Platino',               'Alcanza 1800 de ELO',                 'advanced',     350, 'elo >= 1800'),
  ('ELO_2100',          'Diamante',              'Alcanza 2100 de ELO',                 'advanced',     500, 'elo >= 2100'),
  ('TEN_VIRADOS',       'Virado Maestro',        'Consigue 10 virados en partidas',     'advanced',     300, 'virados >= 10'),
  ('TOURNAMENT_CHAMP',  'Campeon de Torneo',     'Gana un torneo',                      'master',       500, 'tournament_wins >= 1'),
  ('THREE_TOURNAMENTS', 'Tricampeon',            'Gana 3 torneos',                      'master',      1000, 'tournament_wins >= 3'),
  ('SEASON_TOP10',      'Top 10 de Temporada',   'Queda en top 10 en una temporada',    'master',      1000, 'season_top10 >= 1'),
  ('SEASON_TOP50',      'Top 50 de Temporada',   'Queda en top 50 en una temporada',    'advanced',     500, 'season_top50 >= 1'),
  ('FIRST_GAME',        'Primer Juego',          'Juega tu primera partida',            'beginner',      25, 'total_games >= 1'),
  ('HUNDRED_GAMES',     'Centenario',            'Juega 100 partidas',                  'intermediate', 200, 'total_games >= 100'),
  ('WIN_STREAK_5',      'Racha de 5',            'Consigue una racha de 5 victorias',   'intermediate', 150, 'best_streak >= 5'),
  ('WIN_STREAK_10',     'Racha de 10',           'Consigue una racha de 10 victorias',  'advanced',     400, 'best_streak >= 10'),
  ('SOCIAL_BUTTERFLY',  'Mariposa Social',       'Anade 10 amigos',                     'beginner',      75, 'friends >= 10'),
  ('VETERAN',           'Veterano',              'Juega durante 30 dias',               'master',       750, 'days_played >= 30')
ON CONFLICT (code) DO NOTHING;

-- 25.2 Títulos
INSERT INTO public.titles (code, name, description, xp_requirement, is_premium) VALUES
  ('NOVICE',   'Novato',   'Jugador principiante',        0,      FALSE),
  ('BRONZE',   'Bronce',   'Jugador de division bronce',  1000,   FALSE),
  ('SILVER',   'Plata',    'Jugador de division plata',   5000,   FALSE),
  ('GOLD',     'Oro',      'Jugador de division oro',     15000,  FALSE),
  ('PLATINUM', 'Platino',  'Jugador de division platino', 30000,  FALSE),
  ('DIAMOND',  'Diamante', 'Jugador de division diamante',50000,  FALSE),
  ('CHAMPION', 'Campeon',  'Campeon de torneos',          100000, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 25.3 Temas visuales en themes
INSERT INTO public.themes (key, name, description, emoji, preview_color, price, card_theme, board_theme) VALUES
(
    'default',
    'Clásico',
    'El estilo original del juego, limpio y elegante.',
    '🃏',
    '#ffffff',
    0,
    '{"background":"linear-gradient(165deg, #ffffff 0%, #f8fafc 35%, #e2e8f0 100%)","boxShadow":"0 10px 20px -6px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.45) inset, inset 0 2px 6px rgba(255,255,255,0.9)","boxShadowSelected":"0 22px 40px -10px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.45) inset, inset 0 2px 6px rgba(255,255,255,0.9)","border":"1px solid rgba(255,255,255,0.55)","innerEdge":"rgba(148,163,184,0.8)","redSuitColor":"#dc2626","blackSuitColor":"#111827"}'::jsonb,
    '{"background":"radial-gradient(circle at 50% 20%, rgba(56,189,248,0.2) 0%, rgba(15,23,42,0) 38%), radial-gradient(circle at 50% 100%, rgba(14,116,144,0.25) 0%, rgba(8,47,73,0.05) 45%), linear-gradient(145deg, #0a3258 0%, #07263f 45%, #041a2e 100%)","borderColor":"#2A1810","glowColor":"rgba(34,211,238,0.4)","innerRingColor":"rgba(253,224,71,0.35)","watermarkOpacity":0.1}'::jsonb
),
(
    'vault_noir',
    'Vault Noir',
    'Casino de lujo. Cartas crema envejecidas sobre terciopelo negro.',
    '🖤',
    '#1a1208',
    600,
    '{"background":"linear-gradient(160deg, #fdf8ee 0%, #f5ead4 50%, #ede1c4 100%)","boxShadow":"0 10px 28px -6px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,180,130,0.5) inset, inset 0 2px 6px rgba(255,245,220,0.6)","boxShadowSelected":"0 22px 45px -10px rgba(0,0,0,0.8), 0 0 0 2px rgba(212,180,130,0.7) inset, inset 0 2px 8px rgba(255,245,220,0.8)","border":"1px solid rgba(160,120,60,0.6)","innerEdge":"rgba(160,120,60,0.5)","redSuitColor":"#8b1a1a","blackSuitColor":"#1a0f00","extraClass":"font-serif"}'::jsonb,
    '{"background":"radial-gradient(circle at 40% 30%, rgba(60,30,10,0.9) 0%, rgba(8,5,2,0) 55%), linear-gradient(160deg, #1a0e04 0%, #0f0803 60%, #080502 100%)","borderColor":"#5a3a1a","glowColor":"rgba(212,180,100,0.35)","innerRingColor":"rgba(212,175,55,0.3)","overlayGradient":"linear-gradient(135deg, rgba(180,130,40,0.12) 0%, transparent 40%, transparent 60%, rgba(180,130,40,0.08) 100%)","watermarkOpacity":0.06}'::jsonb
),
(
    'neon_dealer',
    'Neon Dealer',
    'Cyberpunk neón. Cada palo brilla con su propio color.',
    '⚡',
    '#0d0d1a',
    800,
    '{"background":"linear-gradient(160deg, #0d0d1a 0%, #111128 50%, #0a0a18 100%)","boxShadow":"0 10px 28px -6px rgba(0,0,0,0.8), 0 0 0 1px rgba(100,80,200,0.4) inset, inset 0 0 12px rgba(80,60,180,0.15)","boxShadowSelected":"0 22px 45px -10px rgba(80,60,200,0.6), 0 0 0 2px rgba(140,100,255,0.6) inset, 0 0 30px rgba(100,80,220,0.4)","border":"1px solid rgba(100,80,200,0.5)","innerEdge":"rgba(100,80,200,0.4)","redSuitColor":"#ff2d55","blackSuitColor":"#00e5ff","extraClass":"font-mono"}'::jsonb,
    '{"background":"radial-gradient(circle at 50% 30%, rgba(80,40,160,0.35) 0%, rgba(5,5,20,0) 50%), linear-gradient(145deg, #050510 0%, #080820 50%, #030310 100%)","borderColor":"#1a1040","glowColor":"rgba(80,60,255,0.5)","innerRingColor":"rgba(80,60,255,0.25)","overlayGradient":"linear-gradient(135deg, rgba(255,40,80,0.08) 0%, transparent 40%, transparent 60%, rgba(0,200,255,0.08) 100%)","watermarkOpacity":0.08}'::jsonb
),
(
    'gold_rush',
    'Gold Rush',
    'Premium glassmorphism. Dorado y cristal sobre fondo oscuro.',
    '✨',
    '#1a1200',
    750,
    '{"background":"linear-gradient(160deg, rgba(255,245,200,0.18) 0%, rgba(255,215,0,0.08) 50%, rgba(200,160,0,0.12) 100%)","boxShadow":"0 10px 28px -6px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,215,0,0.35) inset, inset 0 2px 8px rgba(255,220,50,0.15)","boxShadowSelected":"0 22px 45px -10px rgba(200,150,0,0.55), 0 0 0 2px rgba(255,215,0,0.6) inset, 0 0 40px rgba(255,200,0,0.3)","border":"1px solid rgba(255,215,0,0.4)","innerEdge":"rgba(255,215,0,0.3)","redSuitColor":"#fbbf24","blackSuitColor":"#fef3c7","extraClass":"backdrop-blur-sm"}'::jsonb,
    '{"background":"radial-gradient(circle at 50% 20%, rgba(180,140,0,0.3) 0%, rgba(10,8,0,0) 55%), linear-gradient(145deg, #100d00 0%, #0c0a00 55%, #080600 100%)","borderColor":"#3d2e00","glowColor":"rgba(255,215,0,0.45)","innerRingColor":"rgba(255,215,0,0.3)","overlayGradient":"linear-gradient(135deg, rgba(255,215,0,0.12) 0%, transparent 35%, transparent 65%, rgba(255,215,0,0.08) 100%)","watermarkOpacity":0.07}'::jsonb
),
(
    'bento_casino',
    'Bento Casino',
    'Minimalismo Apple. Tarjetas limpias, sombras perfectas y tipografía suave.',
    '🍱',
    '#f5f5f7',
    500,
    '{"background":"linear-gradient(160deg, #ffffff 0%, #fafafa 50%, #f2f2f7 100%)","boxShadow":"0 8px 24px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)","boxShadowSelected":"0 18px 36px -8px rgba(0,0,0,0.22), 0 0 0 2px rgba(0,122,255,0.5)","border":"1px solid rgba(0,0,0,0.08)","innerEdge":"rgba(0,0,0,0.04)","redSuitColor":"#ff3b30","blackSuitColor":"#1d1d1f"}'::jsonb,
    '{"background":"linear-gradient(160deg, #1c1c1e 0%, #2c2c2e 50%, #1c1c1e 100%)","borderColor":"#3a3a3c","glowColor":"rgba(0,122,255,0.4)","innerRingColor":"rgba(255,255,255,0.1)","overlayGradient":"radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)","watermarkOpacity":0.04}'::jsonb
),
(
    'tactile_vegas',
    'Tactile Vegas',
    'Efecto clay 3D con colores vibrantes y físicas de rebote.',
    '🎰',
    '#4a1942',
    900,
    '{"background":"linear-gradient(160deg, #f8f0ff 0%, #efe0ff 50%, #e0caff 100%)","boxShadow":"0 6px 0 #8b5cf6, 0 12px 24px -6px rgba(100,60,180,0.5), inset 0 2px 4px rgba(255,255,255,0.6)","boxShadowSelected":"0 2px 0 #8b5cf6, 0 6px 20px -4px rgba(100,60,180,0.6), inset 0 2px 4px rgba(255,255,255,0.7)","border":"1.5px solid rgba(139,92,246,0.4)","innerEdge":"rgba(139,92,246,0.25)","redSuitColor":"#e11d48","blackSuitColor":"#5b21b6","extraClass":"font-bold"}'::jsonb,
    '{"background":"radial-gradient(circle at 50% 30%, rgba(120,60,160,0.5) 0%, rgba(30,0,60,0) 60%), linear-gradient(145deg, #2d0f3f 0%, #1a0828 55%, #0f0520 100%)","borderColor":"#5b21b6","glowColor":"rgba(139,92,246,0.5)","innerRingColor":"rgba(200,140,255,0.3)","overlayGradient":"linear-gradient(135deg, rgba(200,100,255,0.1) 0%, transparent 40%, transparent 60%, rgba(100,200,255,0.08) 100%)","watermarkOpacity":0.08}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 25.4 Insertar Artículos en el Catálogo de la Tienda (Seeds base + Temas)
INSERT INTO public.store_items (name, description, item_type, price, image_url, theme_key, is_active) VALUES
    -- Artículos de Inventario Tradicionales
    ('Reverso Dorado', 'Un elegante reverso con bordes de oro puro.', 'card_back', 500, 'gold_back.png', NULL, TRUE),
    ('Reverso Neón', 'Reverso con luces de neón ciberpunk.', 'card_back', 800, 'neon_back.png', NULL, TRUE),
    ('Título: El Rey del Casino', 'Muestra a todos quién manda.', 'title', 1500, NULL, NULL, TRUE),
    ('Título: Estratega', 'Para los que calculan cada movimiento.', 'title', 1000, NULL, NULL, TRUE),
    ('Tapete VIP', 'Mesa de fieltro oscuro exclusivo VIP.', 'board', 2500, 'vip_board.png', NULL, TRUE),
    ('Avatar: El Gato', 'Un gato con gafas de sol.', 'avatar', 1200, 'cat_avatar.png', NULL, TRUE),
    
    -- Artículos de Temas Completos de la Tienda
    ('Vault Noir', 'Casino de lujo. Cartas crema envejecidas sobre terciopelo negro.', 'theme', 600, NULL, 'vault_noir', TRUE),
    ('Neon Dealer', 'Cyberpunk neón. Cada palo brilla con su propio color.', 'theme', 800, NULL, 'neon_dealer', TRUE),
    ('Gold Rush', 'Premium glassmorphism. Dorado y cristal sobre fondo oscuro.', 'theme', 750, NULL, 'gold_rush', TRUE),
    ('Bento Casino', 'Minimalismo Apple. Tarjetas limpias, sombras perfectas y tipografía suave.', 'theme', 500, NULL, 'bento_casino', TRUE),
    ('Tactile Vegas', 'Efecto clay 3D con colores vibrantes y físicas de rebote.', 'theme', 900, NULL, 'tactile_vegas', TRUE)
ON CONFLICT (theme_key) DO NOTHING;
