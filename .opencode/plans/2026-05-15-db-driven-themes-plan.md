# DB-Driven Theme System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move theme visual definitions from hardcoded TypeScript to a PostgreSQL `themes` table with full CRUD from StoreAdmin.

**Architecture:** New `themes` table stores card + board visual definitions as JSONB. `themeRegistry.ts` becomes a thin DB cache + fallback. `StoreAdmin.tsx` gains a theme editor section with CSS form, live preview, and auto-generation of linked `store_items`.

**Tech Stack:** PostgreSQL (Supabase self-hosted), React 19, TypeScript, Tailwind CSS, JSONB for theme definitions.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `database/database-migration-themes.sql` | **Create** | Migration: table, seed data, RLS |
| `src/web/themes/themeRegistry.ts` | **Rewrite** | DB-driven cache + fallback |
| `src/web/components/StoreAdmin.tsx` | **Modify** | Add theme management section |
| `src/web/components/Store.tsx` | **Modify** | Import change only |
| `src/App.tsx` | **Modify** | Call loadThemes() on init |

---

### Task 1: Database Migration

**Files:**
- Create: `database/database-migration-themes.sql`

- [ ] **Step 1: Create the migration file**

Write `database/database-migration-themes.sql`:

```sql
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
    'Minimalismo Apple. Tarjetas limpias, sombras perfectas.',
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
```

- [ ] **Step 2: Apply migration to dev database**

```bash
# Apply via Supabase SQL Editor or psql
psql <DATABASE_URL> -f database/database-migration-themes.sql
```

- [ ] **Step 3: Verify migration**

```sql
SELECT key, name, price FROM public.themes ORDER BY price;
-- Expected: 6 rows (default, bento_casino, vault_noir, gold_rush, neon_dealer, tactile_vegas)

SELECT COUNT(*) FROM public.store_items WHERE item_type = 'theme' AND theme_key IN ('vault_noir', 'neon_dealer', 'gold_rush', 'bento_casino', 'tactile_vegas');
-- Expected: 5 rows
```

- [ ] **Step 4: Commit**

```bash
git add database/database-migration-themes.sql
git commit -m "feat: add themes table migration with seed data and RLS"
```

---

### Task 2: Rewrite themeRegistry.ts

**Files:**
- Modify: `src/web/themes/themeRegistry.ts`

- [ ] **Step 1: Replace the entire file content**

Read the current file, then replace all content with:

```ts
// ─── Theme Registry ──────────────────────────────────────────────────────────
// Maps a theme key (stored in profiles.equipped_theme) to visual properties
// applied to cards and the board.
// Themes are loaded from the public.themes table at app startup.
// The DEFAULT_THEME is the hardcoded fallback when DB is unavailable.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../services/supabase';

export interface CardTheme {
  background: string;
  boxShadow: string;
  boxShadowSelected: string;
  border: string;
  innerEdge: string;
  redSuitColor: string;
  blackSuitColor: string;
  extraClass?: string;
}

export interface BoardTheme {
  background: string;
  borderColor: string;
  glowColor: string;
  innerRingColor: string;
  overlayGradient?: string;
  watermarkOpacity: number;
}

export interface GameTheme {
  key: string;
  name: string;
  description: string;
  emoji: string;
  previewColor: string;
  cardTheme: CardTheme;
  boardTheme: BoardTheme;
}

const DEFAULT_THEME: GameTheme = {
  key: 'default',
  name: 'Clásico',
  description: 'El estilo original del juego, limpio y elegante.',
  emoji: '🃏',
  previewColor: '#ffffff',
  cardTheme: {
    background: 'linear-gradient(165deg, #ffffff 0%, #f8fafc 35%, #e2e8f0 100%)',
    boxShadow:
      '0 10px 20px -6px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.45) inset, inset 0 2px 6px rgba(255,255,255,0.9)',
    boxShadowSelected:
      '0 22px 40px -10px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.45) inset, inset 0 2px 6px rgba(255,255,255,0.9)',
    border: '1px solid rgba(255,255,255,0.55)',
    innerEdge: 'rgba(148,163,184,0.8)',
    redSuitColor: '#dc2626',
    blackSuitColor: '#111827',
  },
  boardTheme: {
    background:
      'radial-gradient(circle at 50% 20%, rgba(56,189,248,0.2) 0%, rgba(15,23,42,0) 38%), radial-gradient(circle at 50% 100%, rgba(14,116,144,0.25) 0%, rgba(8,47,73,0.05) 45%), linear-gradient(145deg, #0a3258 0%, #07263f 45%, #041a2e 100%)',
    borderColor: '#2A1810',
    glowColor: 'rgba(34,211,238,0.4)',
    innerRingColor: 'rgba(253,224,71,0.35)',
    watermarkOpacity: 0.1,
  },
};

let themeCache: Record<string, GameTheme> = {};

export async function loadThemes(): Promise<void> {
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .eq('is_active', true);
  if (error) return;
  themeCache = {};
  for (const row of data) {
    themeCache[row.key] = {
      key: row.key,
      name: row.name,
      description: row.description,
      emoji: row.emoji,
      previewColor: row.preview_color,
      cardTheme: row.card_theme as CardTheme,
      boardTheme: row.board_theme as BoardTheme,
    };
  }
}

export function getTheme(key: string | null | undefined): GameTheme {
  if (!key) return DEFAULT_THEME;
  return themeCache[key] ?? DEFAULT_THEME;
}

export function getAllThemes(): GameTheme[] {
  return Object.values(themeCache);
}

export function invalidateCache(): void {
  themeCache = {};
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/web/themes/themeRegistry.ts
git commit -m "refactor: rewrite themeRegistry to load themes from DB with fallback"
```

