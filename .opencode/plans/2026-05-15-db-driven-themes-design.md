# DB-Driven Theme System — Design Spec

**Date:** 2026-05-15
**Status:** Draft
**Author:** Casino21 Admin

## 1. Goal

Move theme visual definitions (card + board styles) from hardcoded TypeScript in `src/web/themes/themeRegistry.ts` into a database-driven system, with a full CRUD UI in `StoreAdmin.tsx`. Themes become manageable without code deployments.

## 2. Current State

- 6 themes hardcoded in `themeRegistry.ts`: `default`, `vault_noir`, `neon_dealer`, `gold_rush`, `bento_casino`, `tactile_vegas`
- `store_items` table has a `theme_key` column referencing those hardcoded keys
- `StoreAdmin.tsx` manages `store_items` CRUD but theme visual definitions are read-only from code
- `profiles.equipped_theme` stores the key string
- Frontend resolves themes via `getTheme(key)` → `THEME_REGISTRY[key] ?? DEFAULT_THEME`

## 3. Target State

- All theme visual definitions live in a new `themes` PostgreSQL table
- `themeRegistry.ts` becomes a thin resolution module: fetches from DB, caches in memory, falls back to hardcoded `DEFAULT_THEME`
- `StoreAdmin.tsx` gets a full theme editor section with live preview
- Creating a theme auto-generates the linked `store_items` record
- Existing 6 themes are migrated to the DB via a migration SQL file
- Supabase is self-hosted — no vendor-specific limitations

## 4. Database

### 4.1 New table: `themes`

```sql
CREATE TABLE public.themes (
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
```

- `card_theme` JSONB shape matches the `CardTheme` interface:
  ```json
  {
    "background": "linear-gradient(...)",
    "boxShadow": "...",
    "boxShadowSelected": "...",
    "border": "...",
    "innerEdge": "...",
    "redSuitColor": "#...",
    "blackSuitColor": "#...",
    "extraClass": "font-serif"
  }
  ```
- `board_theme` JSONB shape matches the `BoardTheme` interface:
  ```json
  {
    "background": "radial-gradient(...)",
    "borderColor": "#...",
    "glowColor": "rgba(...)",
    "innerRingColor": "rgba(...)",
    "overlayGradient": "linear-gradient(...)",
    "watermarkOpacity": 0.08
  }
  ```

### 4.2 RLS Policies

```sql
-- Anyone can read active themes (public cosmetic data)
CREATE POLICY "Anyone can read active themes"
  ON public.themes FOR SELECT
  USING (is_active = TRUE);

-- Only admins can create/update/delete
CREATE POLICY "Admins can insert themes"
  ON public.themes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

CREATE POLICY "Admins can update themes"
  ON public.themes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

CREATE POLICY "Admins can delete themes"
  ON public.themes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));
```

### 4.3 Migration File

New file: `database/database-migration-themes.sql`

Contents in order:
1. CREATE TABLE `themes`
2. INSERT 6 existing themes (extracted verbatim from `themeRegistry.ts`)
3. UPSERT corresponding `store_items` records using `ON CONFLICT (theme_key) DO UPDATE` — existing store items with the same `theme_key` get their name/description/price updated; missing ones get inserted
4. RLS policies

### 4.4 Relationship with store_items

- `store_items.theme_key` → `themes.key` (logical foreign key, no FK constraint to keep things flexible)
- When a theme is created in admin: upsert to `themes`, then upsert a `store_items` row with same name/description/price/theme_key
- When a theme is deleted: set `is_active = FALSE` on its linked `store_items` (soft delete for players who already own it)
- Existing `buy_store_item` and `equip_store_item` RPCs **do not change** — they continue to work with `store_items.theme_key` and `profiles.equipped_theme`

## 5. Frontend Changes

### 5.1 `src/web/themes/themeRegistry.ts` (rewrite)

**Keep:**
- `CardTheme`, `BoardTheme`, `GameTheme` interfaces
- `DEFAULT_THEME` constant (hardcoded, identical to current)

**Remove:**
- All 5 premium theme constants (VAULT_NOIR, NEON_DEALER, GOLD_RUSH, BENTO_CASINO, TACTILE_VEGAS)
- `THEME_REGISTRY` static map
- `ALL_THEMES` static array

**Add:**
```ts
let themeCache: Record<string, GameTheme> = {};
let themesLoaded = false;

export async function loadThemes(): Promise<void> {
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .eq('is_active', true);
  if (error) return; // silently fall back to DEFAULT_THEME
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
  themesLoaded = true;
}

export function getTheme(key: string | null | undefined): GameTheme {
  if (!key) return DEFAULT_THEME;
  return themeCache[key] ?? DEFAULT_THEME;
}

export function getAllThemes(): GameTheme[] {
  return Object.values(themeCache);
}

export function invalidateCache(): void {
  themesLoaded = false;
  themeCache = {};
}
```

**File size:** ~247 lines → ~80 lines

### 5.2 `src/web/components/StoreAdmin.tsx` (add theme editor)

Current file (~417 lines) gets a new section. Structure:

```
StoreAdmin.tsx (existing)
├── Store Item management section (unchanged)
└── Theme management section (NEW)
    ├── Toggle button: "Store Items" | "Temas"
    ├── Theme list table (key, name, price, active, mini preview, actions)
    ├── "Nuevo Tema" button
    └── Theme editor form (expanded when editing/creating)
        ├── Meta fields: key, name, description, emoji, previewColor, price
        ├── Card fields: background, boxShadow, boxShadowSelected, border,
        │               innerEdge, redSuitColor, blackSuitColor, extraClass
        ├── Board fields: background, borderColor, glowColor, innerRingColor,
        │                overlayGradient, watermarkOpacity
        ├── Live preview panel (mini board + card rendered with form values)
        └── Save / Cancel buttons
```

