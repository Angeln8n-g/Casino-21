-- ================================================================
-- CASINO 21 — MIGRACIÓN: AUTENTICACIÓN ROBUSTA (OAUTH & ANTI-COLISIONES)
-- ================================================================

SET search_path TO public;

-- 1. Asegurarnos de que la tabla profiles tiene la columna avatar_url (si no la tenía)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Actualizar la función handle_new_user para soportar OAuth y colisiones de nombres
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  user_avatar TEXT;
  counter INTEGER := 1;
  max_attempts INTEGER := 10;
BEGIN
  -- Extraer nombre base dependiendo de los metadatos disponibles (Email, Google, Discord)
  base_username := COALESCE(
    new.raw_user_meta_data->>'username',           -- Email signup tradicional
    new.raw_user_meta_data->>'custom_claims'->>'global_name', -- Discord
    new.raw_user_meta_data->>'full_name',          -- Google
    new.raw_user_meta_data->>'name',               -- Otros proveedores
    'Jugador'                                      -- Fallback
  );

  -- Limpiar el nombre de usuario (quitar espacios en blanco, etc.)
  base_username := trim(base_username);
  
  -- Si el nombre está vacío después de limpiar, usar fallback
  IF base_username = '' THEN
    base_username := 'Jugador';
  END IF;

  -- Inicializar el nombre final con el base
  final_username := base_username;

  -- Bucle para encontrar un nombre de usuario único
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) AND counter <= max_attempts LOOP
    -- Si el nombre ya existe, agregar un sufijo aleatorio de 4 dígitos
    final_username := base_username || '_' || floor(random() * 9000 + 1000)::TEXT;
    counter := counter + 1;
  END LOOP;

  -- Si después de 10 intentos (muy improbable) sigue habiendo colisión, usar el UUID
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := 'Jugador_' || substr(new.id::TEXT, 1, 8);
  END IF;

  -- Extraer avatar URL si está disponible
  user_avatar := COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    NULL
  );

  -- Insertar el nuevo perfil
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, final_username, user_avatar)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- El trigger existente 'on_auth_user_created' ya está apuntando a 'handle_new_user'
-- por lo que al reemplazar la función arriba, el trigger ya usará la nueva lógica.
