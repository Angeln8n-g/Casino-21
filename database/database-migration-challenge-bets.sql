-- ============================================================
-- Migration: Challenge Bet Amounts
-- Adds bet_amount to game_invitations so friend challenges
-- can include a coin wager alongside the invitation.
-- Phase 1: 1v1 only. Phase 2 will extend to 2v2.
-- ============================================================

ALTER TABLE game_invitations
  ADD COLUMN IF NOT EXISTS bet_amount INTEGER NOT NULL DEFAULT 0;