**Form field types:**
- Text inputs: key, name, description, emoji, extraClass
- Number input: price, watermarkOpacity (step 0.01)
- Color picker + text input combo: previewColor, redSuitColor, blackSuitColor, borderColor, glowColor, innerRingColor
- Textarea (monospace): background, boxShadow, boxShadowSelected, border, innerEdge, overlayGradient

**Save logic:**
```ts
const handleSaveTheme = async () => {
  // 1. Upsert into themes table
  await supabase.from('themes').upsert({
    id: editingId, // null for new
    key: form.key,
    name: form.name,
    description: form.description,
    emoji: form.emoji,
    preview_color: form.previewColor,
    price: form.price,
    card_theme: form.cardTheme,
    board_theme: form.boardTheme,
    is_active: form.isActive,
    updated_at: new Date().toISOString(),
  });

  // 2. Upsert linked store_item
  await supabase.from('store_items').upsert({
    id: linkedStoreItemId,
    name: form.name,
    description: form.description,
    item_type: 'theme',
    price: form.price,
    theme_key: form.key,
    is_active: form.isActive,
    image_url: null,
  });

  // 3. Invalidate theme cache so getTheme() picks up changes
  invalidateCache();
  await loadThemes();
};
```

**Delete logic:**
```ts
const handleDeleteTheme = async (themeKey: string) => {
  // 1. Soft-delete the store_item
  await supabase.from('store_items').update({ is_active: false }).eq('theme_key', themeKey);
  // 2. Delete or soft-delete the theme record
  await supabase.from('themes').delete().eq('key', themeKey);
  // (Players with equipped_theme = themeKey will fall back to 'default')
  invalidateCache();
  await loadThemes();
};
```

### 5.3 `src/App.tsx` (add theme loading)

In the top-level initialization effect:
```ts
import { loadThemes } from './themes/themeRegistry';

useEffect(() => {
  loadThemes();
}, []);
```

### 5.4 `src/web/components/Store.tsx` (minimal change)

Already uses `getTheme()` and `ALL_THEMES` from `themeRegistry`. These functions will now resolve from DB. The buying and equipping flows (`buy_store_item`, `equip_store_item`) work identically since `store_items` of type 'theme' still have `theme_key`.

Note: `ALL_THEMES` is currently imported. After the rewrite, `Store.tsx` should call `getAllThemes()` instead. Replace the import line:
```ts
// Old: import { getTheme, ALL_THEMES } from '../themes/themeRegistry';
// New: import { getTheme, getAllThemes } from '../themes/themeRegistry';
```

## 6. Edge Cases

| Case | Behavior |
|---|---|
| Supabase unavailable at app start | `loadThemes()` silently fails. `getTheme()` always returns `DEFAULT_THEME`. App works with default visuals. |
| Admin deletes a theme a player has equipped | `equipped_theme` key not found in cache → `getTheme()` returns `DEFAULT_THEME`. No crash. |
| Duplicate theme key | DB UNIQUE constraint on `themes.key` rejects. Admin sees error toast. |
| Invalid CSS in theme fields | Live preview may look broken. Still saved — admin tool, creator is responsible. |
| Theme with `is_active = false` | Not loaded by `loadThemes()`. If a player has it equipped, falls back to default. |
| Race condition: theme updated while player viewing store | `invalidateCache()` + `loadThemes()` called after admin save. Next UI render picks up new data. |

## 7. Migration Notes

- Migration file goes in `database/` following the existing naming convention
- Existing `store_items` of type 'theme' are UPSERTED (matched by `theme_key`) — existing rows get updated name/price, missing rows get created. No duplicates.
- No data loss: the `equipped_theme` column on `profiles` continues to store the same keys
- The migration is idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- After migration, `themeRegistry.ts` can be rewritten. The old file is not referenced by the server code.

## 8. Security

- Theme data is public cosmetic information → SELECT policies allow all authenticated users
- Only admins can create/edit/delete themes (per existing `is_admin` check)
- Store item auto-generation on theme save uses the admin's auth context
- No server-side changes needed — all theme management is client→Supabase direct

## 9. Files Affected

| File | Action | Est. Lines Changed |
|---|---|---|
| `database/database-migration-themes.sql` | CREATE | ~150 lines |
| `src/web/themes/themeRegistry.ts` | REWRITE | 247 → ~80 |
| `src/web/components/StoreAdmin.tsx` | MODIFY | +~300 lines |
| `src/web/components/Store.tsx` | MODIFY | ~2 lines (import change) |
| `src/App.tsx` | MODIFY | +~3 lines |

## 10. Testing Strategy

- **Migration:** Apply migration to dev DB, verify 6 themes + store_items exist and are queryable
- **Theme resolution:** Write a unit test for `getTheme()` with a mock cache (existing and missing keys)
- **Admin CRUD:** Manual testing via StoreAdmin: create, edit, delete a theme, verify store and resolution
- **Store integration:** Verify theme appears in store after admin creation, can be purchased, equipped, and renders correctly on the game board
- **Fallback:** Kill Supabase connection, verify app still loads with default theme
