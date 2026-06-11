// ─── Configuración de Supabase ───
// Reemplaza estos valores con los de tu proyecto Supabase.
// La anon key es segura para usar en cliente cuando hay RLS activado.

const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key-aqui';

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
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            },
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        });
    }
    return _supabase;
}

// ═══ Utilidades de verificación ═══
function isSupabaseReady() {
    return getSupabase() !== null;
}
