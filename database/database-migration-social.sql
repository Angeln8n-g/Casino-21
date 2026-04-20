-- ============================================================
-- MIGRACIÓN CONSOLIDADA: Funcionalidades Sociales y Competitivas
-- Fuente de verdad única. Reemplaza:
--   - server/src/migrations/social-competitive-features.sql
--   - database-migration-social.sql (versión anterior)
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- NOTA SOBRE ORDEN DE EJECUCIÓN
-- Ejecutar DESPUÉS de database-schema.sql (que crea profiles y matches)
-- ============================================================


-- ============================================================
-- 1. TORNEOS
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  creator_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  max_players   INTEGER NOT NULL CHECK (max_players IN (4, 8, 16, 32)),
  current_players INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'waiting'
                  CHECK (status IN ('waiting', 'in_progress', 'completed')),
  bracket       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tournaments_code     ON tournaments(code);
CREATE INDEX IF NOT EXISTS idx_tournaments_status   ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_creator  ON tournaments(creator_id);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournaments_select" ON tournaments FOR SELECT USING (true);
CREATE POLICY "tournaments_insert" ON tournaments FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "tournaments_update_service" ON tournaments FOR UPDATE USING (auth.role() = 'service_role');


-- ============================================================
-- 2. PARTICIPANTES DE TORNEO
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  final_position INTEGER,
  UNIQUE(tournament_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_tp_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tp_player     ON tournament_participants(player_id);

ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tp_select" ON tournament_participants FOR SELECT USING (true);
CREATE POLICY "tp_all_service" ON tournament_participants FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 3. PARTIDAS DE TORNEO
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number  INTEGER NOT NULL,
  player1_id    UUID REFERENCES profiles(id),
  player2_id    UUID REFERENCES profiles(id),
  winner_id     UUID REFERENCES profiles(id),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'completed', 'no_show')),
  room_id       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tm_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tm_round      ON tournament_matches(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_tm_player1    ON tournament_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_tm_player2    ON tournament_matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_tm_status     ON tournament_matches(status);

ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tm_select" ON tournament_matches FOR SELECT USING (true);
CREATE POLICY "tm_all_service" ON tournament_matches FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 4. TEMPORADAS
-- Columna "status" usada por LeagueManager (.eq('status','active'))
-- Columna "number" usada por LeagueManager (.select('number'))
-- ============================================================
CREATE TABLE IF NOT EXISTS seasons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number        INTEGER UNIQUE NOT NULL,
  start_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date      TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_seasons_status ON seasons(status);
CREATE INDEX IF NOT EXISTS idx_seasons_dates  ON seasons(start_date, end_date);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_select" ON seasons FOR SELECT USING (true);
CREATE POLICY "seasons_all_service" ON seasons FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 5. RANKINGS DE TEMPORADA
-- LeagueManager usa: player_id, elo, wins, losses, season_number, division, final_rank, final_elo
-- ============================================================
CREATE TABLE IF NOT EXISTS season_rankings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id     UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,   -- desnormalizado para queries directas
  player_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  division      TEXT NOT NULL,
  elo           INTEGER NOT NULL DEFAULT 1000,
  final_rank    INTEGER,
  final_elo     INTEGER,
  wins          INTEGER NOT NULL DEFAULT 0,
  losses        INTEGER NOT NULL DEFAULT 0,
  UNIQUE(season_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_sr_season  ON season_rankings(season_id);
CREATE INDEX IF NOT EXISTS idx_sr_player  ON season_rankings(player_id);
CREATE INDEX IF NOT EXISTS idx_sr_div_elo ON season_rankings(season_id, division, elo DESC);

ALTER TABLE season_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_select" ON season_rankings FOR SELECT USING (true);
CREATE POLICY "sr_all_service" ON season_rankings FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 6. MENSAJES DE CHAT
-- ChatManager usa: room_id, sender_id, content, reported, moderation_status, timestamp
-- checkRateLimit filtra por sender_id + timestamp
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id           TEXT NOT NULL,
  sender_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content           TEXT NOT NULL CHECK (LENGTH(content) BETWEEN 1 AND 200),
  reported          BOOLEAN NOT NULL DEFAULT FALSE,
  moderation_status TEXT NOT NULL DEFAULT 'pending'
                      CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cm_room    ON chat_messages(room_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cm_sender  ON chat_messages(sender_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cm_reported ON chat_messages(reported) WHERE reported = TRUE;

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_select" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "cm_insert" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "cm_update_service" ON chat_messages FOR UPDATE USING (auth.role() = 'service_role');


-- ============================================================
-- 7. AMISTADES
-- FriendsManager usa: player1_id, player2_id, status ('accepted')
-- NO tiene columna accepted_at — se elimina del INSERT en el código
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'accepted',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player1_id, player2_id)
);

CREATE INDEX IF NOT EXISTS idx_fs_player1 ON friendships(player1_id);
CREATE INDEX IF NOT EXISTS idx_fs_player2 ON friendships(player2_id);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fs_select" ON friendships FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "fs_all_service" ON friendships FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 8. SOLICITUDES DE AMISTAD
-- FriendsManager usa: sender_id, receiver_id, status, responded_at
-- ============================================================
CREATE TABLE IF NOT EXISTS friend_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_fr_sender   ON friend_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_fr_receiver ON friend_requests(receiver_id, status);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr_select" ON friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "fr_insert" ON friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "fr_update_service" ON friend_requests FOR UPDATE USING (auth.role() = 'service_role');


-- ============================================================
-- 9. INVITACIONES A PARTIDA
-- FriendsManager usa: sender_id, receiver_id, room_id, status, responded_at
-- ============================================================
CREATE TABLE IF NOT EXISTS game_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  room_id      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes'
);

CREATE INDEX IF NOT EXISTS idx_gi_sender   ON game_invitations(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_gi_receiver ON game_invitations(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_gi_expires  ON game_invitations(expires_at);

ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gi_select" ON game_invitations FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "gi_insert" ON game_invitations FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "gi_update_service" ON game_invitations FOR UPDATE USING (auth.role() = 'service_role');


-- ============================================================
-- 10. HISTORIAL DE ELO
-- StatsManager usa: player_id, elo, change, timestamp, reason
-- ============================================================
CREATE TABLE IF NOT EXISTS elo_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  elo        INTEGER NOT NULL,
  change     INTEGER NOT NULL DEFAULT 0,
  reason     TEXT NOT NULL DEFAULT 'match'
               CHECK (reason IN ('match', 'season_reset', 'tournament')),
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eh_player_ts ON elo_history(player_id, timestamp DESC);

ALTER TABLE elo_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eh_select" ON elo_history FOR SELECT USING (true);
CREATE POLICY "eh_all_service" ON elo_history FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 11. LOGROS (catálogo)
-- AchievementsManager usa: id, code, name, description, category, xp_reward, criteria
-- ============================================================
CREATE TABLE IF NOT EXISTS achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('beginner', 'intermediate', 'advanced', 'master')),
  xp_reward   INTEGER NOT NULL DEFAULT 0,
  criteria    TEXT NOT NULL DEFAULT ''
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ach_select" ON achievements FOR SELECT USING (true);
CREATE POLICY "ach_all_service" ON achievements FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 12. LOGROS DE JUGADOR
-- AchievementsManager usa: player_id, achievement_id, unlocked_at
-- ============================================================
CREATE TABLE IF NOT EXISTS player_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_pa_player      ON player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_pa_achievement ON player_achievements(achievement_id);

ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_select" ON player_achievements FOR SELECT
  USING (auth.uid() = player_id);
CREATE POLICY "pa_all_service" ON player_achievements FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 13. TÍTULOS (catálogo)
-- AchievementsManager usa: id, code, name, description, xp_requirement, is_premium
-- ============================================================
CREATE TABLE IF NOT EXISTS titles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  xp_requirement  INTEGER NOT NULL DEFAULT 0,
  is_premium      BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "titles_select" ON titles FOR SELECT USING (true);
CREATE POLICY "titles_all_service" ON titles FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 14. TÍTULOS DE JUGADOR
-- AchievementsManager usa: player_id, title_id, unlocked_at, is_active
-- ============================================================
CREATE TABLE IF NOT EXISTS player_titles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title_id    UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(player_id, title_id)
);

CREATE INDEX IF NOT EXISTS idx_pt_player ON player_titles(player_id);
CREATE INDEX IF NOT EXISTS idx_pt_title  ON player_titles(title_id);

ALTER TABLE player_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pt_select" ON player_titles FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "pt_all_service" ON player_titles FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 15. NOTIFICACIONES
-- NotificationManager usa: player_id, type, content, is_read, created_at
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL
               CHECK (type IN (
                 'friend_request','game_invitation','tournament_start',
                 'round_ready','achievement','level_up','division_change'
               )),
  content    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_player    ON notifications(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_unread    ON notifications(player_id, is_read) WHERE is_read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "notif_all_service" ON notifications FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 16. REPORTES DE JUGADORES
-- ModerationManager usa: reporter_id, reported_id, reason, evidence, status, created_at
-- ChatManager también inserta aquí con reported_id = message_id (evidencia)
-- ============================================================
CREATE TABLE IF NOT EXISTS player_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  evidence     TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'reviewed', 'actioned')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_reported ON player_reports(reported_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pr_reporter ON player_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_pr_status   ON player_reports(status);

ALTER TABLE player_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_select_service" ON player_reports FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "pr_insert" ON player_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "pr_update_service" ON player_reports FOR UPDATE USING (auth.role() = 'service_role');


-- ============================================================
-- 17. BLOQUEOS DE JUGADORES
-- ModerationManager usa: blocker_id, blocked_id, created_at
-- ============================================================
CREATE TABLE IF NOT EXISTS player_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_pb_blocker ON player_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_pb_blocked ON player_blocks(blocked_id);

ALTER TABLE player_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_select" ON player_blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "pb_all_service" ON player_blocks FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 18. BANEOS TEMPORALES
-- ModerationManager usa: player_id, reason, duration_hours, expires_at, is_active, created_at
-- getActiveBan filtra por is_active + expires_at
-- ============================================================
CREATE TABLE IF NOT EXISTS temporary_bans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason         TEXT NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 24,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tb_player  ON temporary_bans(player_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_active  ON temporary_bans(is_active, expires_at) WHERE is_active = TRUE;

ALTER TABLE temporary_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tb_select_service" ON temporary_bans FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "tb_all_service" ON temporary_bans FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 19. RATE LIMITS
-- ChatManager y ModerationManager usan: player_id, action_type, count, window_start
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type  TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rl_player_action ON rate_limits(player_id, action_type, window_start DESC);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rl_select_service" ON rate_limits FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "rl_all_service" ON rate_limits FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 20. EXTENDER TABLA PROFILES
-- RewardsManager usa: xp, level
-- AchievementsManager usa: active_title_id (via setActiveTitle)
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp           INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level        INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_title_id UUID REFERENCES titles(id);

CREATE INDEX IF NOT EXISTS idx_profiles_active_title ON profiles(active_title_id);


-- ============================================================
-- 21. FUNCIONES AUXILIARES
-- ============================================================

-- División por ELO (usada por LeagueManager.calculateDivision)
CREATE OR REPLACE FUNCTION get_player_division(player_elo INTEGER)
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

-- Nivel desde XP: floor(sqrt(xp/100))  — igual que RewardsManager.calculateLevel
CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(SQRT(xp / 100.0));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Soft reset de ELO al inicio de temporada: E_new = E + 0.2*(1500-E)
-- Llamado por LeagueManager.applySeasonalEloReset via supabase.rpc('apply_seasonal_elo_reset')
CREATE OR REPLACE FUNCTION apply_seasonal_elo_reset()
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET elo = ROUND(elo + 0.2 * (1500 - elo))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Añadir XP y recalcular nivel
-- Llamado por AchievementsManager.addXP y RewardsManager.addXP via supabase.rpc('add_player_xp')
CREATE OR REPLACE FUNCTION add_player_xp(p_player_id UUID, p_xp INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    xp    = xp + p_xp,
    level = FLOOR(SQRT((xp + p_xp) / 100.0))::INTEGER
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar stats tras partida
-- Llamado por StatsManager.recordMatchResult via supabase.rpc('update_player_stats')
CREATE OR REPLACE FUNCTION update_player_stats(
  p_player_id UUID,
  p_is_winner BOOLEAN,
  p_elo_change INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    elo    = elo + p_elo_change,
    wins   = wins   + CASE WHEN p_is_winner THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN p_is_winner THEN 0 ELSE 1 END
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 22. TRIGGER updated_at genérico
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles ya tiene updated_at desde database-schema.sql
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