---

### Task 3: Update Store.tsx import

**Files:**
- Modify: `src/web/components/Store.tsx:6`

- [ ] **Step 1: Change the import line**

Line 6 changes from:
```ts
import { getTheme, ALL_THEMES } from '../themes/themeRegistry';
```
to:
```ts
import { getTheme, getAllThemes } from '../themes/themeRegistry';
```

- [ ] **Step 2: Check for other ALL_THEMES references and replace**

```bash
grep -n "ALL_THEMES" src/web/components/Store.tsx
```

If there are other references to `ALL_THEMES` in the file body, replace each with `getAllThemes()`.

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/web/components/Store.tsx
git commit -m "fix: update Store to use getAllThemes() from dynamic registry"
```

---

### Task 4: Add loadThemes() call to App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Find existing initialization effect**

```bash
grep -n "useEffect\|loadThemes" src/App.tsx | head -20
```

- [ ] **Step 2: Add the import**

Add at the top of the imports section:
```ts
import { loadThemes } from './themes/themeRegistry';
```

- [ ] **Step 3: Add loadThemes() call**

In an existing `useEffect(() => { ... }, [])` that runs on mount, add `loadThemes();` to the effect body. If no such effect exists, add:

```ts
useEffect(() => {
  loadThemes();
}, []);
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: load themes from DB on app initialization"
```

---

### Task 5: Add Theme Editor to StoreAdmin.tsx

**Files:**
- Modify: `src/web/components/StoreAdmin.tsx`

- [ ] **Step 1: Add imports at top of file**

After `import React, { useState, useEffect, useRef } from 'react';` and `import { supabase } from '../services/supabase';`, add:

```ts
import { invalidateCache, loadThemes } from '../themes/themeRegistry';
```

- [ ] **Step 2: Add Theme interfaces after StoreItem interface**

After the existing `interface StoreItem { ... }` block (around line 13):

```ts
interface ThemeRecord {
  id: string;
  key: string;
  name: string;
  description: string;
  emoji: string;
  preview_color: string;
  price: number;
  card_theme: Record<string, unknown>;
  board_theme: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

interface ThemeForm {
  id?: string;
  key: string;
  name: string;
  description: string;
  emoji: string;
  previewColor: string;
  price: number;
  cardTheme: {
    background: string;
    boxShadow: string;
    boxShadowSelected: string;
    border: string;
    innerEdge: string;
    redSuitColor: string;
    blackSuitColor: string;
    extraClass: string;
  };
  boardTheme: {
    background: string;
    borderColor: string;
    glowColor: string;
    innerRingColor: string;
    overlayGradient: string;
    watermarkOpacity: number;
  };
  isActive: boolean;
}
```

- [ ] **Step 3: Add theme state variables**

After the existing StoreAdmin state (after line ~17):

```ts
// Theme management
const [activeSection, setActiveSection] = useState<'items' | 'themes'>('items');
const [themes, setThemes] = useState<ThemeRecord[]>([]);
const [themesLoading, setThemesLoading] = useState(false);
const [editingTheme, setEditingTheme] = useState<boolean>(false);
const [themeForm, setThemeForm] = useState<ThemeForm>({
  key: '',
  name: '',
  description: '',
  emoji: '🎨',
  previewColor: '#111827',
  price: 500,
  cardTheme: {
    background: 'linear-gradient(160deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
    boxShadow: '0 10px 20px -6px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.45) inset',
    boxShadowSelected: '0 22px 40px -10px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.45) inset',
    border: '1px solid rgba(255,255,255,0.55)',
    innerEdge: 'rgba(148,163,184,0.8)',
    redSuitColor: '#dc2626',
    blackSuitColor: '#111827',
    extraClass: '',
  },
  boardTheme: {
    background: 'linear-gradient(145deg, #0a3258 0%, #07263f 45%, #041a2e 100%)',
    borderColor: '#2A1810',
    glowColor: 'rgba(34,211,238,0.4)',
    innerRingColor: 'rgba(253,224,71,0.35)',
    overlayGradient: '',
    watermarkOpacity: 0.1,
  },
  isActive: true,
});
```

- [ ] **Step 4: Add theme CRUD functions**

After the existing functions (after `handleDelete`):

```ts
const fetchThemes = async () => {
  setThemesLoading(true);
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) setError(error.message);
  else setThemes(data || []);
  setThemesLoading(false);
};

