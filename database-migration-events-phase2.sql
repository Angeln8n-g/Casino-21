-- database-migration-events-phase2.sql
-- Este script elimina la tabla tournament_matches anterior (que referenciaba a tournaments)
-- y crea la nueva estructura basada en events para la Fase 2.

-- Eliminar tabla antigua si existe (podría referenciar a 'tournaments')
DROP TABLE IF EXISTS public.tournament_matches CASCADE;

-- Crear tabla nueva
CREATE TABLE public.tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  match_order INTEGER NOT NULL,
  player1_id UUID REFERENCES public.profiles(id),
  player2_id UUID REFERENCES public.profiles(id),
  winner_id UUID REFERENCES public.profiles(id),
  game_room_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'playing', 'completed', 'no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tournament_matches' AND policyname='tm_select_public') THEN
    CREATE POLICY "tm_select_public" ON public.tournament_matches FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tournament_matches' AND policyname='tm_admin_all') THEN
    CREATE POLICY "tm_admin_all" ON public.tournament_matches FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tournament_matches' AND policyname='tm_service') THEN
    CREATE POLICY "tm_service" ON public.tournament_matches FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
