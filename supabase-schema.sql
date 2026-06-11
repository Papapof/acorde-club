-- Ejecuta esto en el SQL Editor de tu proyecto Supabase

-- ═══ EXTENSIONES ═══
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══ TABLA: canciones ═══
CREATE TABLE IF NOT EXISTS songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'Sin título',
    author TEXT NOT NULL DEFAULT '',
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ ÍNDICES ═══
CREATE INDEX IF NOT EXISTS idx_songs_updated_at ON songs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_song_id ON likes(song_id);

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

-- Cualquiera puede leer canciones
DROP POLICY IF EXISTS "songs_select_all" ON songs;
CREATE POLICY "songs_select_all" ON songs
    FOR SELECT
    USING (true);

-- Cualquiera puede insertar canciones
DROP POLICY IF EXISTS "songs_insert_all" ON songs;
CREATE POLICY "songs_insert_all" ON songs
    FOR INSERT
    WITH CHECK (true);

-- Cualquiera puede actualizar canciones
DROP POLICY IF EXISTS "songs_update_all" ON songs;
CREATE POLICY "songs_update_all" ON songs
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Cualquiera puede eliminar canciones
DROP POLICY IF EXISTS "songs_delete_all" ON songs;
CREATE POLICY "songs_delete_all" ON songs
    FOR DELETE
    USING (true);

-- ─── POLÍTICAS: likes ───

-- Cualquiera puede leer likes
DROP POLICY IF EXISTS "likes_select_all" ON likes;
CREATE POLICY "likes_select_all" ON likes
    FOR SELECT
    USING (true);

-- Cualquiera puede insertar likes
DROP POLICY IF EXISTS "likes_insert_all" ON likes;
CREATE POLICY "likes_insert_all" ON likes
    FOR INSERT
    WITH CHECK (true);

-- Cualquiera puede eliminar likes
DROP POLICY IF EXISTS "likes_delete_all" ON likes;
CREATE POLICY "likes_delete_all" ON likes
    FOR DELETE
    USING (true);