const handleSaveTheme = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  try {
    const { error: themeErr } = await supabase.from('themes').upsert({
      id: themeForm.id || undefined,
      key: themeForm.key,
      name: themeForm.name,
      description: themeForm.description,
      emoji: themeForm.emoji,
      preview_color: themeForm.previewColor,
      price: themeForm.price,
      card_theme: themeForm.cardTheme as Record<string, unknown>,
      board_theme: themeForm.boardTheme as Record<string, unknown>,
      is_active: themeForm.isActive,
      updated_at: new Date().toISOString(),
    });
    if (themeErr) throw themeErr;

    if (themeForm.key !== 'default') {
      const { data: existingStoreItem } = await supabase
        .from('store_items')
        .select('id')
        .eq('theme_key', themeForm.key)
        .maybeSingle();

      const { error: storeErr } = await supabase.from('store_items').upsert({
        id: existingStoreItem?.id || undefined,
        name: themeForm.name,
        description: themeForm.description,
        item_type: 'theme',
        price: themeForm.price,
        theme_key: themeForm.key,
        image_url: null,
        is_active: themeForm.isActive,
      });
      if (storeErr) throw storeErr;
    }

    invalidateCache();
    await loadThemes();
    setEditingTheme(false);
    fetchThemes();
    fetchItems();
  } catch (err: any) {
    setError(err.message);
  }
};

const handleDeleteTheme = async (themeId: string, themeKey: string) => {
  if (!confirm('¿Eliminar este tema? Los jugadores que lo tengan equipado volverán al tema por defecto.')) return;
  setError('');

  try {
    await supabase.from('store_items').update({ is_active: false }).eq('theme_key', themeKey);
    await supabase.from('themes').delete().eq('id', themeId);
    invalidateCache();
    await loadThemes();
    fetchThemes();
    fetchItems();
  } catch (err: any) {
    setError(err.message);
  }
};
```

- [ ] **Step 5: Add section toggle to the header**

In the component's header area (after the title div, lines ~130-140), insert:

```tsx
<div className="flex p-1 bg-black/40 rounded-xl border border-white/10">
  <button
    onClick={() => setActiveSection('items')}
    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
      activeSection === 'items' ? 'bg-[#7C3AED] text-white' : 'text-gray-400 hover:text-white'
    }`}
  >
    Artículos
  </button>
  <button
    onClick={() => { setActiveSection('themes'); fetchThemes(); }}
    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
      activeSection === 'themes' ? 'bg-[#7C3AED] text-white' : 'text-gray-400 hover:text-white'
    }`}
  >
    Temas
  </button>
