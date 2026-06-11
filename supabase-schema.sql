-- Ejecuta esto en el SQL Editor de tu proyecto Supabase

-- ═══ EXTENSIONES ═══
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══ TABLA: canciones ═══
CREATE TABLE IF NOT EXISTS songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'Sin título',
    artist TEXT NOT NULL DEFAULT '',
    genre TEXT NOT NULL DEFAULT '',
    key TEXT NOT NULL DEFAULT '',
    bpm INTEGER NOT NULL DEFAULT 90,
    strum_pattern TEXT NOT NULL DEFAULT 'simple',
    play_mode TEXT NOT NULL DEFAULT 'strum',
    picking_pattern TEXT NOT NULL DEFAULT 'arpegio_up',
    lyrics TEXT NOT NULL DEFAULT '',
    chords JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ TABLA: likes ═══
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(song_id, user_id)
);

-- ═══ MIGRACIÓN: agregar columnas de modo de ejecución (si no existen) ═══
ALTER TABLE songs ADD COLUMN IF NOT EXISTS play_mode TEXT NOT NULL DEFAULT 'strum';
ALTER TABLE songs ADD COLUMN IF NOT EXISTS picking_pattern TEXT NOT NULL DEFAULT 'arpegio_up';

-- ═══ ÍNDICES ═══
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_updated_at ON songs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_song_id ON likes(song_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- ═══ TRIGGER: updated_at ═══
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_songs_updated_at ON songs;
CREATE TRIGGER trg_songs_updated_at
    BEFORE UPDATE ON songs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ═══ ROW LEVEL SECURITY ═══
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- ─── POLÍTICAS: songs ───

-- Cualquiera (autenticado o no) puede leer canciones
CREATE POLICY "songs_select_all" ON songs
    FOR SELECT
    USING (true);

-- Solo el dueño puede insertar
CREATE POLICY "songs_insert_own" ON songs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Solo el dueño puede actualizar
CREATE POLICY "songs_update_own" ON songs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Solo el dueño puede eliminar
CREATE POLICY "songs_delete_own" ON songs
    FOR DELETE
    USING (auth.uid() = user_id);

-- ─── POLÍTICAS: likes ───

-- Cualquiera puede leer likes
CREATE POLICY "likes_select_all" ON likes
    FOR SELECT
    USING (true);

-- El usuario puede dar like (solo para sí mismo)
CREATE POLICY "likes_insert_own" ON likes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- El usuario puede quitar su propio like
CREATE POLICY "likes_delete_own" ON likes
    FOR DELETE
    USING (auth.uid() = user_id);

-- ═══ TABLA: perfiles ═══
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ ÍNDICE: perfiles ═══
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- ═══ ROW LEVEL SECURITY: perfiles ═══
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer los perfiles de los usuarios
CREATE POLICY "profiles_select_all" ON profiles
    FOR SELECT
    USING (true);

-- Un usuario puede insertar su propio perfil
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Un usuario puede actualizar su propio perfil
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ═══ TRIGGER: crear perfil al registrarse ═══
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Migración retroactiva: crear perfiles para usuarios existentes
INSERT INTO public.profiles (id, username)
SELECT id, COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

