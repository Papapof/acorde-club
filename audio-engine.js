// ─── Shared Audio Engine ───

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

const PICKING_PATTERNS = {
    arpegio_up:    { type: 'picking', label: 'Arpeg. ↑',   icon: '↗',  beats: [[0], [1], [2], [3], [4], [5]] },
    arpegio_down:  { type: 'picking', label: 'Arpeg. ↓',   icon: '↙',  beats: [[5], [4], [3], [2], [1], [0]] },
    arpegio_fast:  { type: 'picking', label: 'Arpeg. Ráp.', icon: '⚡↗', beats: [[0, 1], [2, 3], [4, 5]] },
    travis:        { type: 'picking', label: 'Travis',     icon: 'B↓↑↓', beats: [[0], [2, 3], [1], [4, 5]] },
    waltz_pick:    { type: 'picking', label: 'Vals Pun. ',  icon: 'B··', beats: [[0, 1], [2, 3], [4, 5]] },
    pinchado:      { type: 'picking', label: 'Pinchado',   icon: 'B+↓', beats: [[0, 4, 5], [1, 2, 3]] },
    folk_pick:     { type: 'picking', label: 'Folk Pun.',   icon: 'B↗B↗', beats: [[0], [2, 3], [1], [4, 5]] }
};

function grooveOffset(beat) {
    const beatNorm = ((beat % 1) + 1) % 1;
    let offset = 0;
    if (beatNorm < 0.01 || Math.abs(beatNorm - 0.5) < 0.01) {
        offset = -0.004 + Math.random() * 0.004;
    } else if (Math.abs(beatNorm - 0.25) < 0.01 || Math.abs(beatNorm - 0.75) < 0.01) {
        offset = 0.006 + Math.random() * 0.010;
    } else {
        offset = (Math.random() * 0.008) - 0.004;
    }
    return offset;
}

function strumChordOn(guitar, midiNotes, baseTime, noteDuration = 1.5, strumDef = {}) {
    if (!guitar || !midiNotes?.length) return;
    const ac = Tone.getContext().rawContext;
    const base = baseTime != null ? baseTime : ac.currentTime;
    const isUp = strumDef.dir === 'up';
    const isMute = strumDef.mute;
    const isStaccato = strumDef.staccato;
    const beat = strumDef.beat !== undefined ? strumDef.beat : 0;
    const count = midiNotes.length;
    if (!count) return;

    const totalSweep = isUp ? 0.055 : 0.085;
    const strumEnergy = 0.75 + Math.random() * 0.6;
    const beatNorm = ((beat % 1) + 1) % 1;
    const isDownbeat = beatNorm < 0.01 || Math.abs(beatNorm - 0.5) < 0.01;
    const isOffbeat = Math.abs(beatNorm - 0.25) < 0.01 || Math.abs(beatNorm - 0.75) < 0.01;
    const beatAccent = isDownbeat ? 1.15 : (isOffbeat ? 0.88 : 1.0);

    for (let i = 0; i < count; i++) {
        const srcIdx = isUp ? count - 1 - i : i;
        const midi = midiNotes[srcIdx];
        if (midi <= 0) continue;
        const noteName = Tone.Frequency(midi, 'midi').toNote();
        const pos = count > 1 ? i / (count - 1) : 0;
        let gain;
        if (isMute) {
            gain = strumEnergy * 0.25;
        } else if (isUp) {
            gain = 0.75 - pos * 0.45;
            if (pos > 0.8) gain += 0.1;
        } else {
            gain = 0.85 - pos * 0.40;
            if (pos > 0.65) gain += 0.08;
        }
        gain *= beatAccent * strumEnergy;
        gain *= 0.7 + Math.random() * 0.6;

        let timeNorm;
        if (isUp) {
            timeNorm = 1 - Math.pow(1 - pos, 1.6);
        } else {
            timeNorm = Math.pow(pos, 0.65);
        }
        const microJitter = Math.random() * 0.004 - 0.002;
        const time = base + timeNorm * totalSweep + microJitter;

        let dur;
        if (isMute) {
            dur = 0.03 + Math.random() * 0.02;
        } else if (isStaccato) {
            dur = 0.10 + Math.random() * 0.06;
        } else {
            const lengthNorm = isUp ? 1 - pos : 1 - pos * 0.6;
            dur = noteDuration * (0.5 + lengthNorm * 0.5) * (0.75 + Math.random() * 0.5);
            dur = Math.max(dur, Math.min(noteDuration * 0.25, 0.12));
        }

        guitar.play(noteName, time, {
            duration: Math.max(dur, 0.03),
            gain: Math.max(gain, 0.08)
        });
    }
}

function fingerpickChordOn(guitar, midiNotes, time, measureSecs, pattern, bpm) {
    if (!guitar || !midiNotes?.length) return;
    const rawMidi = midiNotes;
    const beats = pattern.beats || [];
    if (!beats.length) return;
    const beatCount = beats.length;

    beats.forEach((stringIndices, b) => {
        const beatPos = beatCount > 1 ? b / (beatCount - 1) : 0.5;
        const baseTime = time + beatPos * measureSecs;
        const beatEnergy = 0.7 + Math.random() * 0.4;
        const groove = (Math.random() * 0.006 - 0.003);
        const firstStringTime = baseTime + groove;

        stringIndices.forEach((strIdx, si) => {
            if (strIdx < 0 || strIdx >= rawMidi.length) return;
            const midi = rawMidi[strIdx];
            if (midi <= 0) return;
            const noteName = Tone.Frequency(midi, 'midi').toNote();
            let vel = beatEnergy * (0.6 + Math.random() * 0.5);
            if (strIdx <= 1) vel *= 1.25;
            else if (strIdx >= 4) vel *= 0.85;
            const spread = si * (0.012 + Math.random() * 0.008);
            const humanize = Math.random() * 0.008 - 0.004;
            const durBase = strIdx <= 1 ? 1.2 : 0.5;
            const dur = (durBase + Math.random() * 0.4) * (measureSecs / 2);
            guitar.play(noteName, firstStringTime + spread + humanize, {
                duration: Math.max(dur, 0.12),
                gain: Math.max(vel * 0.55, 0.15)
            });
        });
    });
}

function fallbackPlayNotes(midiNotes, time) {
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

function muteAudioOn(masterGain) {
    if (masterGain) {
        try {
            const now = Tone.getContext().rawContext.currentTime;
            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.setValueAtTime(masterGain.gain.value, now);
            masterGain.gain.linearRampToValueAtTime(0, now + 0.005);
        } catch(e) {}
    }
}

function unmuteAudioOn(masterGain) {
    if (masterGain) {
        try {
            const now = Tone.getContext().rawContext.currentTime;
            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.setValueAtTime(masterGain.gain.value, now);
            masterGain.gain.linearRampToValueAtTime(1, now + 0.02);
        } catch(e) {}
    }
}
