-- ============================================================
-- MIGRACIÓN: Añadir campo image_url a ad_configurations
-- ============================================================

ALTER TABLE public.ad_configurations ADD COLUMN IF NOT EXISTS image_url TEXT;
