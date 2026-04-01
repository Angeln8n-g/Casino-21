-- Agregar columna metadata a notifications
-- Ejecutar en Supabase: SQL Editor → New query

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
