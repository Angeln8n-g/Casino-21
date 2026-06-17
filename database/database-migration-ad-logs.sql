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

-- Asegurar que el usuario admin principal angellafraga@gmail.com tenga is_admin = true
-- en la tabla public.profiles para que coincida con otros accesos administrativos
DO $$
BEGIN
  UPDATE public.profiles
  SET is_admin = true
  WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'angellafraga@gmail.com'
  );
END $$;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.ad_logs ENABLE ROW LEVEL SECURITY;

-- Otorgar permisos explícitos sobre las tablas de anuncios para evitar errores 403 de privilegios
GRANT ALL ON public.ad_logs TO postgres;
GRANT ALL ON public.ad_logs TO service_role;
GRANT SELECT, INSERT, DELETE ON public.ad_logs TO authenticated;
GRANT INSERT ON public.ad_logs TO anon;

GRANT ALL ON public.ad_configurations TO postgres;
GRANT ALL ON public.ad_configurations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_configurations TO authenticated;
GRANT SELECT ON public.ad_configurations TO anon;

-- Los usuarios (incluyendo anónimos) pueden insertar logs
DROP POLICY IF EXISTS "ad_logs_insert_policy" ON public.ad_logs;
CREATE POLICY "ad_logs_insert_policy"
  ON public.ad_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Solo administradores pueden leer todos los logs (con bypass compatible por JWT o por perfil)
DROP POLICY IF EXISTS "ad_logs_admin_select_policy" ON public.ad_logs;
CREATE POLICY "ad_logs_admin_select_policy"
  ON public.ad_logs
  FOR SELECT
  USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    OR (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email' = 'angellafraga@gmail.com')
  );

-- Solo administradores pueden eliminar logs (con bypass compatible por JWT o por perfil)
DROP POLICY IF EXISTS "ad_logs_admin_delete_policy" ON public.ad_logs;
CREATE POLICY "ad_logs_admin_delete_policy"
  ON public.ad_logs
  FOR DELETE
  USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    OR (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email' = 'angellafraga@gmail.com')
  );

-- Índices para optimizar consultas del Dashboard
CREATE INDEX IF NOT EXISTS idx_ad_logs_type_event ON public.ad_logs(ad_type, event_type);
CREATE INDEX IF NOT EXISTS idx_ad_logs_created_at ON public.ad_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_logs_config_id ON public.ad_logs(config_id);
