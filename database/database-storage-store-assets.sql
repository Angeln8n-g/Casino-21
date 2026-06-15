-- ====================================================================================
-- CASINO 21 - CONFIGURACIÓN DE STORAGE PARA LA TIENDA
-- ====================================================================================

-- 1. Crear el bucket 'store_assets' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('store_assets', 'store_assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Seguridad (RLS) para el bucket

-- Permitir a cualquier usuario ver las imágenes de la tienda
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'store_assets' );

-- Permitir solo a los administradores subir nuevas imágenes
CREATE POLICY "Admin Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'store_assets' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Permitir a los administradores actualizar imágenes
CREATE POLICY "Admin Update Access"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'store_assets' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Permitir a los administradores eliminar imágenes
CREATE POLICY "Admin Delete Access"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'store_assets' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Crear el bucket store_assets (público para lectura)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store_assets',
  'store_assets',
  true,
  5242880,  -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquiera puede leer (público)
CREATE POLICY "store_assets_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'store_assets');

-- Política: solo admins pueden subir/borrar
CREATE POLICY "store_assets_admin_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store_assets'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "store_assets_admin_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'store_assets'
  AND auth.role() = 'authenticated'
);
