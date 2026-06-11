// ─── Strumming Patterns ───
const STRUM_PATTERNS = {
    simple:  { type: 'strum', label: 'Simple',  icon: '↓',     strums: [{ dir: 'down', beat: 0 }] },
    dd:      { type: 'strum', label: 'A-A',     icon: '↓↓',    strums: [{ dir: 'down', beat: 0 }, { dir: 'down', beat: 0.5 }] },
    du:      { type: 'strum', label: 'A-Ar',    icon: '↓↑',    strums: [{ dir: 'down', beat: 0 }, { dir: 'up', beat: 0.5 }] },
    ddu:     { type: 'strum', label: 'A-A-Ar',  icon: '↓↓↑',   strums: [{ dir: 'down', beat: 0 }, { dir: 'down', beat: 0.5 }, { dir: 'up', beat: 0.75 }] },
    folk:    { type: 'strum', label: 'Folk',    icon: '↓↓↑↑↓↑', strums: [
        { dir: 'down', beat: 0 }, { dir: 'down', beat: 0.25 }, { dir: 'up', beat: 0.375 },
        { dir: 'up', beat: 0.5 }, { dir: 'down', beat: 0.625 }, { dir: 'up', beat: 0.75 }
    ]},
    ballad:  { type: 'strum', label: 'Balada',  icon: '↓↑↓↑',  strums: [{ dir: 'down', beat: 0 }, { dir: 'up', beat: 0.25 }, { dir: 'down', beat: 0.5 }, { dir: 'up', beat: 0.75 }] },
    reggae:  { type: 'strum', label: 'Reggae',  icon: '·↑·↑',  strums: [{ dir: 'down', beat: 0, mute: true }, { dir: 'up', beat: 0.25, staccato: true }, { dir: 'down', beat: 0.5, mute: true }, { dir: 'up', beat: 0.75, staccato: true }] },
    waltz:   { type: 'strum', label: 'Vals',    icon: '↓↑↑',   strums: [{ dir: 'down', beat: 0 }, { dir: 'up', beat: 0.33 }, { dir: 'up', beat: 0.66 }] }
};

// ─── Fingerpicking Patterns ───
const PICKING_PATTERNS = {
    arpegio_up: {
        type: 'picking', label: 'Arpeg. ↑', icon: '↗',
        // Each note played individually, ascending strings
        beats: [[0], [1], [2], [3], [4], [5]]
    },
    arpegio_down: {
        type: 'picking', label: 'Arpeg. ↓', icon: '↙',
        beats: [[5], [4], [3], [2], [1], [0]]
    },
    arpegio_fast: {
        type: 'picking', label: 'Arpeg. Ráp.', icon: '⚡↗',
        beats: [[0, 1], [2, 3], [4, 5]]
    },
    travis: {
        type: 'picking', label: 'Travis', icon: 'B↓↑↓',
        beats: [[0], [2, 3], [1], [4, 5]]
    },
    waltz_pick: {
        type: 'picking', label: 'Vals Pun. ', icon: 'B··',
        beats: [[0, 1], [2, 3], [4, 5]]
    },
    pinchado: {
        type: 'picking', label: 'Pinchado', icon: 'B+↓',
        beats: [[0, 4, 5], [1, 2, 3]]
    },
    folk_pick: {
        type: 'picking', label: 'Folk Pun.', icon: 'B↗B↗',
        beats: [[0], [2, 3], [1], [4, 5]]
    }
};

const STORAGE_KEY = 'guitar-chord-studio-songs';
const THEME_KEY = 'guitar-chord-studio-theme';

const ESSENTIAL_CHORDS = [
    { root: 'C', suffix: 'major', label: 'C', group: 'major' },
    { root: 'G', suffix: 'major', label: 'G', group: 'major' },
    { root: 'D', suffix: 'major', label: 'D', group: 'major' },
    { root: 'A', suffix: 'major', label: 'A', group: 'major' },
    { root: 'E', suffix: 'major', label: 'E', group: 'major' },
    { root: 'F', suffix: 'major', label: 'F', group: 'major' },
    { root: 'Csharp', suffix: 'major', label: 'C#', group: 'sharp' },
    { root: 'Eb', suffix: 'major', label: 'D#', group: 'sharp' },
    { root: 'Fsharp', suffix: 'major', label: 'F#', group: 'sharp' },
    { root: 'Ab', suffix: 'major', label: 'G#', group: 'sharp' },
    { root: 'Bb', suffix: 'major', label: 'A#', group: 'sharp' },
    { root: 'A', suffix: 'minor', label: 'Am', group: 'minor' },
    { root: 'E', suffix: 'minor', label: 'Em', group: 'minor' },
    { root: 'D', suffix: 'minor', label: 'Dm', group: 'minor' },
    { root: 'B', suffix: 'minor', label: 'Bm', group: 'minor' }
];

function targetNameToDisplay(root, suffix) {
    if (suffix === 'major') return root;
    if (suffix === 'minor') return root + 'm';
    return root + suffix;
}

function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// ─── Main Application ───
class ChordComposer {
    constructor() {
        if (!Auth.isLoggedIn()) {
            window.location.href = 'hub.html';
            return;
        }

        this.sequence = [];
        this.isPlaying = false;
        this.currentStep = 0;
        this.chordDB = {};
        this.strumPattern = 'simple';
        this.pickingPattern = 'arpegio_up';
        this.playMode = 'strum';
        this.guitar = null;
        this.audioStarted = false;
        this.metronomeOn = false;
        this.metronomeSynth = null;
        this.masterGain = null;
        this.currentSongId = null;
        this.savedSongs = [];
        this.isDarkMode = true;

        this._playbackSession = 0;
        this._playbackStepCount = 0;

        this.initUI();
        this.loadTheme();
        this.loadVisualTheme();
        this._initAsync();
    }

    async _initAsync() {
        await this.loadLibrary();
    }

    // ─── UI Init ───
    async initUI() {
        this.composerArea = document.getElementById('composer-area');
        this.bpmInput = document.getElementById('bpm');

        // Playback
        document.getElementById('btn-play').onclick = () => this.togglePlayback();
        document.getElementById('btn-stop').onclick = () => this.stopPlayback();

        // Metronome
        document.getElementById('btn-metronome').onclick = () => this.toggleMetronome();

        // Song metadata
        ['song-title', 'song-artist', 'song-genre', 'song-key'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.onchange = () => this._markDirty();
        });

        // Save / Library / Export
        document.getElementById('btn-save').onclick = async () => { await this.saveSong(); };
        document.getElementById('btn-library').onclick = () => this.openLibrary();
        document.getElementById('btn-export-json').onclick = () => this.exportJSON();
        document.getElementById('btn-export-pdf').onclick = () => this.exportPDF();
        document.getElementById('btn-clear').onclick = () => {
            if (this.sequence.length > 0 && !confirm('¿Limpiar todos los acordes?')) return;
            this.clearSequence();
        };

