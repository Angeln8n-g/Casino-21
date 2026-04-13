-- Chat global compatibility and sync improvements
-- Execute in Supabase SQL Editor

-- 1) Ensure created_at exists for frontend ordering/rendering
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2) Backfill from legacy timestamp column when available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages'
      AND column_name = 'timestamp'
  ) THEN
    EXECUTE '
      UPDATE public.chat_messages
      SET created_at = COALESCE(created_at, "timestamp")
      WHERE created_at IS NULL
    ';
  END IF;
END $$;

-- 3) Normalize room_id to GLOBAL for legacy null rows
UPDATE public.chat_messages
SET room_id = 'GLOBAL'
WHERE room_id IS NULL OR room_id = '';

-- 4) Keep fast reads for global timeline
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
  ON public.chat_messages(room_id, created_at DESC);