</div>
```

- [ ] **Step 6: Wrap existing content in a conditional and add theme section**

Wrap the entire existing content from the error block onward (from the `{error && (...)}` block through the end of the return statement) in:

```tsx
{activeSection === 'items' ? (
  <>
    {/* ALL EXISTING CONTENT from error block to end */}
  </>
) : (
  <>
    {/* Theme management section (Step 7) */}
  </>
)}
```

- [ ] **Step 7: Add the theme management section JSX**

Place this inside the `</>` block for the themes section:

```tsx
{/* ─── Theme Management ─── */}
<div className="space-y-6">
  {!editingTheme && (
    <div className="flex justify-between items-center">
      <div>
        <h3 className="text-2xl font-bold text-[#A78BFA]">🎨 Gestión de Temas</h3>
      </div>
      <button
        onClick={() => {
          setThemeForm({
            key: '',
            name: '',
            description: '',
            emoji: '🎨',
            previewColor: '#111827',
            price: 500,
            cardTheme: {
              background: 'linear-gradient(160deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
              boxShadow: '0 10px 20px -6px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.45) inset',
              boxShadowSelected: '0 22px 40px -10px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.45) inset',
              border: '1px solid rgba(255,255,255,0.55)',
              innerEdge: 'rgba(148,163,184,0.8)',
              redSuitColor: '#dc2626',
              blackSuitColor: '#111827',
              extraClass: '',
            },
            boardTheme: {
              background: 'linear-gradient(145deg, #0a3258 0%, #07263f 45%, #041a2e 100%)',
              borderColor: '#2A1810',
              glowColor: 'rgba(34,211,238,0.4)',
              innerRingColor: 'rgba(253,224,71,0.35)',
              overlayGradient: '',
              watermarkOpacity: 0.1,
            },
            isActive: true,
          });
          setEditingTheme(true);
        }}
        className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(124,58,237,0.4)] text-sm flex items-center gap-2"
      >
        <span>➕</span> Nuevo Tema
      </button>
    </div>
  )}

  {error && activeSection === 'themes' && (
    <div className="bg-red-500/20 text-red-400 border border-red-500/50 p-4 rounded-xl text-sm flex items-center gap-2 shadow-lg" role="alert">
      <span aria-hidden="true">⚠️</span> {error}
    </div>
  )}

  {editingTheme ? (
    <div className="bg-[#0F0F23] p-6 sm:p-8 rounded-3xl border border-[#7C3AED]/30 shadow-2xl animate-slide-up">
      <h4 className="text-xl font-bold mb-6 text-white border-b border-white/10 pb-4">
        {themeForm.id ? '✏️ Editar Tema' : '✨ Crear Nuevo Tema'}
      </h4>
      <form onSubmit={handleSaveTheme} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Key (identificador único)</label>
            <input required type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7C3AED] transition-all font-mono text-sm" value={themeForm.key} onChange={e => setThemeForm({...themeForm, key: e.target.value})} placeholder="mi_tema" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nombre</label>
            <input required type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7C3AED] transition-all" value={themeForm.name} onChange={e => setThemeForm({...themeForm, name: e.target.value})} placeholder="Cyber Gold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Descripción</label>
            <input required type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7C3AED] transition-all" value={themeForm.description} onChange={e => setThemeForm({...themeForm, description: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Emoji</label>
            <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7C3AED] transition-all" value={themeForm.emoji} onChange={e => setThemeForm({...themeForm, emoji: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Preview Color</label>
            <div className="flex gap-2">
              <input type="color" className="w-12 h-12 rounded-lg border border-white/10 bg-black/40 cursor-pointer" value={themeForm.previewColor} onChange={e => setThemeForm({...themeForm, previewColor: e.target.value})} />
              <input type="text" className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#7C3AED] transition-all" value={themeForm.previewColor} onChange={e => setThemeForm({...themeForm, previewColor: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Precio (🪙)</label>
            <input type="number" min="0" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-all font-mono" value={themeForm.price} onChange={e => setThemeForm({...themeForm, price: parseInt(e.target.value) || 0})} />
          </div>
        </div>

        {/* Card Theme Section */}
        <div className="border border-white/10 rounded-2xl p-6 bg-black/20">
          <h5 className="text-sm font-bold text-[#A78BFA] uppercase mb-4 flex items-center gap-2">
            <span aria-hidden="true">🃏</span> Card Theme
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['background', 'boxShadow', 'boxShadowSelected', 'border', 'innerEdge'] as const).map(field => (
              <div key={field}>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{field}</label>
                <textarea
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7C3AED] transition-all h-20 resize-y"
                  value={themeForm.cardTheme[field]}
                  onChange={e => setThemeForm({
                    ...themeForm,
                    cardTheme: { ...themeForm.cardTheme, [field]: e.target.value }
                  })}
                />
              </div>
            ))}
            {(['redSuitColor', 'blackSuitColor'] as const).map(field => (
              <div key={field}>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{field}</label>
                <div className="flex gap-2">
                  <input type="color" className="w-10 h-10 rounded-lg border border-white/10 bg-black/40 cursor-pointer" value={themeForm.cardTheme[field]} onChange={e => setThemeForm({...themeForm, cardTheme: {...themeForm.cardTheme, [field]: e.target.value}})} />
                  <input type="text" className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7C3AED] transition-all" value={themeForm.cardTheme[field]} onChange={e => setThemeForm({...themeForm, cardTheme: {...themeForm.cardTheme, [field]: e.target.value}})} />
                </div>
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">extraClass</label>
              <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#7C3AED] transition-all" value={themeForm.cardTheme.extraClass} onChange={e => setThemeForm({...themeForm, cardTheme: {...themeForm.cardTheme, extraClass: e.target.value}})} />
            </div>
          </div>
        </div>

        {/* Board Theme Section */}
        <div className="border border-white/10 rounded-2xl p-6 bg-black/20">
          <h5 className="text-sm font-bold text-[#A78BFA] uppercase mb-4 flex items-center gap-2">
            <span aria-hidden="true">🎲</span> Board Theme
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['background', 'overlayGradient'] as const).map(field => (
              <div key={field}>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{field}</label>
                <textarea
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7C3AED] transition-all h-20 resize-y"
                  value={themeForm.boardTheme[field]}
                  onChange={e => setThemeForm({
                    ...themeForm,
                    boardTheme: { ...themeForm.boardTheme, [field]: e.target.value }
                  })}
                />
              </div>
            ))}
            {(['borderColor', 'glowColor', 'innerRingColor'] as const).map(field => (
              <div key={field}>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{field}</label>
                <div className="flex gap-2">
                  <input type="color" className="w-10 h-10 rounded-lg border border-white/10 bg-black/40 cursor-pointer" value={themeForm.boardTheme[field]} onChange={e => setThemeForm({...themeForm, boardTheme: {...themeForm.boardTheme, [field]: e.target.value}})} />
                  <input type="text" className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7C3AED] transition-all" value={themeForm.boardTheme[field]} onChange={e => setThemeForm({...themeForm, boardTheme: {...themeForm.boardTheme, [field]: e.target.value}})} />
                </div>
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">watermarkOpacity (0-1)</label>
              <input type="number" min="0" max="1" step="0.01" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#7C3AED] transition-all" value={themeForm.boardTheme.watermarkOpacity} onChange={e => setThemeForm({...themeForm, boardTheme: {...themeForm.boardTheme, watermarkOpacity: parseFloat(e.target.value) || 0}})} />
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="border border-white/10 rounded-2xl p-6 bg-black/20">
          <h5 className="text-sm font-bold text-gray-300 uppercase mb-4 flex items-center gap-2">
            <span aria-hidden="true">👁️</span> Vista Previa
          </h5>
          <div className="flex justify-center">
            <div
              className="w-full max-w-xs h-48 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{ background: themeForm.boardTheme.background, borderColor: themeForm.boardTheme.borderColor, borderWidth: '2px', borderStyle: 'solid' }}
            >
              <div className="transform scale-75">
                <div
                  className="w-20 h-28 rounded-xl flex items-center justify-center font-bold flex-col"
                  style={{
                    background: themeForm.cardTheme.background,
                    boxShadow: themeForm.cardTheme.boxShadow,
                    border: themeForm.cardTheme.border,
                  }}
                >
                  <span className="text-xs" style={{ color: themeForm.cardTheme.redSuitColor }}>♥ A</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-400 uppercase">Activo en tienda?</label>
          <button
            type="button"
            onClick={() => setThemeForm({...themeForm, isActive: !themeForm.isActive})}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              themeForm.isActive
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {themeForm.isActive ? 'ACTIVO' : 'INACTIVO'}
          </button>
        </div>

        <div className="flex gap-3 justify-end pt-6 border-t border-white/10 mt-6">
          <button type="button" onClick={() => setEditingTheme(false)} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-300 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">
            Cancelar
          </button>
          <button type="submit" className="px-8 py-3 rounded-xl text-sm font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] transition-all">
            Guardar Tema
          </button>
        </div>
      </form>
    </div>
  ) : (
    <div className="bg-[#0F0F23] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-black/60 border-b border-white/10 text-[10px] uppercase tracking-widest text-gray-400">
              <th className="p-5 font-black">Preview</th>
              <th className="p-5 font-black">Key / Nombre</th>
              <th className="p-5 font-black">Descripción</th>
              <th className="p-5 font-black">Precio</th>
              <th className="p-5 font-black text-center">Estado</th>
              <th className="p-5 font-black text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {themesLoading ? (
              <tr><td colSpan={6} className="p-12 text-center text-gray-500 animate-pulse font-bold">Cargando temas...</td></tr>
            ) : themes.length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-gray-500 font-bold">No hay temas. Crea el primero.</td></tr>
            ) : (
              themes.map(theme => (
                <tr key={theme.id} className={`border-b border-white/5 transition-all hover:bg-white/5 ${!theme.is_active ? 'opacity-60 bg-black/40' : ''}`}>
                  <td className="p-4">
                    <div className="w-14 h-9 rounded-lg border border-white/10 flex items-center justify-center text-sm" style={{ background: theme.preview_color }}>
                      {theme.emoji}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-white text-sm">{theme.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">{theme.key}</div>
                  </td>
                  <td className="p-4 text-xs text-gray-400 truncate max-w-[200px]">{theme.description}</td>
                  <td className="p-4 font-mono text-yellow-400 font-bold bg-black/20">
                    🪙 {theme.price.toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={async () => {
                        const { error } = await supabase.from('themes').update({ is_active: !theme.is_active }).eq('id', theme.id);
                        if (error) setError(error.message);
                        else { fetchThemes(); invalidateCache(); }
                      }}
                      className={`text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest transition-colors ${
                        theme.is_active
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                      }`}
                    >
                      {theme.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setThemeForm({
                            id: theme.id,
                            key: theme.key,
                            name: theme.name,
                            description: theme.description,
                            emoji: theme.emoji,
                            previewColor: theme.preview_color,
                            price: theme.price,
                            cardTheme: theme.card_theme as ThemeForm['cardTheme'],
                            boardTheme: theme.board_theme as ThemeForm['boardTheme'],
                            isActive: theme.is_active,
                          });
                          setEditingTheme(true);
                        }}
                        className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors border border-white/5"
                      >
                        ✏️
                      </button>
                      {theme.key !== 'default' && (
                        <button
                          onClick={() => handleDeleteTheme(theme.id, theme.key)}
                          className="text-xs bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 px-3 py-2 rounded-lg transition-colors border border-rose-500/30"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 8: Verify build**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

Fix any type errors. Known potential issue: `fetchItems` was called from an `onClick` handler for an offscreen element, verify the function scope.

- [ ] **Step 9: Commit**

```bash
git add src/web/components/StoreAdmin.tsx
git commit -m "feat: add theme editor to StoreAdmin with live preview and auto-store-item"
```

---

### Task 6: Run tests and fix any regressions

**Files:** None

- [ ] **Step 1: Run the test suite**

```bash
npm test
```

- [ ] **Step 2: Check for references to removed exports**

If tests import `VAULT_NOIR`, `THEME_REGISTRY`, or `ALL_THEMES`:

```bash
grep -rn "VAULT_NOIR\|THEME_REGISTRY\|ALL_THEMES" tests/ src/
```

Update any references found. Replace `ALL_THEMES` with `getAllThemes()`, `THEME_REGISTRY['key']` with `getTheme('key')`.

- [ ] **Step 3: Commit test fixes (if any)**

```bash
git add -u
git commit -m "test: fix test references for DB-driven theme registry"
```
