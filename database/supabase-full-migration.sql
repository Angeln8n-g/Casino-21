-- ================================================================
-- CASINO 21 — MIGRACIÓN COMPLETA v2
-- Ejecutar en Supabase: SQL Editor → New query
-- Si ya tienes tablas: ejecuta supabase-reset.sql primero
-- ================================================================

SET search_path TO public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PASO 1: PROFILES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE NOT NULL,
  elo        INTEGER NOT NULL DEFAULT 1000,
  wins       INTEGER NOT NULL DEFAULT 0,
  losses     INTEGER NOT NULL DEFAULT 0,
  xp         INTEGER NOT NULL DEFAULT 0,
  level      INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', 'Player'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
-- ================================================================
-- PASO 2: MATCHES
-- ================================================================
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

-- ================================================================
-- PASO 3: TITLES (antes de profiles.active_title_id)
-- ================================================================
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

-- ================================================================
-- PASO 4: TOURNAMENTS
-- ================================================================
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

-- ================================================================
-- PASO 5: TOURNAMENT_PARTICIPANTS
-- ================================================================
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

-- ================================================================
-- PASO 6: TOURNAMENT_MATCHES
-- ================================================================
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

-- ================================================================
-- PASO 7: SEASONS
-- ================================================================
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

-- ================================================================
-- PASO 8: SEASON_RANKINGS
-- ================================================================
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

-- ================================================================
-- PASO 9: CHAT_MESSAGES
-- ================================================================
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

-- ================================================================
-- PASO 10: FRIENDSHIPS
-- ================================================================
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

-- ================================================================
-- PASO 11: FRIEND_REQUESTS
-- ================================================================
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

-- ================================================================
-- PASO 12: GAME_INVITATIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.game_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  room_id       TEXT,
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

-- ================================================================
-- PASO 13: ELO_HISTORY
-- ================================================================
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

-- ================================================================
-- PASO 14: ACHIEVEMENTS
-- ================================================================
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

-- ================================================================
-- PASO 15: PLAYER_ACHIEVEMENTS
-- ================================================================
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

-- ================================================================
-- PASO 16: PLAYER_TITLES
-- ================================================================
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

-- ================================================================
-- PASO 17: NOTIFICATIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN (
               'friend_request','game_invitation','tournament_start',
               'round_ready','achievement','level_up','division_change'
             )),
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

-- ================================================================
-- PASO 18: PLAYER_REPORTS
-- ================================================================
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

-- ================================================================
-- PASO 19: PLAYER_BLOCKS
-- ================================================================
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

-- ================================================================
-- PASO 20: TEMPORARY_BANS
-- ================================================================
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

-- ================================================================
-- PASO 21: RATE_LIMITS
-- ================================================================
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

-- ================================================================
-- PASO 22: FUNCIONES RPC
-- ================================================================

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

CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(SQRT(xp / 100.0))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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

