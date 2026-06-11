// ─── Configuración de Supabase ───
// Reemplaza estos valores con los de tu proyecto Supabase.
// La anon key es segura para usar en cliente cuando hay RLS activado.

const SUPABASE_URL = 'https://dyutkazstgslsyajmoqw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dXRrYXpzdGdzbHN5YWptb3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODc1NjQsImV4cCI6MjA5Njc2MzU2NH0.6C8ozYevFZt1ZYG3c8MMXHAwsM7PCXK4V-65moefFfo';

// ═══ Inicialización del cliente ═══
let _supabase = null;

function getSupabase() {
    if (!_supabase) {
        if (typeof supabase === 'undefined') {
            console.error('Supabase JS client no está cargado. Agrega el script en el HTML.');
            return null;
        }
        if (!SUPABASE_URL || SUPABASE_URL.includes('TU_PROYECTO')) {
            console.warn('Supabase: configura SUPABASE_URL y SUPABASE_ANON_KEY en supabase-config.js');
            return null;
        }
        _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false },
            realtime: { params: { eventsPerSecond: 10 } }
        });
    }
    return _supabase;
}

// ═══ Utilidades de verificación ═══
function isSupabaseReady() {
    return getSupabase() !== null;
}
