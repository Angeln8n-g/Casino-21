-- database-migration-events-phase16.sql
-- Fase 16: Soporte para series (Best-of-N) en la final de torneos
-- Agrega columnas para rastrear games dentro de una serie (BO3, BO5)

-- 1. Agregar columnas a tournament_matches
ALTER TABLE public.tournament_matches 
  ADD COLUMN IF NOT EXISTS best_of INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS series_game INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS series_id UUID;

-- 2. Index para búsqueda rápida de games en una serie
CREATE INDEX IF NOT EXISTS idx_tournament_matches_series_id 
  ON public.tournament_matches (series_id) 
  WHERE series_id IS NOT NULL;

-- 3. Comentario
COMMENT ON COLUMN public.tournament_matches.best_of IS 'Número de games necesarios para ganar la serie (1=single, 3=BO3, 5=BO5)';
COMMENT ON COLUMN public.tournament_matches.series_game IS 'Número de game dentro de la serie (1, 2, 3...)';
COMMENT ON COLUMN public.tournament_matches.series_id IS 'UUID que agrupa todos los games de la misma serie';
