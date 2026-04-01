-- Eliminar tablas si existen (opcional)
-- DROP TABLE IF EXISTS matches;
-- DROP TABLE IF EXISTS profiles;

-- 1. Crear tabla de perfiles (Profiles)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  elo INTEGER DEFAULT 1000 NOT NULL,
  wins INTEGER DEFAULT 0 NOT NULL,
  losses INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar Row Level Security (RLS) para perfiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles:
-- Todos pueden ver los perfiles
CREATE POLICY "Public profiles are viewable by everyone." 
  ON profiles FOR SELECT 
  USING (true);

-- Los usuarios solo pueden insertar su propio perfil (generalmente manejado por un trigger, pero lo dejamos por si acaso)
CREATE POLICY "Users can insert their own profile." 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile." 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);


-- 2. Trigger para crear perfil automáticamente cuando un usuario se registra
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. Crear tabla de partidas (Matches)
CREATE TABLE matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player1_id UUID REFERENCES profiles(id) NOT NULL,
  player2_id UUID REFERENCES profiles(id) NOT NULL,
  winner_id UUID REFERENCES profiles(id), -- Puede ser NULL si fue empate o no terminó
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'abandoned', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar Row Level Security (RLS) para partidas
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Políticas para partidas:
-- Todos pueden ver las partidas (opcional, podrías restringirlo a solo los jugadores)
CREATE POLICY "Matches are viewable by everyone." 
  ON matches FOR SELECT 
  USING (true);

-- Solo el rol de servicio (backend) debería poder insertar o modificar partidas
-- El backend usa la Service Role Key, que ignora las políticas de RLS automáticamente.
-- Por lo tanto, no necesitamos políticas explícitas de INSERT/UPDATE para usuarios normales, 
-- asegurando que los clientes no puedan falsificar resultados de partidas.

-- ============================================
-- 4. TOURNAMENT MATCHES TABLE
-- ============================================
CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'no_show')),
  room_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for tournament_matches
CREATE INDEX idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_round ON tournament_matches(tournament_id, round_number);
CREATE INDEX idx_tournament_matches_player1 ON tournament_matches(player1_id);
CREATE INDEX idx_tournament_matches_player2 ON tournament_matches(player2_id);
CREATE INDEX idx_tournament_matches_status ON tournament_matches(status);
