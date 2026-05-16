SET search_path TO public;

-- Agregar columna max_participants a la tabla events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_participants INTEGER NOT NULL DEFAULT 16;

COMMENT ON COLUMN public.events.max_participants IS 'Máximo de participantes permitidos en el evento';

-- Agregar columna rules a la tabla events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS rules TEXT NOT NULL DEFAULT '';
COMMENT ON COLUMN public.events.rules IS 'Reglas del evento/torneo';
