-- Fase 13: Rediseño Alta Fidelidad y Tapetes Dinámicos

-- 1. Agregar board_theme_url a la tabla de eventos
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS board_theme_url TEXT;

-- 2. Agregar board_theme_url a la tabla de catálogo de misiones
ALTER TABLE public.quest_catalog 
ADD COLUMN IF NOT EXISTS board_theme_url TEXT;

-- 3. Comentario informativo sobre la columna
COMMENT ON COLUMN public.events.board_theme_url IS 'URL de la imagen o textura para el tapete de la mesa durante el evento';
COMMENT ON COLUMN public.quest_catalog.board_theme_url IS 'URL de la imagen o textura para el tapete de la mesa durante la misión';
