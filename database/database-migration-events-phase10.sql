-- ========================================================================================
-- FASE 10: HISTORIAL DE PARTIDAS (MATCH HISTORY)
-- Descripción: Tabla para almacenar el resultado de las partidas jugadas, 
-- permitiendo a los usuarios revisar su historial, ganancias y cambios de ELO.
-- ========================================================================================

-- 1. Crear tabla match_history
CREATE TABLE IF NOT EXISTS public.match_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_mode TEXT NOT NULL, -- '1v1', '2v2', 'tournament'
    winner_id UUID REFERENCES public.profiles(id), -- Opcional, NULL si fue empate
    end_time TIMESTAMPTZ DEFAULT now(),
    
    -- Almacenará un JSON con el detalle de cada jugador que participó.
    -- Ejemplo de estructura esperada en cada elemento del array JSON:
    -- { "id": "uuid", "name": "Jugador", "score": 21, "elo_change": 25, "coins_earned": 50, "avatar": "..." }
    metadata JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 2. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (RLS)

-- Los usuarios solo pueden ver el historial de las partidas donde participaron.
-- Buscamos si su ID está dentro del arreglo JSON 'metadata' usando el operador @>
CREATE POLICY "Users can view their own match history"
    ON public.match_history
    FOR SELECT
    USING (
        metadata @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
        OR
        -- Permitir a admins ver todo el historial para auditorías
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Nota: Solo el servidor Node.js (usando la Service Role Key o permisos bypass) 
-- debería poder insertar en esta tabla al finalizar una partida.
-- Por lo tanto, NO creamos política de INSERT para usuarios regulares (auth.uid()).

-- 4. Índices para mejorar rendimiento de búsquedas
-- Índice GIN para búsquedas eficientes dentro del JSONB (buscar partidas de un jugador específico)
CREATE INDEX IF NOT EXISTS idx_match_history_metadata ON public.match_history USING GIN (metadata);

-- Índice para ordenar rápidamente por fecha descendente
CREATE INDEX IF NOT EXISTS idx_match_history_end_time ON public.match_history (end_time DESC);
