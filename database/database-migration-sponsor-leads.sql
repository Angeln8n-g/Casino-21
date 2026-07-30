-- ============================================================
-- MIGRACIÓN: SPONSOR INQUIRIES (Leads de Marcas Patrocinadoras)
-- ============================================================

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.sponsor_inquiries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT NOT NULL,
  budget       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new'
               CHECK (status IN ('new', 'contacted', 'negotiating', 'closed', 'rejected')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sponsor_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS: Cualquier persona (incluso anónima) puede enviar una cotización
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sponsor_inquiries' AND policyname='si_public_insert') THEN
    CREATE POLICY "si_public_insert" ON public.sponsor_inquiries
      FOR INSERT WITH CHECK (TRUE);
  END IF;

  -- RLS: Solo administradores pueden ver y actualizar las cotizaciones
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sponsor_inquiries' AND policyname='si_admin_all') THEN
    CREATE POLICY "si_admin_all" ON public.sponsor_inquiries
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sponsor_inquiries_status ON public.sponsor_inquiries (status, created_at DESC);
