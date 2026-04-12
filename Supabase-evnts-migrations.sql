-- ================================================================
-- MIGRACIÓN DE EVENTOS Y ADMINISTRACIÓN
-- ================================================================

SET search_path TO public;

-- 1. AÑADIR COLUMNA IS_ADMIN A PERFILES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Actualizar política de actualización para permitir cambios si es admin (opcional, o hacerlo manualmente por la consola)
-- Para este MVP, dejaremos que el rol is_admin se cambie solo desde la consola de Supabase.

-- 2. TABLA DE EVENTOS
CREATE TABLE IF NOT EXISTS public.events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  description        TEXT NOT NULL,
  type               TEXT NOT NULL CHECK (type IN ('torneo', 'liga', 'especial')),
  status             TEXT NOT NULL CHECK (status IN ('draft', 'upcoming', 'live', 'completed')),
  start_date         TIMESTAMPTZ NOT NULL,
  end_date           TIMESTAMPTZ NOT NULL,
  entry_fee          INTEGER NOT NULL DEFAULT 0,
  prize_pool         TEXT NOT NULL,
  min_elo            INTEGER NOT NULL DEFAULT 0,
  image_url          TEXT,
  participants_count INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='events' AND policyname='events_select_public') THEN
    -- Todos pueden ver los eventos que no sean 'draft'
    CREATE POLICY "events_select_public" ON public.events FOR SELECT USING (status != 'draft');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='events' AND policyname='events_admin_all') THEN
    -- Admins pueden hacer todo (CRUD)
    CREATE POLICY "events_admin_all" ON public.events FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='events' AND policyname='events_service') THEN
    CREATE POLICY "events_service" ON public.events FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 3. TRIGGER UPDATED_AT PARA EVENTOS
DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_events_updated_at ON public.events;
  CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN undefined_function THEN
  -- Si no existe la función, la creamos
  CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER AS $func$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;
  
  CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END $$;

-- 4. TABLA DE PARTICIPANTES EN EVENTOS (ENTRIES)
CREATE TABLE IF NOT EXISTS public.event_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL DEFAULT 0,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, player_id)
);

ALTER TABLE public.event_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_entries' AND policyname='ee_select_public') THEN
    -- Todos pueden ver quién participa
    CREATE POLICY "ee_select_public" ON public.event_entries FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_entries' AND policyname='ee_insert_self') THEN
    -- Jugadores pueden inscribirse ellos mismos
    CREATE POLICY "ee_insert_self" ON public.event_entries FOR INSERT WITH CHECK (auth.uid() = player_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_entries' AND policyname='ee_admin_all') THEN
    -- Admins pueden gestionar participantes
    CREATE POLICY "ee_admin_all" ON public.event_entries FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_entries' AND policyname='ee_service') THEN
    CREATE POLICY "ee_service" ON public.event_entries FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ================================================================
-- INSTRUCCIONES:
-- 1. Ejecuta este script en Supabase SQL Editor.
-- 2. Ve a la tabla 'profiles' en Table Editor.
-- 3. Busca tu usuario y marca la casilla 'is_admin' como TRUE.
-- ================================================================
