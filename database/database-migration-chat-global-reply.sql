-- ============================================================
-- MIGRACIÓN: Respuestas en Chat Global
-- Añade soporte para responder a mensajes en el chat global
-- Execute in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- Índice para optimizar consultas de respuestas
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to
  ON public.chat_messages(reply_to_id)
  WHERE reply_to_id IS NOT NULL;
