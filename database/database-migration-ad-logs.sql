-- ============================================================
-- MIGRACIÓN: Registro de eventos de anuncios (Analytics & Tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ad_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id   UUID REFERENCES public.ad_configurations(id) ON DELETE SET NULL,
  ad_type     TEXT NOT NULL CHECK (ad_type IN ('banner', 'social_bar', 'interstitial', 'rewarded')),
  event_type  TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'complete', 'blocked', 'error')),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.ad_logs ENABLE ROW LEVEL SECURITY;

-- Los usuarios (incluyendo anónimos) pueden insertar logs
CREATE POLICY "ad_logs_insert_policy"
  ON public.ad_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Solo administradores pueden leer todos los logs
CREATE POLICY "ad_logs_admin_select_policy"
  ON public.ad_logs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Solo administradores pueden eliminar logs (limpieza/reseteo)
CREATE POLICY "ad_logs_admin_delete_policy"
  ON public.ad_logs
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Índices para optimizar consultas del Dashboard
CREATE INDEX IF NOT EXISTS idx_ad_logs_type_event ON public.ad_logs(ad_type, event_type);
CREATE INDEX IF NOT EXISTS idx_ad_logs_created_at ON public.ad_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_logs_config_id ON public.ad_logs(config_id);
