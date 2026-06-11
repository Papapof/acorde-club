const STORAGE_KEY = 'guitar-chord-studio-songs';
const LIKES_KEY = 'acorde-club-likes';
const THEME_KEY = 'guitar-chord-studio-theme';

let chordDB = {};
let audioStarted = false;
let guitarSynth = null;
let masterGainHub = null;
let currentDetailSongId = null;
let isDetailPlaying = false;
let detailPlaybackTimer = null;
let playbackSessionHub = 0;

// ─── Init ───
document.addEventListener('DOMContentLoaded', async () => {
    loadTheme();
    loadVisualTheme();
    setupCreateSong();
    setupSearch();
    setupThemeSelector();
    setupDetailModal();
    const filterInput = document.getElementById('hub-filter');
    if (filterInput) { filterInput.value = ''; }
    await renderGrid();

    document.getElementById('btn-theme-toggle-hub').onclick = () => toggleTheme();
});

// ─── Theme (shared with other pages) ───
function loadTheme() {
    const isDark = localStorage.getItem(THEME_KEY) !== 'light';
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
    const icon = document.querySelector('#btn-theme-toggle-hub i');
    if (icon) icon.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

function toggleTheme() {
    const isDark = !document.body.classList.contains('dark');
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    const icon = document.querySelector('#btn-theme-toggle-hub i');
    if (icon) icon.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

function loadVisualTheme() {
    const saved = localStorage.getItem('acorde-club-theme') || 'naturaleza';
    setVisualTheme(saved);
}

function setVisualTheme(theme) {
    const body = document.body;
    body.classList.remove('theme-naturaleza', 'theme-bliss', 'theme-oceano', 'theme-playa');
    body.classList.add('theme-' + theme);
    document.querySelectorAll('.theme-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.theme === theme);
    });
    localStorage.setItem('acorde-club-theme', theme);
}

function setupThemeSelector() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.onclick = () => setVisualTheme(btn.dataset.theme);
    });
}

// ─── Create Song ───
function setupCreateSong() {
    const handler = (e) => {
        e.stopPropagation();
        window.location.href = 'index.html';
    };
    document.getElementById('btn-create-song').onclick = handler;
    const heroBtn = document.getElementById('btn-create-song-hero');
    if (heroBtn) heroBtn.onclick = handler;
}

// ─── Songs Data ───

// Cache para evitar llamadas repetidas
let _cachedSongs = null;
let _cachedLikes = null;

async function _loadSongsFromSupabase() {
    const sb = getSupabase();
    if (!sb) return null;
    try {
        const { data, error } = await sb.from('songs')
            .select('*')
            .order('updated_at', { ascending: false });
        if (!error && data) return data;
    } catch (e) {}
    return null;
}

async function _loadLikesFromSupabase() {
    const sb = getSupabase();
    if (!sb) return null;
    try {
        const { data, error } = await sb.from('likes').select('*');
        if (!error && data) {
            const likes = {};
            data.forEach(l => {
                if (!likes[l.song_id]) likes[l.song_id] = [];
                likes[l.song_id].push('anon');
            });
            return likes;
        }
    } catch (e) {}
    return null;
}

async function loadSongs(forceRefresh = false) {
    if (_cachedSongs && !forceRefresh) return _cachedSongs;
    const sbData = await _loadSongsFromSupabase();
    if (sbData) { _cachedSongs = sbData; return sbData; }
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const songs = raw ? JSON.parse(raw) : [];
        _cachedSongs = Array.isArray(songs) ? songs : [];
    } catch (e) { _cachedSongs = []; }
    return _cachedSongs;
}

async function loadLikes(forceRefresh = false) {
    if (_cachedLikes && !forceRefresh) return _cachedLikes;
    const sbData = await _loadLikesFromSupabase();
    if (sbData) { _cachedLikes = sbData; return sbData; }
    try {
        const raw = localStorage.getItem(LIKES_KEY);
        _cachedLikes = raw ? JSON.parse(raw) : {};
    } catch (e) { _cachedLikes = {}; }
    return _cachedLikes;
}

