-- ====================================================================================
-- CASINO 21 - FASE 8 MIGRATION (MATCHMAKING Y TEMPORADAS CLASIFICATORIAS)
-- ====================================================================================

-- 1. Actualizar tabla profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS peak_elo INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_season_elo INTEGER NOT NULL DEFAULT 1000;

-- 2. Crear tabla seasons (Temporadas)
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Crear tabla season_rankings (Historial por jugador y temporada)
CREATE TABLE IF NOT EXISTS public.season_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    final_elo INTEGER NOT NULL,
    peak_elo INTEGER NOT NULL,
    rank_position INTEGER, -- Posición final en la leaderboard
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(season_id, player_id)
);

-- 4. Habilitar RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_rankings ENABLE ROW LEVEL SECURITY;

-- 5. Políticas
CREATE POLICY "Seasons are viewable by everyone" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Season rankings are viewable by everyone" ON public.season_rankings FOR SELECT USING (true);

-- Solo Admins pueden modificar
CREATE POLICY "Admins can manage seasons" ON public.seasons
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can manage season rankings" ON public.season_rankings
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 6. Insertar Temporada 1 por defecto
-- Evitaremos duplicados con un WHERE NOT EXISTS
INSERT INTO public.seasons (id, "name", start_date, end_date, is_active)
SELECT gen_random_uuid(), 'Temporada 1: El Despertar', NOW(), NOW() + INTERVAL '3 months', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM public.seasons WHERE "name" = 'Temporada 1: El Despertar'
);

-- 7. Función para actualizar Peak ELO
CREATE OR REPLACE FUNCTION update_peak_elo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.elo > OLD.peak_elo THEN
        NEW.peak_elo := NEW.elo;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger para mantener Peak ELO automáticamente
DROP TRIGGER IF EXISTS trigger_update_peak_elo ON public.profiles;
CREATE TRIGGER trigger_update_peak_elo
BEFORE UPDATE OF elo ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_peak_elo();