CREATE OR REPLACE FUNCTION public.apply_seasonal_elo_reset()
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET elo = ROUND(elo + 0.2 * (1500 - elo))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- PASO 23: DATOS INICIALES — LOGROS
-- ================================================================
INSERT INTO public.achievements (code, name, description, category, xp_reward, criteria) VALUES
  ('FIRST_WIN',        'Primera Victoria',    'Gana tu primera partida',           'beginner',      50, 'wins >= 1'),
  ('TEN_WINS',         'Diez Victorias',      'Gana 10 partidas',                  'beginner',     100, 'wins >= 10'),
  ('FIFTY_WINS',       'Cincuenta Victorias', 'Gana 50 partidas',                  'intermediate', 300, 'wins >= 50'),
  ('HUNDRED_WINS',     'Cien Victorias',      'Gana 100 partidas',                 'intermediate', 500, 'wins >= 100'),
  ('FIVE_HUNDRED_WINS','500 Victorias',       'Gana 500 partidas',                 'advanced',    1000, 'wins >= 500'),
  ('ELO_1200',         'Plata',               'Alcanza 1200 de ELO',               'beginner',     100, 'elo >= 1200'),
  ('ELO_1500',         'Maestro de Oro',      'Alcanza 1500 de ELO',               'intermediate', 200, 'elo >= 1500'),
  ('ELO_1800',         'Platino',             'Alcanza 1800 de ELO',               'advanced',     350, 'elo >= 1800'),
  ('ELO_2100',         'Diamante',            'Alcanza 2100 de ELO',               'advanced',     500, 'elo >= 2100'),
  ('TEN_VIRADOS',      'Virado Maestro',      'Consigue 10 virados en partidas',   'advanced',     300, 'virados >= 10'),
  ('TOURNAMENT_CHAMP', 'Campeon de Torneo',   'Gana un torneo',                    'master',       500, 'tournament_wins >= 1'),
  ('THREE_TOURNAMENTS','Tricampeon',          'Gana 3 torneos',                    'master',      1000, 'tournament_wins >= 3'),
  ('SEASON_TOP10',     'Top 10 Temporada',    'Queda en top 10 en una temporada',  'master',      1000, 'season_top10 >= 1'),
  ('SEASON_TOP50',     'Top 50 Temporada',    'Queda en top 50 en una temporada',  'advanced',     500, 'season_top50 >= 1'),
  ('FIRST_GAME',       'Primer Juego',        'Juega tu primera partida',          'beginner',      25, 'total_games >= 1'),
  ('HUNDRED_GAMES',    'Centenario',          'Juega 100 partidas',                'intermediate', 200, 'total_games >= 100'),
  ('WIN_STREAK_5',     'Racha de 5',          'Consigue 5 victorias seguidas',     'intermediate', 150, 'best_streak >= 5'),
  ('WIN_STREAK_10',    'Racha de 10',         'Consigue 10 victorias seguidas',    'advanced',     400, 'best_streak >= 10'),
  ('SOCIAL_BUTTERFLY', 'Mariposa Social',     'Añade 10 amigos',                   'beginner',      75, 'friends >= 10'),
  ('VETERAN',          'Veterano',            'Juega durante 30 dias',             'master',       750, 'days_played >= 30')
ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- PASO 24: DATOS INICIALES — TÍTULOS
-- ================================================================
INSERT INTO public.titles (code, name, description, xp_requirement, is_premium) VALUES
  ('NOVICE',   'Novato',   'Jugador principiante',        0,      FALSE),
  ('BRONZE',   'Bronce',   'Division bronce',             1000,   FALSE),
  ('SILVER',   'Plata',    'Division plata',              5000,   FALSE),
  ('GOLD',     'Oro',      'Division oro',                15000,  FALSE),
  ('PLATINUM', 'Platino',  'Division platino',            30000,  FALSE),
  ('DIAMOND',  'Diamante', 'Division diamante',           50000,  FALSE),
  ('CHAMPION', 'Campeon',  'Campeon de torneos',          100000, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- FIN — Migracion completada correctamente
-- ================================================================
-- ================================================================
-- PASO 22: FUNCIONES RPC
-- ================================================================

-- División por ELO
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

-- Nivel desde XP: floor(sqrt(xp/100))
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(SQRT(xp / 100.0))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Añadir XP y recalcular nivel
-- Llamado por: supabase.rpc('add_player_xp', { p_player_id, p_xp })
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

-- Actualizar ELO, wins y losses tras una partida
-- Llamado por: supabase.rpc('update_player_stats', { p_player_id, p_is_winner, p_elo_change })
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

-- Soft reset de ELO al inicio de temporada: E_new = E + 0.2*(1500-E)
-- Llamado por: supabase.rpc('apply_seasonal_elo_reset')
CREATE OR REPLACE FUNCTION public.apply_seasonal_elo_reset()
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET elo = ROUND(elo + 0.2 * (1500 - elo))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- PASO 23: DATOS INICIALES — LOGROS
-- Sincronizados con AchievementsManager.ACHIEVEMENTS
-- ================================================================
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

-- ================================================================
-- PASO 24: DATOS INICIALES — TITULOS
-- Sincronizados con AchievementsManager.TITLES
-- ================================================================
INSERT INTO public.titles (code, name, description, xp_requirement, is_premium) VALUES
  ('NOVICE',   'Novato',   'Jugador principiante',        0,      FALSE),
  ('BRONZE',   'Bronce',   'Jugador de division bronce',  1000,   FALSE),
  ('SILVER',   'Plata',    'Jugador de division plata',   5000,   FALSE),
  ('GOLD',     'Oro',      'Jugador de division oro',     15000,  FALSE),
  ('PLATINUM', 'Platino',  'Jugador de division platino', 30000,  FALSE),
  ('DIAMOND',  'Diamante', 'Jugador de division diamante',50000,  FALSE),
  ('CHAMPION', 'Campeon',  'Campeon de torneos',          100000, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- FIN DE LA MIGRACION
-- ================================================================
-- ================================================================
-- PASO 22: FUNCIONES RPC
-- ================================================================

-- División por ELO
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

-- Nivel desde XP: floor(sqrt(xp/100))
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(SQRT(xp / 100.0))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Añadir XP y recalcular nivel
-- Llamado por: supabase.rpc('add_player_xp', { p_player_id, p_xp })
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

-- Actualizar ELO, wins y losses tras partida
-- Llamado por: supabase.rpc('update_player_stats', { p_player_id, p_is_winner, p_elo_change })
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

-- Soft reset de ELO al inicio de temporada: E_new = E + 0.2*(1500-E)
-- Llamado por: supabase.rpc('apply_seasonal_elo_reset')
CREATE OR REPLACE FUNCTION public.apply_seasonal_elo_reset()
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET elo = ROUND(elo + 0.2 * (1500 - elo))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- PASO 23: DATOS INICIALES — LOGROS
-- Sincronizados con AchievementsManager.ACHIEVEMENTS
-- ================================================================
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

-- ================================================================
-- PASO 24: DATOS INICIALES — TÍTULOS
-- Sincronizados con AchievementsManager.TITLES
-- ================================================================
INSERT INTO public.titles (code, name, description, xp_requirement, is_premium) VALUES
  ('NOVICE',   'Novato',   'Jugador principiante',        0,      FALSE),
  ('BRONZE',   'Bronce',   'Jugador de division bronce',  1000,   FALSE),
  ('SILVER',   'Plata',    'Jugador de division plata',   5000,   FALSE),
  ('GOLD',     'Oro',      'Jugador de division oro',     15000,  FALSE),
  ('PLATINUM', 'Platino',  'Jugador de division platino', 30000,  FALSE),
  ('DIAMOND',  'Diamante', 'Jugador de division diamante',50000,  FALSE),
  ('CHAMPION', 'Campeon',  'Campeon de torneos',          100000, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- FIN DE LA MIGRACION
-- Tablas creadas: profiles, matches, titles, tournaments,
--   tournament_participants, tournament_matches, seasons,
--   season_rankings, chat_messages, friendships, friend_requests,
--   game_invitations, elo_history, achievements, player_achievements,
--   player_titles, notifications, player_reports, player_blocks,
--   temporary_bans, rate_limits
-- Funciones RPC: get_player_division, calculate_level_from_xp,
--   add_player_xp, update_player_stats, apply_seasonal_elo_reset
-- ================================================================
