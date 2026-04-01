import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('Database Schema Migration Validation', () => {
  let migrationContent: string;

  beforeAll(() => {
    const migrationPath = path.join(__dirname, '../migrations/social-competitive-features.sql');
    migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  });

  describe('Migration File Structure', () => {
    it('should exist and be readable', () => {
      expect(migrationContent).toBeDefined();
      expect(migrationContent.length).toBeGreaterThan(0);
    });

    it('should enable uuid-ossp extension', () => {
      expect(migrationContent).toContain('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    });

    it('should create tournaments table', () => {
      expect(migrationContent).toContain('CREATE TABLE tournaments (');
      expect(migrationContent).toContain('code VARCHAR(6) UNIQUE NOT NULL');
      expect(migrationContent).toContain('max_players INTEGER NOT NULL CHECK (max_players IN (4, 8, 16, 32))');
      expect(migrationContent).toContain('status VARCHAR(20) DEFAULT \'waiting\' CHECK (status IN (\'waiting\', \'in_progress\', \'completed\'))');
    });

    it('should create tournament_participants table', () => {
      expect(migrationContent).toContain('CREATE TABLE tournament_participants (');
      expect(migrationContent).toContain('UNIQUE(tournament_id, player_id)');
    });

    it('should create seasons table', () => {
      expect(migrationContent).toContain('CREATE TABLE seasons (');
      expect(migrationContent).toContain('season_number INTEGER UNIQUE NOT NULL');
      expect(migrationContent).toContain('status VARCHAR(20) DEFAULT \'active\' CHECK (status IN (\'active\', \'completed\'))');
    });

    it('should create season_rankings table', () => {
      expect(migrationContent).toContain('CREATE TABLE season_rankings (');
      expect(migrationContent).toContain('division VARCHAR(20) NOT NULL');
    });

    it('should create chat_messages table', () => {
      expect(migrationContent).toContain('CREATE TABLE chat_messages (');
      expect(migrationContent).toContain('content TEXT NOT NULL CHECK (LENGTH(content) BETWEEN 1 AND 200)');
    });

    it('should create friendships table', () => {
      expect(migrationContent).toContain('CREATE TABLE friendships (');
      expect(migrationContent).toContain('CHECK (player1_id < player2_id)');
      expect(migrationContent).toContain('UNIQUE(player1_id, player2_id)');
    });

    it('should create friend_requests table', () => {
      expect(migrationContent).toContain('CREATE TABLE friend_requests (');
      expect(migrationContent).toContain('status VARCHAR(20) DEFAULT \'pending\' CHECK (status IN (\'pending\', \'accepted\', \'rejected\'))');
    });

    it('should create game_invitations table', () => {
      expect(migrationContent).toContain('CREATE TABLE game_invitations (');
      expect(migrationContent).toContain('expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL \'5 minutes\'');
    });

    it('should create player_stats table', () => {
      expect(migrationContent).toContain('CREATE TABLE player_stats (');
      expect(migrationContent).toContain('player_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE');
    });

    it('should create elo_history table', () => {
      expect(migrationContent).toContain('CREATE TABLE elo_history (');
      expect(migrationContent).toContain('recorded_at TIMESTAMPTZ DEFAULT NOW()');
    });

    it('should create achievements table', () => {
      expect(migrationContent).toContain('CREATE TABLE achievements (');
      expect(migrationContent).toContain('category VARCHAR(20) NOT NULL CHECK (category IN (\'beginner\', \'intermediate\', \'advanced\', \'master\'))');
    });

    it('should create player_achievements table', () => {
      expect(migrationContent).toContain('CREATE TABLE player_achievements (');
      expect(migrationContent).toContain('UNIQUE(player_id, achievement_id)');
    });

    it('should create titles table', () => {
      expect(migrationContent).toContain('CREATE TABLE titles (');
      expect(migrationContent).toContain('name VARCHAR(100) UNIQUE NOT NULL');
    });

    it('should create player_titles table', () => {
      expect(migrationContent).toContain('CREATE TABLE player_titles (');
      expect(migrationContent).toContain('UNIQUE(player_id, title_id)');
    });

    it('should create notifications table', () => {
      expect(migrationContent).toContain('CREATE TABLE notifications (');
      expect(migrationContent).toContain('read BOOLEAN DEFAULT FALSE');
    });

    it('should create player_reports table', () => {
      expect(migrationContent).toContain('CREATE TABLE player_reports (');
      expect(migrationContent).toContain('status VARCHAR(20) DEFAULT \'pending\' CHECK (status IN (\'pending\', \'reviewed\', \'actioned\'))');
    });

    it('should create player_blocks table', () => {
      expect(migrationContent).toContain('CREATE TABLE player_blocks (');
      expect(migrationContent).toContain('UNIQUE(player_id, blocked_id)');
    });

    it('should create temporary_bans table', () => {
      expect(migrationContent).toContain('CREATE TABLE temporary_bans (');
      expect(migrationContent).toContain('expires_at TIMESTAMPTZ NOT NULL');
    });

    it('should create rate_limits table', () => {
      expect(migrationContent).toContain('CREATE TABLE rate_limits (');
      expect(migrationContent).toContain('UNIQUE(player_id, action)');
    });

    it('should extend profiles table with xp, level, active_title_id', () => {
      expect(migrationContent).toContain('ALTER TABLE profiles ADD COLUMN xp INTEGER DEFAULT 0');
      expect(migrationContent).toContain('ALTER TABLE profiles ADD COLUMN level INTEGER DEFAULT 1');
      expect(migrationContent).toContain('ALTER TABLE profiles ADD COLUMN active_title_id UUID REFERENCES titles(id)');
    });
  });

  describe('Indexes', () => {
    it('should have indexes for tournaments', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_tournaments_code ON tournaments(code)');
      expect(migrationContent).toContain('CREATE INDEX idx_tournaments_status ON tournaments(status)');
      expect(migrationContent).toContain('CREATE INDEX idx_tournaments_creator ON tournaments(creator_id)');
    });

    it('should have indexes for tournament_participants', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_tournament_participants_tournament ON tournament_participants(tournament_id)');
      expect(migrationContent).toContain('CREATE INDEX idx_tournament_participants_player ON tournament_participants(player_id)');
    });

    it('should have indexes for seasons', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_seasons_status ON seasons(status)');
      expect(migrationContent).toContain('CREATE INDEX idx_seasons_date_range ON seasons(start_date, end_date)');
    });

    it('should have indexes for season_rankings', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_season_rankings_season ON season_rankings(season_id)');
      expect(migrationContent).toContain('CREATE INDEX idx_season_rankings_player ON season_rankings(player_id)');
      expect(migrationContent).toContain('CREATE INDEX idx_season_rankings_division_rank ON season_rankings(season_id, division, final_rank)');
    });

    it('should have indexes for chat_messages', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_chat_messages_room ON chat_messages(room_id, created_at DESC)');
      expect(migrationContent).toContain('CREATE INDEX idx_chat_messages_reported ON chat_messages(reported) WHERE reported = TRUE');
    });

    it('should have indexes for friendships', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_friendships_player1 ON friendships(player1_id)');
      expect(migrationContent).toContain('CREATE INDEX idx_friendships_player2 ON friendships(player2_id)');
      expect(migrationContent).toContain('CREATE INDEX idx_friendships_both ON friendships(player1_id, player2_id)');
    });

    it('should have indexes for friend_requests', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_friend_requests_from ON friend_requests(from_id, status)');
      expect(migrationContent).toContain('CREATE INDEX idx_friend_requests_to ON friend_requests(to_id, status)');
    });

    it('should have indexes for game_invitations', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_game_invitations_from ON game_invitations(from_id, status)');
      expect(migrationContent).toContain('CREATE INDEX idx_game_invitations_to ON game_invitations(to_id, status)');
      expect(migrationContent).toContain('CREATE INDEX idx_game_invitations_expires ON game_invitations(expires_at)');
    });

    it('should have indexes for player_stats', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_player_stats_total_matches ON player_stats(total_matches)');
      expect(migrationContent).toContain('CREATE INDEX idx_player_stats_peak_elo ON player_stats(peak_elo)');
    });

    it('should have indexes for elo_history', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_elo_history_player_date ON elo_history(player_id, recorded_at DESC)');
    });

    it('should have indexes for player_achievements', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_player_achievements_player ON player_achievements(player_id)');
      expect(migrationContent).toContain('CREATE INDEX idx_player_achievements_achievement ON player_achievements(achievement_id)');
    });

    it('should have indexes for player_titles', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_player_titles_player ON player_titles(player_id)');
      expect(migrationContent).toContain('CREATE INDEX idx_player_titles_title ON player_titles(title_id)');
    });

    it('should have indexes for notifications', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_notifications_player_read ON notifications(player_id, read, created_at DESC)');
    });

    it('should have indexes for player_reports', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_player_reports_reported ON player_reports(reported_id, created_at DESC)');
    });

    it('should have indexes for player_blocks', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_player_blocks_player ON player_blocks(player_id)');
    });

    it('should have indexes for temporary_bans', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_temporary_bans_player_expires ON temporary_bans(player_id, expires_at)');
    });

    it('should have indexes for rate_limits', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_rate_limits_player_action ON rate_limits(player_id, action)');
    });

    it('should have index for active_title_id in profiles', () => {
      expect(migrationContent).toContain('CREATE INDEX idx_profiles_active_title ON profiles(active_title_id)');
    });
  });

  describe('Helper Functions', () => {
    it('should have get_player_division function', () => {
      expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION get_player_division');
      expect(migrationContent).toContain('IF player_elo < 1200 THEN');
      expect(migrationContent).toContain('RETURN \'bronze\'');
    });

    it('should have calculate_level_from_xp function', () => {
      expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION calculate_level_from_xp');
      expect(migrationContent).toContain('RETURN FLOOR(SQRT(xp / 100.0))');
    });

    it('should have get_xp_for_next_level function', () => {
      expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION get_xp_for_next_level');
      expect(migrationContent).toContain('RETURN (POWER(current_level + 1, 2) * 100)');
    });
  });

  describe('Row Level Security (RLS)', () => {
    it('should enable RLS on tournaments', () => {
      expect(migrationContent).toContain('ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on tournament_participants', () => {
      expect(migrationContent).toContain('ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on seasons', () => {
      expect(migrationContent).toContain('ALTER TABLE seasons ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on season_rankings', () => {
      expect(migrationContent).toContain('ALTER TABLE season_rankings ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on chat_messages', () => {
      expect(migrationContent).toContain('ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on friendships', () => {
      expect(migrationContent).toContain('ALTER TABLE friendships ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on friend_requests', () => {
      expect(migrationContent).toContain('ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on game_invitations', () => {
      expect(migrationContent).toContain('ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on player_stats', () => {
      expect(migrationContent).toContain('ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on elo_history', () => {
      expect(migrationContent).toContain('ALTER TABLE elo_history ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on achievements', () => {
      expect(migrationContent).toContain('ALTER TABLE achievements ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on player_achievements', () => {
      expect(migrationContent).toContain('ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on titles', () => {
      expect(migrationContent).toContain('ALTER TABLE titles ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on player_titles', () => {
      expect(migrationContent).toContain('ALTER TABLE player_titles ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on notifications', () => {
      expect(migrationContent).toContain('ALTER TABLE notifications ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on player_reports', () => {
      expect(migrationContent).toContain('ALTER TABLE player_reports ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on player_blocks', () => {
      expect(migrationContent).toContain('ALTER TABLE player_blocks ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on temporary_bans', () => {
      expect(migrationContent).toContain('ALTER TABLE temporary_bans ENABLE ROW LEVEL SECURITY');
    });

    it('should enable RLS on rate_limits', () => {
      expect(migrationContent).toContain('ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY');
    });
  });
});
