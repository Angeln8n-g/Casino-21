-- supabase-avatar-migration.sql
-- 1. Agregar la columna avatar_url a la tabla profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Asegurar que las políticas de seguridad permitan actualizar este campo
-- (La política de UPDATE ya existe y permite al usuario editar su propio perfil, 
-- pero es bueno asegurar que el esquema está actualizado en PostgREST)
NOTIFY pgrst, 'reload schema';
