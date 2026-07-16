-- ============================================================
-- Migration: Web Push Notifications Integration
-- Phase 1: Create push_subscriptions table and RLS policies
-- Phase 2: Add challenge_message to game_invitations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index to prevent duplicate subscriptions per user/browser endpoint
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_endpoint ON public.push_subscriptions (user_id, (subscription->>'endpoint'));

-- Index on user_id for faster lookup when sending push notifications
CREATE INDEX IF NOT EXISTS idx_ps_user_id ON public.push_subscriptions(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Select/Insert/Delete Policies for users
CREATE POLICY "ps_select_own" ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ps_insert_own" ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ps_delete_own" ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Admin/Service Role Policy
CREATE POLICY "ps_service_all" ON public.push_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Add challenge_message to game_invitations to support custom offline challenge messages
ALTER TABLE public.game_invitations
  ADD COLUMN IF NOT EXISTS challenge_message TEXT DEFAULT NULL;
