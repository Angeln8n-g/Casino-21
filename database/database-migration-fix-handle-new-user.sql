-- ================================================================
-- CASINO 21 — FIX: MANEJO DE COLISIONES EN handle_new_user
-- ================================================================
-- Problema: Cuando dos usuarios se registran simultáneamente con
-- el mismo nombre de usuario, el trigger on_auth_user_created
-- falla con unique_violation en profiles_username_key porque
-- ON CONFLICT (id) no protege contra conflictos en username.
-- Esto causa "database error saving new user".
--
-- Solución: Envolver el INSERT en un bloque EXCEPTION que capture
-- unique_violation y reintente con un nombre basado en UUID.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  user_avatar TEXT;
  counter INTEGER := 1;
  max_attempts INTEGER := 10;
BEGIN
  base_username := COALESCE(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->'custom_claims'->>'global_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    'Jugador'
  );

  base_username := trim(base_username);

  IF base_username = '' THEN
    base_username := 'Jugador';
  END IF;

  final_username := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) AND counter <= max_attempts LOOP
    final_username := base_username || '_' || floor(random() * 9000 + 1000)::TEXT;
    counter := counter + 1;
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := 'Jugador_' || substr(new.id::TEXT, 1, 8);
  END IF;

  user_avatar := COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    NULL
  );

  BEGIN
    INSERT INTO public.profiles (id, username, avatar_url)
    VALUES (new.id, final_username, user_avatar)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    -- Ocurrió una colisión de username por race condition entre
    -- transacciones concurrentes. Reintentar con UUID como fallback.
    INSERT INTO public.profiles (id, username, avatar_url)
    VALUES (new.id, 'Jugador_' || substr(new.id::TEXT, 1, 8), user_avatar)
    ON CONFLICT (id) DO NOTHING;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
