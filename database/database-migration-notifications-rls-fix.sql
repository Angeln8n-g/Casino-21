-- Fix RLS policies for notifications so users can delete their own notifications
-- Execute this in Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'notif_delete_own'
  ) THEN
    CREATE POLICY "notif_delete_own"
      ON public.notifications
      FOR DELETE
      USING (auth.uid() = player_id);
  END IF;
END $$;
