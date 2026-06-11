// ─── Sistema de Auth — usa Supabase cuando está disponible, fallback a localStorage ───

const AUTH_USERS_KEY = 'acorde-club-users';
const AUTH_SESSION_KEY = 'acorde-club-session';

const Auth = {
    _users: null,

    _load() {
        if (this._users) return this._users;
        try {
            const raw = localStorage.getItem(AUTH_USERS_KEY);
            this._users = raw ? JSON.parse(raw) : {};
        } catch (e) {
            this._users = {};
        }
        return this._users;
    },

    _save() {
        try { localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(this._users)); } catch (e) {}
    },

    // ─── Supabase helpers ───
    _sb() {
        if (typeof getSupabase === 'function') return getSupabase();
        return null;
    },

    _isOnline() {
        const sb = this._sb();
        return sb && sb.auth;
    },

    // ─── Registro ───
    async register(username, password) {
        const sb = this._sb();
        if (sb) {
            try {
                const { data, error } = await sb.auth.signUp({
                    email: username.toLowerCase().trim() + '@acordeclub.app',
                    password: password,
                    options: { data: { display_name: username.trim() } }
                });
                if (error) return { ok: false, error: error.message };
                // Inicia sesión automáticamente después del registro
                return { ok: true, data };
            } catch (e) {
                return { ok: false, error: 'Error de conexión con el servidor' };
            }
        }

        // Fallback localStorage
        const users = this._load();
        const key = username.toLowerCase().trim();
        if (!key || password.length < 3)
            return { ok: false, error: 'Usuario inválido o contraseña muy corta (mín. 3 caracteres)' };
        if (users[key]) return { ok: false, error: 'Ese nombre de usuario ya existe' };
        users[key] = { username: username.trim(), password, createdAt: new Date().toISOString() };
        this._save();
        return { ok: true };
    },

    // ─── Login ───
    async login(username, password) {
        const sb = this._sb();
        if (sb) {
            try {
                const email = username.toLowerCase().trim() + '@acordeclub.app';
                const { data, error } = await sb.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                if (error) return { ok: false, error: 'Usuario o contraseña incorrectos' };
                return { ok: true, data };
            } catch (e) {
                return { ok: false, error: 'Error de conexión con el servidor' };
            }
        }

        // Fallback localStorage
        const users = this._load();
        const key = username.toLowerCase().trim();
        const user = users[key];
        if (!user || user.password !== password)
            return { ok: false, error: 'Usuario o contraseña incorrectos' };
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
            username: user.username,
            loggedInAt: new Date().toISOString()
        }));
        return { ok: true };
    },

    // ─── Logout ───
    async logout() {
        const sb = this._sb();
        if (sb) {
            try { await sb.auth.signOut(); } catch (e) {}
        }
        localStorage.removeItem(AUTH_SESSION_KEY);
    },

    // ─── Sesión ───
    getSession() {
        try { return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)); } catch { return null; }
    },

    isLoggedIn() {
        return this.getSession() !== null;
    },

    getUsername() {
        const s = this.getSession();
        return s ? s.username : null;
    },

    async getUserId() {
        const sb = this._sb();
        if (sb) {
            try {
                const { data } = await sb.auth.getUser();
                return data?.user?.id || null;
            } catch (e) { return null; }
        }
        return null;
    },

    // ─── Refresh session from Supabase on page load ───
    async refreshSession() {
        const sb = this._sb();
        if (!sb) return;

        try {
            const { data: { session } } = await sb.auth.getSession();
            if (session?.user) {
                const displayName = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'Usuario';
                localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
                    username: displayName,
                    supabaseUserId: session.user.id,
                    loggedInAt: new Date().toISOString()
                }));
            } else {
                localStorage.removeItem(AUTH_SESSION_KEY);
            }
        } catch (e) {
            // No session
        }
    }
};
