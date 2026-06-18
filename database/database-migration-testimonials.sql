-- ─── Testimonials Table ────────────────────────────────────────────────────────
-- Stores customer reviews and testimonials to be fetched dynamically on the landing page.

CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    rank TEXT NOT NULL,
    rank_class TEXT NOT NULL,
    elo INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Allow select for everyone
CREATE POLICY "Testimonials are viewable by everyone."
ON public.testimonials FOR SELECT
USING (is_active = true);

-- Seed initial records matching our player feedback
INSERT INTO public.testimonials (name, text, rating, rank, rank_class, elo)
VALUES 
('Carlos M.', 'El mejor juego de 21 online que he probado. Los torneos semanales son altamente competitivos y el matchmaking por ELO funciona de maravilla.', 5, 'Diamante', 'division-diamond', 2150),
('María L.', 'Me encanta poder crear salas privadas y jugar con amigos en tiempo real. La interfaz corre súper fluida tanto en móvil como en PC.', 5, 'Platino', 'division-platinum', 1890),
('Javier R.', 'Llevo 3 temporadas compitiendo en el circuito de torneos. El balance de cartas es impecable y la comunidad en Discord es muy activa.', 5, 'Oro', 'division-gold', 1620),
('Ana P.', 'El sistema de logros diarios te motiva a jugar una partida rápida todos los días. Empecé en Bronce y ya voy subiendo poco a poco.', 4, 'Plata', 'division-silver', 1410)
ON CONFLICT (id) DO NOTHING;