        // Hub
        const hubBtn = document.getElementById('btn-go-hub');
        if (hubBtn) hubBtn.onclick = () => { window.location.href = 'hub.html'; };

        // Theme
        document.getElementById('btn-theme-toggle').onclick = () => this.toggleTheme();

        // Theme selector
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.onclick = () => this.setVisualTheme(btn.dataset.theme);
        });

        // Library modal
        document.getElementById('btn-close-library').onclick = () => this.closeLibrary();
        document.getElementById('library-filter').oninput = () => this.renderLibrary();
        document.getElementById('btn-import-json').onclick = () => {
            document.getElementById('import-file-input').click();
        };
        document.getElementById('import-file-input').onchange = (e) => this.importJSON(e);

        // Close modal on overlay click
        document.getElementById('library-modal').onclick = (e) => {
            if (e.target === e.currentTarget) this.closeLibrary();
        };

        // Chord selector
        document.getElementById('btn-preview-chord').onclick = async () => this.previewChord();
        document.getElementById('btn-add-chord').onclick = () => this.addChordFromSelector();
        document.getElementById('chord-root').onchange = () => this.updateSuffixes();
        document.getElementById('chord-suffix').onchange = () => {};

        // BPM
        this.bpmInput.onchange = (e) => {
            Tone.Transport.bpm.value = parseInt(e.target.value) || 120;
            this._markDirty();
        };

        // Essential chords
        this._buildEssentialGrid();
        this._buildStrumGrid();
        this._buildPickingGrid();

        // Load chord database
        await this.loadDatabase();
    }

    _buildEssentialGrid() {
        const grid = document.getElementById('essential-grid');
        grid.innerHTML = '';
        ESSENTIAL_CHORDS.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'quick-chord-btn';
            btn.textContent = c.label;
            btn.onclick = () => this.quickAddChord(c.root, c.suffix, c.label);
            grid.appendChild(btn);
        });
    }

    _buildStrumGrid() {
        const grid = document.getElementById('strum-grid');
        grid.innerHTML = '';
        Object.entries(STRUM_PATTERNS).forEach(([key, p]) => {
            const btn = document.createElement('button');
            btn.className = 'strum-btn' + (key === this.strumPattern ? ' active' : '');
            btn.dataset.pattern = key;
            btn.innerHTML = `<span class="strum-icon">${p.icon}</span><span class="strum-name">${p.label}</span>`;
            btn.onclick = () => this.setStrumPattern(key);
            grid.appendChild(btn);
        });
    }

    _buildPickingGrid() {
        const grid = document.getElementById('picking-grid');
        if (!grid) return;
        grid.innerHTML = '';
        Object.entries(PICKING_PATTERNS).forEach(([key, p]) => {
            const btn = document.createElement('button');
            btn.className = 'strum-btn' + (this.playMode === 'picking' && key === this.pickingPattern ? ' active' : '');
            btn.dataset.pattern = key;
            btn.innerHTML = `<span class="strum-icon">${p.icon}</span><span class="strum-name">${p.label}</span>`;
            btn.onclick = () => this.setPickingPattern(key);
            grid.appendChild(btn);
        });
    }

    setPickingPattern(key) {
        if (PICKING_PATTERNS[key]) {
            this.playMode = 'picking';
            this.pickingPattern = key;
            document.querySelectorAll('#picking-grid .strum-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.pattern === key);
            });
            document.querySelectorAll('#strum-grid .strum-btn').forEach(b => {
                b.classList.remove('active');
            });
            this._markDirty();
        }
    }

    setStrumPattern(key) {
        if (STRUM_PATTERNS[key]) {
            this.playMode = 'strum';
            this.strumPattern = key;
            document.querySelectorAll('#strum-grid .strum-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.pattern === key);
            });
            document.querySelectorAll('#picking-grid .strum-btn').forEach(b => {
                b.classList.remove('active');
            });
            this._markDirty();
        }
    }

    // ─── Theme ───
    loadTheme() {
        try {
            this.isDarkMode = localStorage.getItem(THEME_KEY) !== 'light';
        } catch(e) {}
        this._applyTheme();
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this._applyTheme();
        try { localStorage.setItem(THEME_KEY, this.isDarkMode ? 'dark' : 'light'); } catch(e) {}
    }

    _applyTheme() {
        const body = document.body;
        body.classList.remove('dark', 'light');
        body.classList.add(this.isDarkMode ? 'dark' : 'light');
        const icon = document.querySelector('#btn-theme-toggle i');
        if (icon) {
            icon.className = this.isDarkMode ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        }
    }

    // ─── Database ───
    async loadDatabase() {
        try {
            const res = await fetch('https://raw.githubusercontent.com/tombatossals/chords-db/master/lib/guitar.json');
            const data = await res.json();
            this.chordDB = data.chords;

            document.getElementById('db-status').style.display = 'none';

            const rootSelect = document.getElementById('chord-root');
            const suffixSelect = document.getElementById('chord-suffix');
            const btnAdd = document.getElementById('btn-add-chord');
            const btnPreview = document.getElementById('btn-preview-chord');

            const displayRoots = [
                { label: 'C', value: 'C' },
                { label: 'C# / Db', value: 'Csharp' },
                { label: 'D', value: 'D' },
                { label: 'D# / Eb', value: 'Eb' },
                { label: 'E', value: 'E' },
                { label: 'F', value: 'F' },
                { label: 'F# / Gb', value: 'Fsharp' },
                { label: 'G', value: 'G' },
                { label: 'G# / Ab', value: 'Ab' },
                { label: 'A', value: 'A' },
                { label: 'A# / Bb', value: 'Bb' },
                { label: 'B', value: 'B' }
            ];

            rootSelect.innerHTML = '';
            displayRoots.forEach(root => {
                if (this.chordDB[root.value]) {
                    const opt = document.createElement('option');
                    opt.value = root.value;
                    opt.dataset.label = root.label;
                    opt.textContent = root.label;
                    rootSelect.appendChild(opt);
                }
            });
            rootSelect.disabled = false;
            suffixSelect.disabled = false;
            btnAdd.disabled = false;
            btnPreview.disabled = false;

            this.updateSuffixes();
        } catch (e) {
            console.error(e);
            document.getElementById('db-status').textContent = 'Error al cargar base de datos';
        }
    }

    updateSuffixes() {
        const rootSelect = document.getElementById('chord-root');
        const suffixSelect = document.getElementById('chord-suffix');
        const root = rootSelect.value;

        suffixSelect.innerHTML = '';
        if (this.chordDB[root]) {
            this.chordDB[root].forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.suffix;
                opt.textContent = item.suffix === 'major' ? 'mayor (M)' : item.suffix;
                suffixSelect.appendChild(opt);
            });
        }
    }

    // ─── Audio Init ───
    async initAudioContext() {
        if (!this.audioStarted) {
            await Tone.start();
            this.audioStarted = true;
            Tone.Transport.bpm.value = parseInt(this.bpmInput.value) || 120;

            try {
                const ac = Tone.getContext().rawContext;
                this.guitar = await Soundfont.instrument(ac, 'acoustic_guitar_nylon', {
                    soundfont: 'FluidR3_GM',
                    gain: 0.8
                });
                // Route guitar through master gain for instant mute on stop
                this.masterGain = ac.createGain();
                this.masterGain.gain.value = 1;
                this.masterGain.connect(ac.destination);
                if (this.guitar.disconnect) this.guitar.disconnect();
                if (this.guitar.connect) this.guitar.connect(this.masterGain);
            } catch (e) {
                console.warn('Soundfont load failed, falling back to synth', e);
                this.guitar = null;
                this.masterGain = null;
            }

            // Metronome sound
            this.metronomeSynth = new Tone.MembraneSynth({
                pitchDecay: 0.02,
                octaves: 5,
                envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 }
            }).toDestination();
        }
    }

    // ─── Visual Theme ───
    setVisualTheme(theme) {
        const body = document.body;
        body.classList.remove('theme-naturaleza', 'theme-bliss', 'theme-oceano', 'theme-playa');
        body.classList.add('theme-' + theme);
        document.querySelectorAll('.theme-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.theme === theme);
        });
        try { localStorage.setItem('acorde-club-theme', theme); } catch(e) {}
    }

    loadVisualTheme() {
        try {
            const saved = localStorage.getItem('acorde-club-theme');
            if (saved) {
                this.setVisualTheme(saved);
            } else {
                this.setVisualTheme('naturaleza');
            }
        } catch(e) {
            this.setVisualTheme('naturaleza');
        }
    }

    // ─── Chords ───
    quickAddChord(root, suffix, labelRoot) {
        if (!this.chordDB[root]) return;
        const dbSuffixData = this.chordDB[root].find(s => s.suffix === suffix);
        if (!dbSuffixData) return;

        let tonalName = labelRoot + suffix;
        if (suffix === 'major') tonalName = labelRoot;

        this.addChord(targetNameToDisplay(labelRoot, suffix), tonalName, dbSuffixData);
    }

    addChordFromSelector() {
        const rootSelect = document.getElementById('chord-root');
        const suffixSelect = document.getElementById('chord-suffix');
        const rootValue = rootSelect.value;
        const rootLabel = rootSelect.options[rootSelect.selectedIndex].dataset.label;
        const suffix = suffixSelect.value;
        const dbSuffixData = this.chordDB[rootValue]?.find(s => s.suffix === suffix);
        if (!dbSuffixData) return;

        const displayRoot = rootLabel.split(' / ')[0];
        let tonalName = displayRoot + suffix;
        if (suffix === 'major') tonalName = displayRoot;

        this.addChord(targetNameToDisplay(displayRoot, suffix), tonalName, dbSuffixData);
    }

    async previewChord() {
        const rootValue = document.getElementById('chord-root').value;
        const suffix = document.getElementById('chord-suffix').value;
        const dbSuffixData = this.chordDB[rootValue]?.find(s => s.suffix === suffix);

        if (dbSuffixData?.positions?.[0]?.midi) {
            const midiNotes = dbSuffixData.positions[0].midi.filter(m => m > 0);
            await this.initAudioContext();
            this.strumChord(midiNotes, null, 2.0, { dir: 'down', staccato: false, mute: false });
        }
    }

    addChord(displayName, tonalParsingName, dbData) {
        if (this.sequence.length === 0) {
            this.composerArea.innerHTML = '';
        }

        const id = generateId();
        let midiNotes = [];
        if (dbData?.positions?.[0]?.midi) {
            midiNotes = dbData.positions[0].midi.filter(m => m > 0);
        }

        this.sequence.push({ id, tonalParsingName, midiNotes, displayName, dbData });

        const block = this._createChordBlock(id, displayName, dbData, midiNotes, tonalParsingName);
        this.composerArea.appendChild(block);
        this._markDirty();
    }

    _createChordBlock(id, displayName, dbData, midiNotes, tonalParsingName) {
        const block = document.createElement('div');
        block.className = 'chord-box';
        block.id = id;

        const nameEl = document.createElement('div');
        nameEl.className = 'chord-box-name';
        nameEl.textContent = displayName;

        const removeEl = document.createElement('div');
        removeEl.className = 'chord-box-remove';
        removeEl.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        removeEl.onclick = (e) => {
            e.stopPropagation();
            this.removeChord(id);
        };

        const diagramContainer = document.createElement('div');
        diagramContainer.className = 'chord-diagram-container';

        block.appendChild(nameEl);
        block.appendChild(diagramContainer);
        block.appendChild(removeEl);

        block.onclick = async () => {
            await this.initAudioContext();
            const seqItem = this.sequence.find(s => s.id === id);
            if (seqItem) this.playSingleChord(seqItem);
        };

        // Draw SVG diagram
        if (dbData?.positions?.[0]) {
            this._drawChordDiagram(diagramContainer, block, nameEl, dbData.positions[0], displayName);
        }

        return block;
    }

    _drawChordDiagram(container, block, nameEl, pos, displayName) {
        const validFrets = pos.frets.filter(f => typeof f === 'number' && f > 0);
        const minFret = validFrets.length > 0 ? Math.min(...validFrets) : 1;
        const actualStartFret = pos.baseFret + minFret - 1;

        if (actualStartFret > 1) {
            const span = document.createElement('span');
            span.textContent = ` (${actualStartFret}fr)`;
            span.style.fontSize = '0.75em';
            span.style.fontWeight = '600';
            span.style.color = 'var(--accent)';
            nameEl.appendChild(span);
        }

        const frets = pos.frets;
        const fingers = pos.fingers;
        const svgFingers = [];
        let barreItems = [];

        for (let i = 0; i < 6; i++) {
            const fret = frets[i];
            const stringNum = 6 - i;
            let fingerText;
            if (fingers?.length > i) {
                const f = fingers[i];
                if (f && f !== '0' && f !== 0 && f !== '-') fingerText = String(f);
            }
            let fp;
            if (typeof fret === 'number') {
                fp = fret === -1 ? 'x' : fret;
            } else if (typeof fret === 'string') {
                fp = fret.toLowerCase() === 'x' ? 'x' : parseInt(fret, 16);
            }
            if (fp === 'x') svgFingers.push([stringNum, 'x']);
            else if (fp === 0) svgFingers.push([stringNum, 0]);
            else if (fp > 0) {
                svgFingers.push(fingerText ? [stringNum, fp, fingerText] : [stringNum, fp]);
            }
        }

        if (pos.barres?.length) {
            pos.barres.forEach(f => {
                barreItems.push({ fromString: 6, toString: 1, fret: f });
            });
        }

        const svgPos = actualStartFret >= 1 ? actualStartFret : 1;
        const isDarkMode = document.body.classList.contains('dark');
        try {
            new svguitar.SVGuitarChord(container)
                .configure({
                    color: isDarkMode ? '#ffffff' : '#1a1a2e',
                    frets: 5,
                    strings: 6,
                    fretSize: 1.5,
                    fretWidth: 1,
                    position: svgPos,
                    style: 'normal'
                })
                .chord({ fingers: svgFingers, barres: barreItems })
                .draw();

            if (actualStartFret > 1) {
                const badge = document.createElement('div');
                badge.className = 'fret-badge';
                badge.textContent = actualStartFret + 'fr';
                block.appendChild(badge);
            }
        } catch (err) {
            console.warn('SVGuitar draw error for', displayName, err);
        }
    }

    removeChord(id) {
        this.sequence = this.sequence.filter(c => c.id !== id);
        const block = document.getElementById(id);
        if (block) block.remove();

        if (this.sequence.length === 0) {
            this._showEmptyState();
        }
        this._markDirty();
    }

    clearSequence() {
        if (this.isPlaying) this.stopPlayback();
        this._muteAudio();
        this.sequence = [];
        this._showEmptyState();
        this._markDirty();
    }

    _showEmptyState() {
        this.composerArea.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-music"></i>
                <p>Agrega acordes desde la paleta para empezar a componer.</p>
            </div>`;
    }

    // ─── Audio Playback ───

    // Realistic strum: mimics how a pick hits strings in a real guitar stroke.
    // - Down: low→high strings, with a non-linear timing curve (quick start, slight drag at end)
    // - Up: high→low strings, faster overall, with emphasis on treble
    // - Beat accent: downbeats get more energy, upbeats are lighter
    // - Per-string velocity: shaped by string position + strum direction + random fluctuation
    strumChord(midiNotes, baseTime, noteDuration = 1.5, strumDef = {}) {
        if (!this.guitar || !midiNotes?.length) return;

        const ac = Tone.getContext().rawContext;
        const base = baseTime != null ? baseTime : ac.currentTime;
        const isUp = strumDef.dir === 'up';
        const isMute = strumDef.mute;
        const isStaccato = strumDef.staccato;
        const beat = strumDef.beat !== undefined ? strumDef.beat : 0;

        const count = midiNotes.length;
        if (!count) return;

        // Total time for the pick to travel across all strings
        // Down: ~85ms, Up: ~55ms (up is naturally faster/lighter)
        const totalSweep = isUp ? 0.055 : 0.085;

        // Random energy for this entire strum (±30%) — each strum feels unique
        const strumEnergy = 0.75 + Math.random() * 0.6;

        // Beat accent: downbeats (0, 0.5) punch harder, upbeats are lighter
        const beatNorm = ((beat % 1) + 1) % 1;
        const isDownbeat = beatNorm < 0.01 || Math.abs(beatNorm - 0.5) < 0.01;
        const isOffbeat = Math.abs(beatNorm - 0.25) < 0.01 || Math.abs(beatNorm - 0.75) < 0.01;
        const beatAccent = isDownbeat ? 1.15 : (isOffbeat ? 0.88 : 1.0);

        for (let i = 0; i < count; i++) {
            // For up-strum: iterate from treble (end) to bass (start)
            const srcIdx = isUp ? count - 1 - i : i;
            const midi = midiNotes[srcIdx];
            if (midi <= 0) continue;

            const noteName = Tone.Frequency(midi, 'midi').toNote();

            // Normalised position of this string in the strum (0=first, 1=last)
            const pos = count > 1 ? i / (count - 1) : 0;

            // --- VELOCITY (gain) ---
            let gain;
            if (isMute) {
                gain = strumEnergy * 0.25;
            } else if (isUp) {
                // Up-strum: treble (pos=0) is strongest, bass (pos=1) is weakest
                // Subtle dip in the middle, slight lift on bass for thump
                gain = 0.75 - pos * 0.45;
                if (pos > 0.8) gain += 0.1;
            } else {
                // Down-strum: bass (pos=0) is strongest, treble (pos=1) is weakest
                // Slight treble boost for sparkle on the top 2 strings
                gain = 0.85 - pos * 0.40;
                if (pos > 0.65) gain += 0.08;
            }

            // Apply beat accent + strum energy + random per-string fluctuation
            gain *= beatAccent * strumEnergy;
            gain *= 0.7 + Math.random() * 0.6;

            // --- TIMING ---
            // Use an ease curve so strings are not hit at equal intervals:
            // Down: pick starts fast, slows slightly toward the end (cubic ease-out)
            // Up: pick starts slower, accelerates (quadratic ease-in)
            let timeNorm;
            if (isUp) {
                timeNorm = 1 - Math.pow(1 - pos, 1.6);
            } else {
                timeNorm = Math.pow(pos, 0.65);
            }
            // Micro-drift per string (±2ms)
            const microJitter = Math.random() * 0.004 - 0.002;
            const time = base + timeNorm * totalSweep + microJitter;

            // --- DURATION ---
            let dur;
            if (isMute) {
                dur = 0.03 + Math.random() * 0.02;
            } else if (isStaccato) {
                dur = 0.10 + Math.random() * 0.06;
            } else {
                // Bass rings longer than treble; vary per string
                const lengthNorm = isUp ? 1 - pos : 1 - pos * 0.6;
                dur = noteDuration * (0.5 + lengthNorm * 0.5) * (0.75 + Math.random() * 0.5);
                dur = Math.max(dur, Math.min(noteDuration * 0.25, 0.12));
            }

            this.guitar.play(noteName, time, {
                duration: Math.max(dur, 0.03),
                gain: Math.max(gain, 0.08)
            });
        }
    }

    // Fingerpicking: each string is plucked individually with natural velocity variation
    fingerpickChord(midiNotes, time, measureSecs, pattern, bpm) {
        if (!this.guitar || !midiNotes?.length) return;

        const rawMidi = midiNotes;
        const beats = pattern.beats || [];
        if (!beats.length) return;

        const beatCount = beats.length;

        beats.forEach((stringIndices, b) => {
            // Distribute beats evenly across the measure
            const beatPos = beatCount > 1 ? b / (beatCount - 1) : 0.5;
            const baseTime = time + beatPos * measureSecs;

            // Each beat has its own energy
            const beatEnergy = 0.7 + Math.random() * 0.4;

            // Subtle push/pull per beat for natural feel
            const groove = (Math.random() * 0.006 - 0.003);
            const firstStringTime = baseTime + groove;

            stringIndices.forEach((strIdx, si) => {
                if (strIdx < 0 || strIdx >= rawMidi.length) return;
                const midi = rawMidi[strIdx];
                if (midi <= 0) return;

                const noteName = Tone.Frequency(midi, 'midi').toNote();

                // Organic velocity: thumb (low strings) naturally louder
                let vel = beatEnergy * (0.6 + Math.random() * 0.5);
                if (strIdx <= 1) vel *= 1.25;
                else if (strIdx >= 4) vel *= 0.85;

                // Spread notes within same beat group (not perfectly simultaneous)
                const spread = si * (0.012 + Math.random() * 0.008);
                const humanize = Math.random() * 0.008 - 0.004;

                // Duration: bass notes sustain longer, treble shorter
                const durBase = strIdx <= 1 ? 1.2 : 0.5;
                const dur = (durBase + Math.random() * 0.4) * (measureSecs / 2);

                this.guitar.play(noteName, firstStringTime + spread + humanize, {
                    duration: Math.max(dur, 0.12),
                    gain: Math.max(vel * 0.55, 0.15)
                });
            });
        });
    }

    playSingleChord(chordData) {
        const { tonalParsingName, midiNotes } = chordData;
        if (this.guitar && midiNotes?.length > 0) {
            this.strumChord(midiNotes);
        } else {
            this._fallbackPlay(tonalParsingName);
        }
    }

    _fallbackPlay(chordName) {
        const info = Tonal.Chord.get(chordName);
        const notes = info?.notes;
        if (!notes?.length) return;
        const ctx = Tone.getContext().rawContext;
        const dest = this.masterGain || ctx.destination;
        notes.forEach((n, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(dest);
            osc.frequency.value = Tone.Frequency(n + '4').toFrequency();
            gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.035);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
            osc.start(ctx.currentTime + i * 0.035);
            osc.stop(ctx.currentTime + 2.5);
        });
    }

    // ─── Metronome ───
    toggleMetronome() {
        this.metronomeOn = !this.metronomeOn;
        const btn = document.getElementById('btn-metronome');
        btn.classList.toggle('active', this.metronomeOn);
    }

    _playMetronomeTick(time, isDownbeat) {
        if (!this.metronomeSynth || !this.metronomeOn) return;
        const freq = isDownbeat ? 150 : 100;
        const vol = isDownbeat ? -6 : -12;
        this.metronomeSynth.triggerAttackRelease(freq, '16n', time, vol);
    }

    // ─── Playback ───
    async togglePlayback() {
        if (this.sequence.length === 0) return;
        await this.initAudioContext();
        const playBtn = document.getElementById('btn-play');

        if (this.isPlaying) {
            this.stopPlayback();
            return;
        }

        // Unmute master gain before starting
        this._unmuteAudio();

        // Bump session to invalidate any stale callbacks
        this._playbackSession++;

        this.isPlaying = true;
        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pausa';
        playBtn.classList.remove('btn-primary');
        playBtn.classList.add('btn-danger');
        this.currentStep = 0;
        this._playbackStepCount = this.sequence.length;

        // Show progress
        const progressEl = document.getElementById('playback-progress');
        progressEl.classList.remove('hidden');
        this._updateProgress(0, this._playbackStepCount);

        // Full clean restart of transport
        Tone.Transport.stop();
        Tone.Transport.position = 0;
        Tone.Transport.cancel();

        const session = this._playbackSession;
        Tone.Transport.scheduleRepeat((time) => {
            // Double-check: only execute if this session is still current
            if (session !== this._playbackSession) return;
            this.playStep(time);
        }, '1n');

        Tone.Transport.start('+0.1');
    }

    _muteAudio() {
        if (this.masterGain) {
            try {
                const now = Tone.getContext().rawContext.currentTime;
                this.masterGain.gain.cancelScheduledValues(now);
                this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
                this.masterGain.gain.linearRampToValueAtTime(0, now + 0.005);
            } catch(e) {}
        }
    }

    _unmuteAudio() {
        if (this.masterGain) {
            try {
                const now = Tone.getContext().rawContext.currentTime;
                this.masterGain.gain.cancelScheduledValues(now);
                this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
                this.masterGain.gain.linearRampToValueAtTime(1, now + 0.02);
            } catch(e) {}
        }
    }

    // Humanised micro-timing offset for groove feel
    // Downbeats anchor the rhythm (on time or slightly ahead)
    // Upbeats and offbeats sit slightly behind for a relaxed swing
    _grooveOffset(beat) {
        const beatNorm = ((beat % 1) + 1) % 1;
        let offset = 0;
        if (beatNorm < 0.01 || Math.abs(beatNorm - 0.5) < 0.01) {
            // Strong beats: solid, maybe a hair ahead
            offset = -0.004 + Math.random() * 0.004;
        } else if (Math.abs(beatNorm - 0.25) < 0.01 || Math.abs(beatNorm - 0.75) < 0.01) {
            // Offbeats: laid back, slightly behind
            offset = 0.006 + Math.random() * 0.010;
        } else {
            // Other 16th-note positions: subtle random nudge
            offset = (Math.random() * 0.008) - 0.004;
        }
        return offset;
    }

    playStep(time) {
        if (!this.isPlaying) return;

        const chord = this.sequence[this.currentStep];
        if (!chord) return;

        Tone.Draw.schedule(() => {
            document.querySelectorAll('.chord-box').forEach(b => b.classList.remove('playing'));
            const block = document.getElementById(chord.id);
            if (block) block.classList.add('playing');
        }, time);

        // Metronome click on beat 0
        this._playMetronomeTick(time, true);

        const bpm = Tone.Transport.bpm.value;
        const measureSecs = (60 / bpm) * 4;

        if (this.playMode === 'picking') {
            const pattern = PICKING_PATTERNS[this.pickingPattern] || PICKING_PATTERNS.arpegio_up;
            const rawMidi = chord.dbData?.positions?.[0]?.midi || chord.midiNotes;
            this.fingerpickChord(rawMidi, time, measureSecs, pattern, bpm);
        } else {
            const pattern = STRUM_PATTERNS[this.strumPattern] || STRUM_PATTERNS.simple;
            const strums = pattern.strums;
            const strumCount = strums.length;

            // Pre-calculate strum beat positions for duration calculation
            const beatPositions = strums.map(s => s.beat);

            strums.forEach((strum, si) => {
                // Groove timing: push/pull based on beat position
                const groove = this._grooveOffset(strum.beat);
                const strumTime = time + strum.beat * measureSecs + groove;

                // Duration: ring until just before the next strum (no dead air)
                let dur;
                if (strum.mute) {
                    dur = 0.04;
                } else if (strum.staccato) {
                    dur = 0.12;
                } else {
                    const nextBeat = si < strumCount - 1
                        ? beatPositions[si + 1]
                        : 1.0;  // end of measure
                    const gapSecs = (nextBeat - strum.beat) * measureSecs;
                    // Ring for ~75% of the gap — leaves natural decay tail
                    dur = Math.max(gapSecs * 0.75, 0.12);
                }

                // Pass beat and index info for velocity accent in strumChord
                const strumDef = {
                    ...strum,
                    beat: strum.beat,
                    _index: si,
                    _total: strumCount
                };

                this.strumChord(chord.midiNotes, strumTime, dur, strumDef);
            });
        }

        // Update progress
        this._updateProgress(this.currentStep + 1, this._playbackStepCount);

        this.currentStep = (this.currentStep + 1) % this.sequence.length;
    }

    _updateProgress(current, total) {
        const bar = document.getElementById('progress-bar');
        const text = document.getElementById('progress-text');
        if (bar) bar.style.width = total > 0 ? ((current / total) * 100) + '%' : '0%';
        if (text) text.textContent = `${current} / ${total}`;
    }

    stopPlayback() {
        this.isPlaying = false;
        this._playbackSession++;

        // Stop transport immediately
        Tone.Transport.stop();
        Tone.Transport.cancel();

        // Mute all audio instantly so lingering notes are silenced
        this._muteAudio();

        const playBtn = document.getElementById('btn-play');
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i> Reproducir';
        playBtn.classList.add('btn-primary');
        playBtn.classList.remove('btn-danger');

        document.querySelectorAll('.chord-box').forEach(b => b.classList.remove('playing'));

        document.getElementById('playback-progress').classList.add('hidden');
    }

    // ─── Save / Load ───
    getSongData() {
        return {
            id: this.currentSongId || generateId(),
            author: Auth.getUsername() || '',
            title: document.getElementById('song-title')?.value?.trim() || 'Sin título',
            artist: document.getElementById('song-artist')?.value?.trim() || '',
            genre: document.getElementById('song-genre')?.value || '',
            key: document.getElementById('song-key')?.value || '',
            bpm: parseInt(this.bpmInput.value) || 90,
            strumPattern: this.strumPattern,
            playMode: this.playMode,
            pickingPattern: this.pickingPattern,
            lyrics: document.getElementById('song-lyrics')?.value || '',
            chords: this.sequence.map(c => ({
                id: c.id,
                displayName: c.displayName,
                tonalParsingName: c.tonalParsingName,
                dbData: c.dbData,
                midiNotes: c.midiNotes
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    async _saveToSupabase(data) {
        const sb = getSupabase ? getSupabase() : null;
        if (!sb) return false;
        try {
            const userId = await Auth.getUserId();
            if (!userId) return false;
            const supabaseRecord = {
                title: data.title,
                author: data.author,
                artist: data.artist,
                genre: data.genre,
                key: data.key,
                bpm: data.bpm,
                strum_pattern: data.strumPattern,
                play_mode: data.playMode || 'strum',
                picking_pattern: data.pickingPattern || 'arpegio_up',
                lyrics: data.lyrics,
                chords: data.chords
            };

            // Check if the song already exists in Supabase
            const { data: existing } = await sb.from('songs')
                .select('id')
                .eq('id', data.id)
                .maybeSingle();

            if (existing) {
                const { error } = await sb.from('songs')
                    .update(supabaseRecord)
                    .eq('id', data.id)
                    .eq('user_id', userId);
                if (error) {
                    console.warn('Supabase save error:', error);
                    return false;
                }
            } else {
                // Don't pass id so Supabase generates a proper UUID
                const { data: inserted, error } = await sb.from('songs')
                    .insert({ ...supabaseRecord, user_id: userId })
                    .select('id')
                    .single();
                if (error) {
                    console.warn('Supabase insert error:', error);
                    return false;
                }
                if (inserted) {
                    data.id = inserted.id;
                    this.currentSongId = inserted.id;
                }
            }
            return true;
        } catch (e) {
            console.warn('Supabase save failed:', e);
            return false;
        }
    }

    async saveSong() {
        const data = this.getSongData();

        const idx = this.savedSongs.findIndex(s => s.id === data.id);
        if (idx >= 0) {
            data.createdAt = this.savedSongs[idx].createdAt;
            this.savedSongs[idx] = data;
        } else {
            this.currentSongId = data.id;
            this.savedSongs.push(data);
        }

        const saved = await this._saveToSupabase(data);
        this._persistLibrary();
        this._updateLibraryBadge();
        this._markClean();
        if (saved) {
            this._feedback('¡Canción subida!');
        } else {
            this._feedback('Guardada localmente (sin conexión a Supabase)');
        }
    }

    loadSong(id) {
        const data = this.savedSongs.find(s => s.id === id);
        if (!data) return;

        this.stopPlayback();
        this.currentSongId = data.id;
        this.sequence = [];

        // Restore metadata
        const titleEl = document.getElementById('song-title');
        const artistEl = document.getElementById('song-artist');
        const genreEl = document.getElementById('song-genre');
        const keyEl = document.getElementById('song-key');
        const lyricsEl = document.getElementById('song-lyrics');

        if (titleEl) titleEl.value = data.title || '';
        if (artistEl) artistEl.value = data.artist || '';
        if (genreEl) genreEl.value = data.genre || '';
        if (keyEl) keyEl.value = data.key || '';
        if (lyricsEl) lyricsEl.value = data.lyrics || '';
        this.bpmInput.value = data.bpm || 90;
        Tone.Transport.bpm.value = data.bpm || 90;

        // Restore strum/picking pattern
        if (data.playMode === 'picking' && data.pickingPattern) {
            this.setPickingPattern(data.pickingPattern);
        } else if (data.strumPattern) {
            this.setStrumPattern(data.strumPattern);
        }

        // Restore chords
        this.composerArea.innerHTML = '';
        if (data.chords?.length > 0) {
            data.chords.forEach(c => {
                this.sequence.push({
                    id: c.id,
                    displayName: c.displayName,
                    tonalParsingName: c.tonalParsingName,
                    midiNotes: c.midiNotes,
                    dbData: c.dbData
                });
                const block = this._createChordBlock(
                    c.id, c.displayName, c.dbData, c.midiNotes, c.tonalParsingName
                );
                this.composerArea.appendChild(block);
            });
        } else {
            this._showEmptyState();
        }

        this._markClean();
        this.closeLibrary();
        this._feedback('¡Canción cargada!');
    }

    async _deleteFromSupabase(id) {
        const sb = getSupabase ? getSupabase() : null;
        if (!sb) return;
        try {
            const userId = await Auth.getUserId();
            if (userId) await sb.from('songs').delete().eq('id', id).eq('user_id', userId);
        } catch (e) {}
    }

    async deleteSong(id) {
        if (!confirm('¿Eliminar esta canción permanentemente?')) return;
        await this._deleteFromSupabase(id);
        this.savedSongs = this.savedSongs.filter(s => s.id !== id);
        if (this.currentSongId === id) {
            this.currentSongId = null;
        }
        this._persistLibrary();
        this._updateLibraryBadge();
        this.renderLibrary();
    }

    // ─── Library ───
    async _loadFromSupabase() {
        const sb = getSupabase ? getSupabase() : null;
        if (!sb) return null;
        try {
            const userId = await Auth.getUserId();
            if (!userId) return null;
            const { data, error } = await sb.from('songs')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });
            if (!error && data) {
                return data.map(s => ({
                    id: s.id,
                    author: s.author || '',
                    title: s.title,
                    artist: s.artist,
                    genre: s.genre,
                    key: s.key,
                    bpm: s.bpm,
                    strumPattern: s.strum_pattern,
                    playMode: s.play_mode || 'strum',
                    pickingPattern: s.picking_pattern || 'arpegio_up',
                    lyrics: s.lyrics,
                    chords: s.chords || [],
                    createdAt: s.created_at,
                    updatedAt: s.updated_at
                }));
            }
        } catch (e) {}
        return null;
    }

    async loadLibrary() {
        const sbSongs = await this._loadFromSupabase();
        if (sbSongs) {
            this.savedSongs = sbSongs;
        } else {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    this.savedSongs = JSON.parse(raw);
                    if (!Array.isArray(this.savedSongs)) this.savedSongs = [];
                }
            } catch (e) {
                this.savedSongs = [];
            }
        }
        this._updateLibraryBadge();
    }

    _persistLibrary() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.savedSongs));
        } catch (e) {
            console.warn('Could not save to localStorage', e);
        }
        this._updateLibraryBadge();
    }

    _updateLibraryBadge() {
        const badge = document.getElementById('library-count');
        if (badge) badge.textContent = this.savedSongs.length;
    }

    openLibrary() {
        this.renderLibrary();
        document.getElementById('library-modal').classList.remove('hidden');
    }

    closeLibrary() {
        document.getElementById('library-modal').classList.add('hidden');
    }

    renderLibrary() {
        const grid = document.getElementById('library-grid');
        const filter = document.getElementById('library-filter')?.value?.toLowerCase() || '';
        grid.innerHTML = '';

        const filtered = this.savedSongs.filter(s => {
            if (!filter) return true;
            return (s.title?.toLowerCase().includes(filter) ||
                    s.artist?.toLowerCase().includes(filter));
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-music"></i>
                    <p>${this.savedSongs.length === 0 ? 'No hay canciones guardadas aún.' : 'No hay canciones que coincidan.'}</p>
                </div>`;
            return;
        }

        filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        filtered.forEach(song => {
            const card = document.createElement('div');
            card.className = 'library-card';

            const title = document.createElement('div');
            title.className = 'library-card-title';
            title.textContent = song.title || 'Sin título';

            const artist = document.createElement('div');
            artist.className = 'library-card-artist';
            artist.textContent = song.artist || 'Artista desconocido';

            const meta = document.createElement('div');
            meta.className = 'library-card-meta';
            if (song.genre) {
                const tag = document.createElement('span');
                tag.className = 'library-card-tag';
                tag.textContent = song.genre;
                meta.appendChild(tag);
            }
            if (song.key) {
                const tag = document.createElement('span');
                tag.className = 'library-card-tag';
                tag.textContent = song.key;
                meta.appendChild(tag);
            }
            const chordCount = song.chords?.length || 0;
            if (chordCount > 0) {
                const tag = document.createElement('span');
                tag.className = 'library-card-tag';
                tag.textContent = chordCount + (chordCount === 1 ? ' acorde' : ' acordes');
                meta.appendChild(tag);
            }

            const actions = document.createElement('div');
            actions.className = 'library-card-actions';

            const loadBtn = document.createElement('button');
            loadBtn.className = 'btn btn-sm btn-primary';
            loadBtn.innerHTML = '<i class="fa-solid fa-folder-open"></i> Cargar';
            loadBtn.onclick = (e) => { e.stopPropagation(); this.loadSong(song.id); };

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger';
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            deleteBtn.onclick = async (e) => { e.stopPropagation(); await this.deleteSong(song.id); };

            actions.appendChild(loadBtn);
            actions.appendChild(deleteBtn);

            card.appendChild(title);
            card.appendChild(artist);
            card.appendChild(meta);
            card.appendChild(actions);

            card.onclick = () => this.loadSong(song.id);
            grid.appendChild(card);
        });
    }

    // ─── Export / Import JSON ───
    exportJSON() {
        const data = this.getSongData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (data.title || 'untitled').toLowerCase().replace(/\s+/g, '-') + '-chords.json';
        a.click();
        URL.revokeObjectURL(url);
        this._feedback('¡JSON exportado!');
    }

    importJSON(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data.chords) throw new Error('Invalid song file');

                // Generate new ID to avoid overwriting
                data.id = generateId();
                data.updatedAt = new Date().toISOString();

                this.savedSongs.push(data);
                this._persistLibrary();

                this.loadSong(data.id);
                this._feedback('¡Canción importada!');
            } catch (err) {
                alert('Formato de archivo inválido.');
                console.error(err);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    // ─── PDF Export ───
    async exportPDF() {
        const titleText = document.getElementById('song-title')?.value?.trim() || 'Canción sin título';
        const artistText = document.getElementById('song-artist')?.value?.trim() || 'Artista desconocido';
        const lyricsText = document.getElementById('song-lyrics')?.value || '';

        const opt = {
            margin: 0.5,
            filename: `${titleText.toLowerCase().replace(/\s+/g, '-')}-chords.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        const printContainer = document.createElement('div');
        printContainer.style.padding = '20px';
        printContainer.style.background = '#ffffff';
        printContainer.style.color = '#000000';
        printContainer.style.fontFamily = 'Outfit, sans-serif';

        // Header
        const header = document.createElement('div');
        header.style.marginBottom = '20px';
        header.innerHTML = `
            <h1 style="margin:0 0 5px 0; line-height:1.1;">
                <span style="font-size:2.5rem; font-weight:800; color:#000;">${titleText}</span>
                <span style="font-size:1.8rem; font-weight:300; color:#666;"> por ${artistText}</span>
            </h1>
            <div style="color:#999; font-size:0.9rem; margin-top:5px;">
                ${document.getElementById('song-genre')?.value || ''}${document.getElementById('song-genre')?.value && document.getElementById('song-key')?.value ? ' · ' : ''}${document.getElementById('song-key')?.value || ''}
            </div>
        `;
        printContainer.appendChild(header);

        // Lyrics with chords
        if (lyricsText.trim().length > 0) {
            const lyricsDiv = document.createElement('div');
            lyricsDiv.style.fontFamily = "'Courier New', monospace";
            lyricsDiv.style.fontSize = '13px';
            lyricsDiv.style.lineHeight = '1.8';
            lyricsDiv.style.marginBottom = '30px';
            lyricsDiv.style.whiteSpace = 'pre-wrap';

            lyricsText.split('\n').forEach(line => {
                const lineEl = document.createElement('div');
                if (line.includes('[')) lineEl.style.paddingTop = '1.2em';
                lineEl.style.minHeight = '1.3em';
                lineEl.innerHTML = line.replace(/\[([^\]]+)\]/g,
                    `<span style="position:relative; top:-1.3em; display:inline-block; width:0; overflow:visible; font-weight:bold; font-size:14px; color:#000;">$1</span>`) || ' ';
                lyricsDiv.appendChild(lineEl);
            });
            printContainer.appendChild(lyricsDiv);
        }

        // Chords grid
        const uniqueMap = new Map();
        this.sequence.forEach(c => {
            if (!uniqueMap.has(c.displayName)) uniqueMap.set(c.displayName, c);
        });
        const uniqueChords = Array.from(uniqueMap.values());

        if (uniqueChords.length > 0) {
            const gridTitle = document.createElement('h3');
            gridTitle.textContent = 'Acordes';
            gridTitle.style.marginBottom = '15px';
            gridTitle.style.borderTop = '1px solid #ccc';
            gridTitle.style.paddingTop = '15px';
            gridTitle.style.fontSize = '1.2rem';
            gridTitle.style.color = '#333';
            printContainer.appendChild(gridTitle);

            const grid = document.createElement('div');
            grid.style.display = 'flex';
            grid.style.flexWrap = 'wrap';
            grid.style.gap = '20px';

            uniqueChords.forEach(cData => {
                const { displayName, dbData } = cData;
                const block = document.createElement('div');
                block.style.display = 'flex';
                block.style.flexDirection = 'column';
                block.style.alignItems = 'center';
                block.style.width = '70px';

                const nameEl = document.createElement('div');
                nameEl.style.fontWeight = 'bold';
                nameEl.style.fontSize = '1.1rem';
                nameEl.style.marginBottom = '5px';
                nameEl.textContent = displayName;
                block.appendChild(nameEl);

                const diagramContainer = document.createElement('div');
                diagramContainer.style.width = '70px';
                diagramContainer.style.height = '100px';

                block.appendChild(diagramContainer);

                if (dbData?.positions?.[0]) {
                    this._drawPDFDiagram(diagramContainer, dbData.positions[0]);
                }

                grid.appendChild(block);
            });
            printContainer.appendChild(grid);
        }

        // Render to PDF
        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.top = '0';
        wrapper.style.left = '0';
        wrapper.style.width = '100vw';
        wrapper.style.minHeight = '100vh';
        wrapper.style.background = '#ffffff';
        wrapper.style.zIndex = '999999';
        wrapper.style.overflow = 'auto';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'center';

        const loading = document.createElement('h2');
        loading.textContent = 'Generando PDF...';
        loading.style.marginTop = '40px';
        loading.style.fontFamily = 'Outfit, sans-serif';
        loading.style.color = '#000';
        wrapper.appendChild(loading);
        wrapper.appendChild(printContainer);
        document.body.appendChild(wrapper);
        window.scrollTo(0, 0);

        await new Promise(r => setTimeout(r, 800));

        // Convert SVGs
        const svgs = printContainer.querySelectorAll('svg');
        await Promise.all(Array.from(svgs).map(svg => {
            return new Promise(resolve => {
                const canvas = document.createElement('canvas');
                canvas.width = 140;
                canvas.height = 200;
                if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                svg.setAttribute('width', '70');
                svg.setAttribute('height', '100');

                const data = new XMLSerializer().serializeToString(svg);
                const encoded = btoa(unescape(encodeURIComponent(data)));
                const img = new Image();
                img.onload = () => {
                    canvas.getContext('2d').drawImage(img, 0, 0, 140, 200);
                    const newImg = document.createElement('img');
                    newImg.src = canvas.toDataURL('image/png');
                    newImg.style.width = '100%';
                    newImg.style.height = '100%';
                    svg.parentNode.replaceChild(newImg, svg);
                    resolve();
                };
                img.onerror = () => resolve();
                img.src = 'data:image/svg+xml;base64,' + encoded;
            });
        }));

        try {
            await html2pdf().set(opt).from(printContainer).save();
        } catch (err) {
            console.error('PDF error:', err);
        } finally {
            document.body.removeChild(wrapper);
        }
    }

    _drawPDFDiagram(container, pos) {
        const frets = pos.frets;
        const fingers = pos.fingers;
        const svgFingers = [];
        let barreItems = [];

        for (let i = 0; i < 6; i++) {
            const fret = frets[i];
            const stringNum = 6 - i;
            let fingerText;
            if (fingers?.length > i) {
                const f = fingers[i];
                if (f && f !== '0' && f !== 0 && f !== '-') fingerText = String(f);
            }
            let fp;
            if (typeof fret === 'number') fp = fret === -1 ? 'x' : fret;
            else if (typeof fret === 'string') fp = fret.toLowerCase() === 'x' ? 'x' : parseInt(fret, 16);
            if (fp === 'x') svgFingers.push([stringNum, 'x']);
            else if (fp === 0) svgFingers.push([stringNum, 0]);
            else if (fp > 0) svgFingers.push(fingerText ? [stringNum, fp, fingerText] : [stringNum, fp]);
        }
        if (pos.barres?.length) {
            pos.barres.forEach(f => barreItems.push({ fromString: 6, toString: 1, fret: f }));
        }

        const validFrets = pos.frets.filter(f => typeof f === 'number' && f > 0);
        const minFret = validFrets.length > 0 ? Math.min(...validFrets) : 1;
        const actualStartFret = pos.baseFret + minFret - 1;
        const svgPos = actualStartFret >= 1 ? actualStartFret : 1;

        try {
            new svguitar.SVGuitarChord(container)
                .configure({
                    color: '#000000',
                    frets: 5,
                    strings: 6,
                    fretSize: 1.5,
                    fretWidth: 1.5,
                    position: svgPos,
                    style: 'normal'
                })
                .chord({ fingers: svgFingers, barres: barreItems })
                .draw();
        } catch (err) {
            console.warn('PDF diagram error', err);
        }
    }

    // ─── Dirty Tracking ───
    _markDirty() {
        // Could visually mark unsaved changes in future
    }

    _markClean() {}

    _feedback(msg) {
        // Show a brief toast-like message
        const el = document.getElementById('db-status');
        if (el) {
            const orig = el.textContent;
            el.textContent = '✓ ' + msg;
            el.style.color = 'var(--success)';
            setTimeout(() => {
                el.textContent = orig;
                el.style.color = '';
            }, 2000);
        }
    }
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    window.composer = new ChordComposer();
});
