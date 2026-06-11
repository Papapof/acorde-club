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
