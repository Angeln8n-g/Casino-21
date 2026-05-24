-- ============================================================
-- MIGRACIÓN: Configuración dinámica de anuncios (Admin Panel)
-- ============================================================

CREATE TABLE IF NOT EXISTS ad_configurations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  ad_type       TEXT NOT NULL CHECK (ad_type IN ('banner', 'social_bar', 'interstitial', 'rewarded')),
  enabled       BOOLEAN NOT NULL DEFAULT false,
  script_url    TEXT,
  container_id  TEXT,
  smartlink_url TEXT,
  csp_domains   TEXT[] DEFAULT '{}',
  priority      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ad_configurations ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "ad_configurations_admin_all"
  ON ad_configurations
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- All authenticated users can read enabled configs
CREATE POLICY "ad_configurations_read_enabled"
  ON ad_configurations
  FOR SELECT
  USING (enabled = true);

CREATE INDEX IF NOT EXISTS idx_ad_configurations_type_enabled
  ON ad_configurations(ad_type, enabled)
  WHERE enabled = true;
