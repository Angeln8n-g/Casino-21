-- ====================================================================================
-- CASINO 21 - GESTIÓN DINÁMICA DE PISTAS DE AUDIO
-- ====================================================================================

-- 1. Crear tabla 'audio_tracks'
CREATE TABLE IF NOT EXISTS public.audio_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    src TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('lobby', 'game')),
    style VARCHAR(50) NOT NULL CHECK (style IN ('classic', 'modern')),
    track_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Otorgar permisos a los roles de Supabase
GRANT ALL ON public.audio_tracks TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_tracks TO authenticated;
GRANT SELECT ON public.audio_tracks TO anon;

-- Habilitar RLS en la tabla
ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;

-- Política: Lectura pública
CREATE POLICY "Public Read Access" 
ON public.audio_tracks FOR SELECT 
USING (true);

-- Política: Escritura solo admins
CREATE POLICY "Admin Write Access" 
ON public.audio_tracks FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- 2. Crear bucket 'audio_tracks'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio_tracks',
  'audio_tracks',
  true,
  15728640,  -- 15 MB
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp3']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Seguridad (RLS) para el bucket 'audio_tracks'

-- Política: Lectura pública
CREATE POLICY "audio_tracks_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio_tracks');

-- Política: Insertar solo admins
CREATE POLICY "audio_tracks_admin_insert"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'audio_tracks' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Política: Actualizar solo admins
CREATE POLICY "audio_tracks_admin_update"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'audio_tracks' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Política: Eliminar solo admins
CREATE POLICY "audio_tracks_admin_delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'audio_tracks' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- 4. Insertar datos iniciales (Seed)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.audio_tracks) THEN
        -- Pistas Clásicas Lobby
        INSERT INTO public.audio_tracks (name, src, category, style, track_order) VALUES
        ('Piano Longe', '/audio/Piana_longe.mp3', 'lobby', 'classic', 1),
        ('Casino Longe 1', '/audio/Casino_longe_1.mp3', 'lobby', 'classic', 2),
        ('Casino Longe 2', '/audio/Casino_Longe_2.mp3', 'lobby', 'classic', 3);

        -- Pistas Modernas Lobby
        INSERT INTO public.audio_tracks (name, src, category, style, track_order) VALUES
        ('Lobby Moderno 1', '/audio/Lobby_moderno_1.mp3', 'lobby', 'modern', 1),
        ('Lobby Moderno 2', '/audio/Lobby_moderno_2.mp3', 'lobby', 'modern', 2);

        -- Pistas Clásicas Partidas
        INSERT INTO public.audio_tracks (name, src, category, style, track_order) VALUES
        ('Secuencia Clásica 1', '/audio/Secuencia_1.mp3', 'game', 'classic', 1),
        ('Secuencia Clásica 2', '/audio/Secuencia_2.mp3', 'game', 'classic', 2),
        ('Secuencia Clásica 3', '/audio/Secuencia_3.mp3', 'game', 'classic', 3),
        ('Secuencia Clásica 4', '/audio/Secuencia_4.mp3', 'game', 'classic', 4);

        -- Pistas Modernas Partidas
        INSERT INTO public.audio_tracks (name, src, category, style, track_order) VALUES
        ('Secuencia Moderna 1', '/audio/secuencia_moderna_1.mp3', 'game', 'modern', 1),
        ('Secuencia Moderna 2', '/audio/Secuencia_moderna_2.mp3', 'game', 'modern', 2),
        ('Secuencia Moderna 3', '/audio/Secuencia_moderna_3.mp3', 'game', 'modern', 3),
        ('Secuencia Moderna 4', '/audio/Secuencia_moderna_4.mp3', 'game', 'modern', 4);
    END IF;
END $$;
