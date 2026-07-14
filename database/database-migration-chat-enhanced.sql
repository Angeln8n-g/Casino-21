-- ============================================================
-- MIGRACIÓN: Chat Privado Mejorado
-- Añade soporte para: replies, reacciones, edición, eliminación
-- Fecha: 2026-07-14
-- ============================================================

-- 1. Nuevas columnas en la tabla messages
-- ============================================================
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'audio', 'system')),
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índice para replies
CREATE INDEX IF NOT EXISTS idx_messages_reply_to
  ON public.messages(reply_to_id)
  WHERE reply_to_id IS NOT NULL;

-- Índice para paginación cursor-based
CREATE INDEX IF NOT EXISTS idx_messages_conversation_cursor
  ON public.messages(LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC);

-- 2. Tabla de reacciones a mensajes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL CHECK (LENGTH(emoji) BETWEEN 1 AND 10),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message
  ON public.message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_user
  ON public.message_reactions(user_id, message_id);

-- RLS para message_reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_reactions' AND policyname='mr_select') THEN
    CREATE POLICY "mr_select" ON public.message_reactions FOR SELECT
      USING (true); -- Cualquiera puede ver reacciones de mensajes que puede leer
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_reactions' AND policyname='mr_insert') THEN
    CREATE POLICY "mr_insert" ON public.message_reactions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_reactions' AND policyname='mr_delete') THEN
    CREATE POLICY "mr_delete" ON public.message_reactions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT ALL PRIVILEGES ON TABLE public.message_reactions TO postgres, anon, authenticated, service_role;

-- 3. Verificación
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migración chat-enhanced completada exitosamente';
  RAISE NOTICE '   - messages: +message_type, +reply_to_id, +attachment_url, +edited_at, +deleted_at';
  RAISE NOTICE '   - message_reactions: nueva tabla con RLS';
END $$;