function getLikeCount(songId, likes) {
    return (likes[songId] || []).length;
}

function hasUserLiked(songId, likes) {
    const likedSongs = _getLikedSongsLocal();
    return likedSongs.includes(songId);
}

function _getLikedSongsLocal() {
    try {
        const raw = localStorage.getItem('acorde-club-liked-songs');
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function _saveLikedSongsLocal(songIds) {
    try { localStorage.setItem('acorde-club-liked-songs', JSON.stringify(songIds)); } catch (e) {}
}

async function toggleLike(songId) {
    const likedSongs = _getLikedSongsLocal();
    const idx = likedSongs.indexOf(songId);
    if (idx >= 0) likedSongs.splice(idx, 1);
    else likedSongs.push(songId);
    _saveLikedSongsLocal(likedSongs);

    const likes = await loadLikes();
    if (!likes[songId]) likes[songId] = [];
    const userLikeIdx = likes[songId].indexOf('local');
    if (idx >= 0) {
        if (userLikeIdx >= 0) likes[songId].splice(userLikeIdx, 1);
    } else {
        likes[songId].push('local');
    }
    try { localStorage.setItem(LIKES_KEY, JSON.stringify(likes)); } catch (e) {}
    _cachedLikes = null;
    await renderGrid();
}

// ─── Search ───
function setupSearch() {
    document.getElementById('hub-filter').oninput = async () => { await renderGrid(); };
}

// ─── Render Grid ───
async function renderGrid() {
    const grid = document.getElementById('hub-grid');
    const filter = (document.getElementById('hub-filter').value || '').toLowerCase();
    const songs = await loadSongs();
    const likes = await loadLikes();
    const empty = document.getElementById('hub-empty');

    let filtered = songs.filter(s => {
        if (!filter) return true;
        return (s.title || '').toLowerCase().includes(filter) ||
               (s.artist || '').toLowerCase().includes(filter) ||
               (s.genre || '').toLowerCase().includes(filter);
    });

    filtered.sort((a, b) => {
        const likesA = getLikeCount(a.id, likes);
        const likesB = getLikeCount(b.id, likes);
        if (likesB !== likesA) return likesB - likesA;
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    document.getElementById('hub-song-count').textContent = filtered.length + (filtered.length === 1 ? ' canción' : ' canciones');

    if (filtered.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }
    empty.style.display = 'none';

    grid.innerHTML = '';
    filtered.forEach(song => {
        const card = document.createElement('div');
        card.className = 'hub-card';

        const likeCount = getLikeCount(song.id, likes);
        const userLiked = hasUserLiked(song.id, likes);
        const chordCount = song.chords?.length || 0;

        card.innerHTML = `
            <div class="hub-card-head">
                <div class="hub-card-title">${song.title || 'Sin título'}</div>
                <div class="hub-card-artist">${song.artist || 'Artista desconocido'}</div>
                ${song.author ? `<div class="hub-card-author" style="font-size:0.75rem; color:var(--text-secondary); opacity:0.8; margin-top:0.25rem;"><i class="fa-solid fa-circle-user" style="font-size:0.8rem; margin-right:3px;"></i>${song.author}</div>` : ''}
            </div>
            <div class="hub-card-tags">
                ${song.genre ? `<span class="library-card-tag">${song.genre}</span>` : ''}
                ${song.key ? `<span class="library-card-tag">${song.key}</span>` : ''}
                ${chordCount > 0 ? `<span class="library-card-tag">${chordCount} acorde${chordCount !== 1 ? 's' : ''}</span>` : ''}
            </div>
            <div class="hub-card-actions">
                <button class="hub-like-btn ${userLiked ? 'liked' : ''}" data-id="${song.id}">
                    <i class="fa-solid fa-heart"></i>
                    <span>${likeCount}</span>
                </button>
                <button class="btn btn-sm btn-secondary hub-play-btn" data-id="${song.id}">
                    <i class="fa-solid fa-play"></i>
                </button>
                <button class="btn btn-sm btn-secondary hub-view-btn" data-id="${song.id}">
                    <i class="fa-solid fa-file-lines"></i>
                </button>
                <button class="btn btn-sm btn-secondary hub-dl-btn" data-id="${song.id}">
                    <i class="fa-solid fa-download"></i>
                </button>
            </div>
        `;

        card.querySelector('.hub-like-btn').onclick = async (e) => {
            e.stopPropagation();
            await toggleLike(song.id);
        };
        card.querySelector('.hub-play-btn').onclick = (e) => {
            e.stopPropagation();
            playSong(song, e);
        };
        card.querySelector('.hub-view-btn').onclick = async (e) => {
            e.stopPropagation();
            await openDetail(song.id);
        };
        card.querySelector('.hub-dl-btn').onclick = (e) => {
            e.stopPropagation();
            downloadSong(song);
        };
        card.onclick = async () => { await openDetail(song.id); };

        grid.appendChild(card);
    });
}

function muteAudioHub() {
    if (masterGainHub) {
        try {
            const now = Tone.getContext().rawContext.currentTime;
            masterGainHub.gain.cancelScheduledValues(now);
            masterGainHub.gain.setValueAtTime(masterGainHub.gain.value, now);
            masterGainHub.gain.linearRampToValueAtTime(0, now + 0.005);
        } catch(e) {}
    }
}

function unmuteAudioHub() {
    if (masterGainHub) {
        try {
            const now = Tone.getContext().rawContext.currentTime;
            masterGainHub.gain.cancelScheduledValues(now);
            masterGainHub.gain.setValueAtTime(masterGainHub.gain.value, now);
            masterGainHub.gain.linearRampToValueAtTime(1, now + 0.02);
        } catch(e) {}
    }
}

// ─── Playback (simple) ───
async function initAudio() {
    if (audioStarted) return;
    await Tone.start();
    audioStarted = true;
    try {
        const ac = Tone.getContext().rawContext;
        guitarSynth = await Soundfont.instrument(ac, 'acoustic_guitar_nylon', { soundfont: 'FluidR3_GM', gain: 0.8 });
        masterGainHub = ac.createGain();
        masterGainHub.gain.value = 1;
        masterGainHub.connect(ac.destination);
        if (guitarSynth.disconnect) guitarSynth.disconnect();
        if (guitarSynth.connect) guitarSynth.connect(masterGainHub);
    } catch (e) {
        guitarSynth = null;
        masterGainHub = null;
    }
}

function playSong(song, e) {
    if (!song.chords?.length) return;
    const btn = e.target.closest('.hub-play-btn') || e.target.closest('.btn');
    const wasPlaying = btn.dataset.playing === 'true';

    // Stop any playing
    document.querySelectorAll('.hub-play-btn[data-playing="true"]').forEach(b => {
        b.dataset.playing = 'false';
        b.innerHTML = '<i class="fa-solid fa-play"></i>';
    });
    if (detailPlaybackTimer) { clearInterval(detailPlaybackTimer); detailPlaybackTimer = null; }
    if (isDetailPlaying) { isDetailPlaying = false; Tone.Transport.stop(); Tone.Transport.cancel(); muteAudioHub(); }

    if (wasPlaying) {
        document.body.classList.remove('is-playing');
        Tone.Transport.stop();
        Tone.Transport.cancel();
        muteAudioHub();
        if (detailPlaybackTimer) { clearInterval(detailPlaybackTimer); detailPlaybackTimer = null; }
        return;
    }

    initAudio().then(() => {
        playbackSessionHub++;
        document.body.classList.add('is-playing');
        unmuteAudioHub();
        btn.dataset.playing = 'true';
        btn.innerHTML = '<i class="fa-solid fa-stop"></i>';

        const bpm = song.bpm || 90;
        Tone.Transport.bpm.value = bpm;
        Tone.Transport.stop();
        Tone.Transport.position = 0;
        Tone.Transport.cancel();

        let step = 0;
        const session = playbackSessionHub;
        Tone.Transport.scheduleRepeat((time) => {
            if (session !== playbackSessionHub) return;
            const chord = song.chords[step];
            if (!chord) return;
            const notes = chord.midiNotes?.filter(n => n > 0);
            if (notes?.length) {
                if (guitarSynth) {
                    notes.forEach((midi, i) => {
                        const vel = 0.4 + Math.random() * 0.35;
                        const drift = Math.random() * 0.008 - 0.004;
                        guitarSynth.play(Tone.Frequency(midi, 'midi').toNote(), time + i * 0.035 + drift, { duration: 1.2 + Math.random() * 0.6, gain: Math.max(vel, 0.2) });
                    });
                } else {
                    fallbackPlay(notes, time);
                }
            }
            step = (step + 1) % song.chords.length;
        }, '1n');

        Tone.Transport.start('+0.1');

        detailPlaybackTimer = setInterval(() => {
            if (btn.dataset.playing !== 'true') {
                document.body.classList.remove('is-playing');
                Tone.Transport.stop();
                Tone.Transport.cancel();
                muteAudioHub();
                clearInterval(detailPlaybackTimer);
            }
        }, 100);
    });
}

function fallbackPlay(midiNotes, time) {
    const ctx = Tone.getContext().rawContext;
    midiNotes.forEach((midi, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = Tone.Frequency(midi, 'midi').toFrequency();
        gain.gain.setValueAtTime(0.08, time + i * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
        osc.start(time + i * 0.035);
        osc.stop(time + 1.8);
    });
}

// ─── Download ───
function downloadSong(song) {
    const blob = new Blob([JSON.stringify(song, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (song.title || 'cancion').toLowerCase().replace(/\s+/g, '-') + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Detail Modal ───
function setupDetailModal() {
    document.getElementById('btn-detail-close').onclick = () => closeDetail();
    document.getElementById('detail-modal').onclick = (e) => {
        if (e.target === e.currentTarget) closeDetail();
    };
    document.getElementById('btn-detail-play').onclick = async () => {
        const songs = await loadSongs();
        const song = songs.find(s => s.id === currentDetailSongId);
        if (song) playDetail(song);
    };
    document.getElementById('btn-detail-download').onclick = async () => {
        const songs = await loadSongs();
        const song = songs.find(s => s.id === currentDetailSongId);
        if (song) downloadSong(song);
    };
}

async function openDetail(songId) {
    const songs = await loadSongs();
    const song = songs.find(s => s.id === songId);
    if (!song) return;
    currentDetailSongId = songId;

    document.getElementById('detail-title').querySelector('span').textContent = song.title || 'Sin título';
    document.getElementById('detail-artist').textContent = song.artist || 'Artista desconocido';

    const tags = document.getElementById('detail-tags');
    tags.innerHTML = '';
    if (song.genre) { const t = document.createElement('span'); t.className = 'library-card-tag'; t.textContent = song.genre; tags.appendChild(t); }
    if (song.key) { const t = document.createElement('span'); t.className = 'library-card-tag'; t.textContent = song.key; tags.appendChild(t); }
    if (song.bpm) { const t = document.createElement('span'); t.className = 'library-card-tag'; t.textContent = song.bpm + ' BPM'; tags.appendChild(t); }

    // Chords
    const chordGrid = document.getElementById('detail-chord-diagrams');
    chordGrid.innerHTML = '';
    if (song.chords?.length) {
        const unique = [];
        const seen = new Set();
        song.chords.forEach(c => {
            if (!seen.has(c.displayName)) {
                seen.add(c.displayName);
                unique.push(c);
            }
        });
        unique.forEach(c => {
            const wrapper = document.createElement('div');
            wrapper.className = 'detail-chord-item';
            const name = document.createElement('div');
            name.className = 'detail-chord-name';
            name.textContent = c.displayName;
            wrapper.appendChild(name);
            if (c.dbData?.positions?.[0]) {
                const dia = document.createElement('div');
                dia.style.width = '90px';
                dia.style.height = '120px';
                wrapper.appendChild(dia);
                try {
                    const isDark = document.body.classList.contains('dark');
                    new svguitar.SVGuitarChord(dia)
                        .configure({ color: isDark ? '#fff' : '#1a1a2e', frets: 5, strings: 6, fretSize: 1.5, fretWidth: 1, position: 1, style: 'normal' })
                        .chord({ fingers: getSvgFingers(c.dbData.positions[0]), barres: getBarres(c.dbData.positions[0]) })
                        .draw();
                } catch (e) {}
            }
            chordGrid.appendChild(wrapper);
        });
    }

    // Lyrics
    const lyricsEl = document.getElementById('detail-lyrics');
    const lyricsText = document.getElementById('detail-lyrics-text');
    if (song.lyrics?.trim()) {
        lyricsEl.style.display = '';
        lyricsText.textContent = song.lyrics;
    } else {
        lyricsEl.style.display = 'none';
    }

    document.getElementById('detail-modal').classList.remove('hidden');
    document.getElementById('btn-detail-play').innerHTML = '<i class="fa-solid fa-play"></i> Reproducir';
    isDetailPlaying = false;
}

function closeDetail() {
    document.getElementById('detail-modal').classList.add('hidden');
    document.body.classList.remove('is-playing');
    if (detailPlaybackTimer) { clearInterval(detailPlaybackTimer); detailPlaybackTimer = null; }
    if (isDetailPlaying) {
        isDetailPlaying = false;
        Tone.Transport.stop();
        Tone.Transport.cancel();
        muteAudioHub();
    }
}

function playDetail(song) {
    if (!song.chords?.length) return;
    const btn = document.getElementById('btn-detail-play');

    if (isDetailPlaying) {
        document.body.classList.remove('is-playing');
        isDetailPlaying = false;
        Tone.Transport.stop();
        Tone.Transport.cancel();
        muteAudioHub();
        if (detailPlaybackTimer) { clearInterval(detailPlaybackTimer); detailPlaybackTimer = null; }
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Reproducir';
        return;
    }

    initAudio().then(() => {
        playbackSessionHub++;
        document.body.classList.add('is-playing');
        unmuteAudioHub();
        isDetailPlaying = true;
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> Detener';

        const bpm = song.bpm || 90;
        Tone.Transport.bpm.value = bpm;
        Tone.Transport.stop();
        Tone.Transport.position = 0;
        Tone.Transport.cancel();

        let step = 0;
        const session = playbackSessionHub;
        Tone.Transport.scheduleRepeat((time) => {
            if (session !== playbackSessionHub || !isDetailPlaying) return;
            const chord = song.chords[step];
            if (!chord) return;
            const notes = chord.midiNotes?.filter(n => n > 0);
            if (notes?.length) {
                if (guitarSynth) {
                    notes.forEach((midi, i) => {
                        const vel = 0.4 + Math.random() * 0.35;
                        const drift = Math.random() * 0.008 - 0.004;
                        guitarSynth.play(Tone.Frequency(midi, 'midi').toNote(), time + i * 0.035 + drift, { duration: 1.2 + Math.random() * 0.6, gain: Math.max(vel, 0.2) });
                    });
                } else {
                    fallbackPlay(notes, time);
                }
            }
            step = (step + 1) % song.chords.length;
        }, '1n');

        Tone.Transport.start('+0.1');
    });
}

function getSvgFingers(pos) {
    const frets = pos.frets;
    const fingers = pos.fingers;
    const result = [];
    for (let i = 0; i < 6; i++) {
        const stringNum = 6 - i;
        const fret = frets[i];
        let fp;
        if (typeof fret === 'number') fp = fret === -1 ? 'x' : fret;
        else if (typeof fret === 'string') fp = fret.toLowerCase() === 'x' ? 'x' : parseInt(fret, 16);
        if (fp === 'x') result.push([stringNum, 'x']);
        else if (fp === 0) result.push([stringNum, 0]);
        else if (fp > 0) {
            const f = fingers?.[i];
            result.push(f && f !== '0' && f !== 0 && f !== '-' ? [stringNum, fp, String(f)] : [stringNum, fp]);
        }
    }
    return result;
}

function getBarres(pos) {
    if (!pos.barres?.length) return [];
    return pos.barres.map(f => ({ fromString: 6, toString: 1, fret: f }));
}
