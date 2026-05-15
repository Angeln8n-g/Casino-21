-- ─── Themes Table ─────────────────────────────────────────────────────────────
-- Stores visual definitions for card/board themes, replacing hardcoded registry.

CREATE TABLE IF NOT EXISTS public.themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    emoji TEXT DEFAULT '🎨',
    preview_color TEXT NOT NULL DEFAULT '#111827',
    price INTEGER NOT NULL DEFAULT 500,
    card_theme JSONB NOT NULL,
    board_theme JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seed: Existing 6 themes from themeRegistry.ts ─────────────────────────────

-- Default (Clásico)
INSERT INTO public.themes (key, name, description, emoji, preview_color, price, card_theme, board_theme)
VALUES (
    'default',
    'Clásico',
    'El estilo original del juego, limpio y elegante.',
    '🃏',
    '#ffffff',
    0,
    '{"background":"linear-gradient(165deg, #ffffff 0%, #f8fafc 35%, #e2e8f0 100%)","boxShadow":"0 10px 20px -6px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.45) inset, inset 0 2px 6px rgba(255,255,255,0.9)","boxShadowSelected":"0 22px 40px -10px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.45) inset, inset 0 2px 6px rgba(255,255,255,0.9)","border":"1px solid rgba(255,255,255,0.55)","innerEdge":"rgba(148,163,184,0.8)","redSuitColor":"#dc2626","blackSuitColor":"#111827"}'::jsonb,
    '{"background":"radial-gradient(circle at 50% 20%, rgba(56,189,248,0.2) 0%, rgba(15,23,42,0) 38%), radial-gradient(circle at 50% 100%, rgba(14,116,144,0.25) 0%, rgba(8,47,73,0.05) 45%), linear-gradient(145deg, #0a3258 0%, #07263f 45%, #041a2e 100%)","borderColor":"#2A1810","glowColor":"rgba(34,211,238,0.4)","innerRingColor":"rgba(253,224,71,0.35)","watermarkOpacity":0.1}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Vault Noir
INSERT INTO public.themes (key, name, description, emoji, preview_color, price, card_theme, board_theme)
VALUES (
    'vault_noir',
    'Vault Noir',
    'Casino de lujo. Cartas crema envejecidas sobre terciopelo negro.',
    '🖤',
    '#1a1208',
    600,
    '{"background":"linear-gradient(160deg, #fdf8ee 0%, #f5ead4 50%, #ede1c4 100%)","boxShadow":"0 10px 28px -6px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,180,130,0.5) inset, inset 0 2px 6px rgba(255,245,220,0.6)","boxShadowSelected":"0 22px 45px -10px rgba(0,0,0,0.8), 0 0 0 2px rgba(212,180,130,0.7) inset, inset 0 2px 8px rgba(255,245,220,0.8)","border":"1px solid rgba(160,120,60,0.6)","innerEdge":"rgba(160,120,60,0.5)","redSuitColor":"#8b1a1a","blackSuitColor":"#1a0f00","extraClass":"font-serif"}'::jsonb,
    '{"background":"radial-gradient(circle at 40% 30%, rgba(60,30,10,0.9) 0%, rgba(8,5,2,0) 55%), linear-gradient(160deg, #1a0e04 0%, #0f0803 60%, #080502 100%)","borderColor":"#5a3a1a","glowColor":"rgba(212,180,100,0.35)","innerRingColor":"rgba(212,175,55,0.3)","overlayGradient":"linear-gradient(135deg, rgba(180,130,40,0.12) 0%, transparent 40%, transparent 60%, rgba(180,130,40,0.08) 100%)","watermarkOpacity":0.06}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Neon Dealer
INSERT INTO public.themes (key, name, description, emoji, preview_color, price, card_theme, board_theme)
VALUES (
    'neon_dealer',
    'Neon Dealer',
    'Cyberpunk neón. Cada palo brilla con su propio color.',
    '⚡',
    '#0d0d1a',
    800,
    '{"background":"linear-gradient(160deg, #0d0d1a 0%, #111128 50%, #0a0a18 100%)","boxShadow":"0 10px 28px -6px rgba(0,0,0,0.8), 0 0 0 1px rgba(100,80,200,0.4) inset, inset 0 0 12px rgba(80,60,180,0.15)","boxShadowSelected":"0 22px 45px -10px rgba(80,60,200,0.6), 0 0 0 2px rgba(140,100,255,0.6) inset, 0 0 30px rgba(100,80,220,0.4)","border":"1px solid rgba(100,80,200,0.5)","innerEdge":"rgba(100,80,200,0.4)","redSuitColor":"#ff2d55","blackSuitColor":"#00e5ff","extraClass":"font-mono"}'::jsonb,
    '{"background":"radial-gradient(circle at 50% 30%, rgba(80,40,160,0.35) 0%, rgba(5,5,20,0) 50%), linear-gradient(145deg, #050510 0%, #080820 50%, #030310 100%)","borderColor":"#1a1040","glowColor":"rgba(80,60,255,0.5)","innerRingColor":"rgba(80,60,255,0.25)","overlayGradient":"linear-gradient(135deg, rgba(255,40,80,0.08) 0%, transparent 40%, transparent 60%, rgba(0,200,255,0.08) 100%)","watermarkOpacity":0.08}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Gold Rush
INSERT INTO public.themes (key, name, description, emoji, preview_color, price, card_theme, board_theme)
VALUES (
    'gold_rush',
    'Gold Rush',
    'Glassmorphism premium. Dorado y cristal sobre fondo oscuro.',
    '✨',
    '#1a1200',
    750,
    '{"background":"linear-gradient(160deg, rgba(255,245,200,0.18) 0%, rgba(255,215,0,0.08) 50%, rgba(200,160,0,0.12) 100%)","boxShadow":"0 10px 28px -6px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,215,0,0.35) inset, inset 0 2px 8px rgba(255,220,50,0.15)","boxShadowSelected":"0 22px 45px -10px rgba(200,150,0,0.55), 0 0 0 2px rgba(255,215,0,0.6) inset, 0 0 40px rgba(255,200,0,0.3)","border":"1px solid rgba(255,215,0,0.4)","innerEdge":"rgba(255,215,0,0.3)","redSuitColor":"#fbbf24","blackSuitColor":"#fef3c7","extraClass":"backdrop-blur-sm"}'::jsonb,
    '{"background":"radial-gradient(circle at 50% 20%, rgba(180,140,0,0.3) 0%, rgba(10,8,0,0) 55%), linear-gradient(145deg, #100d00 0%, #0c0a00 55%, #080600 100%)","borderColor":"#3d2e00","glowColor":"rgba(255,215,0,0.45)","innerRingColor":"rgba(255,215,0,0.3)","overlayGradient":"linear-gradient(135deg, rgba(255,215,0,0.12) 0%, transparent 35%, transparent 65%, rgba(255,215,0,0.08) 100%)","watermarkOpacity":0.07}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Bento Casino
INSERT INTO public.themes (key, name, description, emoji, preview_color, price, card_theme, board_theme)
VALUES (
    'bento_casino',
    'Bento Casino',
    'Minimalismo Apple. Tarjetas limpias, sombras perfectas, tipografía suave.',
    '🍱',
    '#f5f5f7',
    500,
    '{"background":"linear-gradient(160deg, #ffffff 0%, #fafafa 50%, #f2f2f7 100%)","boxShadow":"0 8px 24px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)","boxShadowSelected":"0 18px 36px -8px rgba(0,0,0,0.22), 0 0 0 2px rgba(0,122,255,0.5)","border":"1px solid rgba(0,0,0,0.08)","innerEdge":"rgba(0,0,0,0.04)","redSuitColor":"#ff3b30","blackSuitColor":"#1d1d1f"}'::jsonb,
    '{"background":"linear-gradient(160deg, #1c1c1e 0%, #2c2c2e 50%, #1c1c1e 100%)","borderColor":"#3a3a3c","glowColor":"rgba(0,122,255,0.4)","innerRingColor":"rgba(255,255,255,0.1)","overlayGradient":"radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)","watermarkOpacity":0.04}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Tactile Vegas
INSERT INTO public.themes (key, name, description, emoji, preview_color, price, card_theme, board_theme)
VALUES (
    'tactile_vegas',
    'Tactile Vegas',
    'Efecto clay 3D con colores vibrantes y físicas de rebote.',
    '🎰',
    '#4a1942',
    900,
    '{"background":"linear-gradient(160deg, #f8f0ff 0%, #efe0ff 50%, #e0caff 100%)","boxShadow":"0 6px 0 #8b5cf6, 0 12px 24px -6px rgba(100,60,180,0.5), inset 0 2px 4px rgba(255,255,255,0.6)","boxShadowSelected":"0 2px 0 #8b5cf6, 0 6px 20px -4px rgba(100,60,180,0.6), inset 0 2px 4px rgba(255,255,255,0.7)","border":"1.5px solid rgba(139,92,246,0.4)","innerEdge":"rgba(139,92,246,0.25)","redSuitColor":"#e11d48","blackSuitColor":"#5b21b6","extraClass":"font-bold"}'::jsonb,
    '{"background":"radial-gradient(circle at 50% 30%, rgba(120,60,160,0.5) 0%, rgba(30,0,60,0) 60%), linear-gradient(145deg, #2d0f3f 0%, #1a0828 55%, #0f0520 100%)","borderColor":"#5b21b6","glowColor":"rgba(139,92,246,0.5)","innerRingColor":"rgba(200,140,255,0.3)","overlayGradient":"linear-gradient(135deg, rgba(200,100,255,0.1) 0%, transparent 40%, transparent 60%, rgba(100,200,255,0.08) 100%)","watermarkOpacity":0.08}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ─── Add UNIQUE constraint on store_items.theme_key if not exists ──────────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'store_items_theme_key_unique'
          AND conrelid = 'public.store_items'::regclass
    ) THEN
        ALTER TABLE public.store_items
        ADD CONSTRAINT store_items_theme_key_unique UNIQUE (theme_key);
    END IF;
END;
$$;

-- ─── UPSERT store_items for migrated themes ────────────────────────────────────

INSERT INTO public.store_items (name, description, item_type, price, image_url, theme_key, is_active)
SELECT
    t.name,
    t.description,
    'theme',
    t.price,
    NULL,
    t.key,
    TRUE
FROM public.themes t
WHERE t.key != 'default'  -- default theme is not sold in store
ON CONFLICT (theme_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price;

-- ─── RLS Policies ──────────────────────────────────────────────────────────────

ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'themes'
          AND policyname = 'Anyone can read active themes'
    ) THEN
        CREATE POLICY "Anyone can read active themes"
            ON public.themes FOR SELECT
            USING (is_active = TRUE);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'themes'
          AND policyname = 'Admins can insert themes'
    ) THEN
        CREATE POLICY "Admins can insert themes"
            ON public.themes FOR INSERT
            WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'themes'
          AND policyname = 'Admins can update themes'
    ) THEN
        CREATE POLICY "Admins can update themes"
            ON public.themes FOR UPDATE
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'themes'
          AND policyname = 'Admins can delete themes'
    ) THEN
        CREATE POLICY "Admins can delete themes"
            ON public.themes FOR DELETE
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));
    END IF;
END;
$$;
