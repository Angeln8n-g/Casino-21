-- ====================================================================================
-- SEED DATA: Configuraciones de prueba y Logs de historial para Publicidad
-- Ejecutar en el SQL Editor de Supabase Studio para inicializar datos de prueba.
-- ====================================================================================

-- 1. LIMPIEZA DE CONFIGURACIONES ANTERIORES DE PRUEBA
DELETE FROM public.ad_logs WHERE metadata->>'seed' = 'true';
DELETE FROM public.ad_configurations WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);

-- 2. INSERTAR CONFIGURACIONES DE PRUEBA ESTÁNDAR
INSERT INTO public.ad_configurations (id, name, ad_type, enabled, script_url, container_id, smartlink_url, image_url, csp_domains, priority)
VALUES
  (
    '11111111-1111-1111-1111-111111111111', 
    'Google AdSense - Banner Principal', 
    'banner', 
    true, 
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', 
    'ad-banner-container', 
    null, 
    null,
    ARRAY['https://*.googlesyndication.com', 'https://*.google.com'], 
    1
  ),
  (
    '22222222-2222-2222-2222-222222222222', 
    'Adsterra - Barra Social Inferior', 
    'social_bar', 
    true, 
    'https://pl21950000.sitecpm.com/socialbar.js', 
    null, 
    null, 
    null,
    ARRAY['https://*.sitecpm.com', 'https://*.adsterra.com'], 
    2
  ),
  (
    '33333333-3333-3333-3333-333333333333', 
    'PropellerAds - Intersticial de Fin de Partida', 
    'interstitial', 
    true, 
    null, 
    null, 
    'https://smartlink-propeller.com/test-link', 
    '/ad_promo_banner.png',
    ARRAY['https://*.smartlink-propeller.com'], 
    1
  ),
  (
    '44444444-4444-4444-4444-444444444444', 
    'Rewarded Video - Cofre de Monedas Diarias', 
    'rewarded', 
    true, 
    null, 
    null, 
    'https://smartlink-rewards.com/coins-link', 
    '/ad_promo_banner.png',
    ARRAY['https://*.smartlink-rewards.com'], 
    1
  );

-- 3. GENERAR LOGS HISTÓRICOS REALISTAS PARA LOS ÚLTIMOS 15 DÍAS
-- eCPM promedio aplicado: Banner: $0.80, Social Bar: $1.20, Interstitial: $3.50, Rewarded: $8.00

-- A. BANNER IMPRESSIONS (~30 por día) & CLICS (~3% CTR) & BLOCKED (~8%)
INSERT INTO public.ad_logs (config_id, ad_type, event_type, created_at, metadata)
SELECT 
  '11111111-1111-1111-1111-111111111111'::uuid, 
  'banner', 
  'impression', 
  now() - (day || ' day')::interval - (random() * 20 || ' hour')::interval,
  '{"seed": true}'::jsonb
FROM generate_series(0, 14) day, generate_series(1, 30);

INSERT INTO public.ad_logs (config_id, ad_type, event_type, created_at, metadata)
SELECT 
  '11111111-1111-1111-1111-111111111111'::uuid, 
  'banner', 
  'click', 
  now() - (day || ' day')::interval - (random() * 20 || ' hour')::interval,
  '{"seed": true}'::jsonb
FROM generate_series(0, 14) day, generate_series(1, 1); -- ~1 clic por día

INSERT INTO public.ad_logs (config_id, ad_type, event_type, created_at, metadata)
SELECT 
  '11111111-1111-1111-1111-111111111111'::uuid, 
  'banner', 
  'blocked', 
  now() - (day || ' day')::interval - (random() * 20 || ' hour')::interval,
  '{"seed": true}'::jsonb
FROM generate_series(0, 14) day, generate_series(1, 3); -- ~3 bloqueados por día


-- B. SOCIAL BAR IMPRESSIONS (~50 por día)
INSERT INTO public.ad_logs (config_id, ad_type, event_type, created_at, metadata)
SELECT 
  '22222222-2222-2222-2222-222222222222'::uuid, 
  'social_bar', 
  'impression', 
  now() - (day || ' day')::interval - (random() * 20 || ' hour')::interval,
  '{"seed": true}'::jsonb
FROM generate_series(0, 14) day, generate_series(1, 50);


-- C. INTERSTITIAL IMPRESSIONS (~15 por día) & CLICS (~15% CTR) & COMPLETIONS (~85%)
INSERT INTO public.ad_logs (config_id, ad_type, event_type, created_at, metadata)
SELECT 
  '33333333-3333-3333-3333-333333333333'::uuid, 
  'interstitial', 
  'impression', 
  now() - (day || ' day')::interval - (random() * 20 || ' hour')::interval,
  '{"seed": true}'::jsonb
FROM generate_series(0, 14) day, generate_series(1, 15);

INSERT INTO public.ad_logs (config_id, ad_type, event_type, created_at, metadata)
SELECT 
  '33333333-3333-3333-3333-333333333333'::uuid, 
  'interstitial', 
  'click', 
  now() - (day || ' day')::interval - (random() * 20 || ' hour')::interval,
  '{"seed": true}'::jsonb
FROM generate_series(0, 14) day, generate_series(1, 2); -- ~2 clics por día

INSERT INTO public.ad_logs (config_id, ad_type, event_type, created_at, metadata)
SELECT 
  '33333333-3333-3333-3333-333333333333'::uuid, 
  'interstitial', 
  'complete', 
  now() - (day || ' day')::interval - (random() * 20 || ' hour')::interval,
  '{"seed": true}'::jsonb
FROM generate_series(0, 14) day, generate_series(1, 13); -- ~13 completados (cerrado modal) por día


-- D. REWARDED IMPRESSIONS (~10 por día) & CLICS (~70% CTR) & COMPLETIONS (~95%)
INSERT INTO public.ad_logs (config_id, ad_type, event_type, created_at, metadata)
SELECT 
  '44444444-4444-4444-4444-444444444444'::uuid, 
  'rewarded', 
  'impression', 
  now() - (day || ' day')::interval - (random() * 20 || ' hour')::interval,
  '{"seed": true}'::jsonb
FROM generate_series(0, 14) day, generate_series(1, 10);

INSERT INTO public.ad_logs (config_id, ad_type, event_type, created_at, metadata)
SELECT 
  '44444444-4444-4444-4444-444444444444'::uuid, 
  'rewarded', 
  'click', 
  now() - (day || ' day')::interval - (random() * 20 || ' hour')::interval,
  '{"seed": true}'::jsonb
FROM generate_series(0, 14) day, generate_series(1, 7); -- ~7 clics por día

INSERT INTO public.ad_logs (config_id, ad_type, event_type, created_at, metadata)
SELECT 
  '44444444-4444-4444-4444-444444444444'::uuid, 
  'rewarded', 
  'complete', 
  now() - (day || ' day')::interval - (random() * 20 || ' hour')::interval,
  '{"seed": true}'::jsonb
FROM generate_series(0, 14) day, generate_series(1, 6); -- ~6 completados por día
