// Music and sound effects, all generated with the Web Audio API
// (no sound files needed). Browsers only allow audio after the player
// presses a key or clicks, so call `unlock()` from an input event.

const midiToHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

// --- Songs -----------------------------------------------------------------
// One step = an 8th note. `lead` and `bass` are MIDI note numbers (null = rest).
// Drums: k = kick, s = snare, h = hi-hat.
const SONGS = {
  forest: {
    bpm: 116,
    lead: [
      69, null, 72, 74, 76, null, 74, 72,
      72, null, 69, null, 65, 67, 69, null,
      67, null, 72, null, 76, 74, 72, 71,
      71, null, 67, null, 74, null, 71, null,
    ],
    bass: chords([45, 41, 48, 43], (r) => [r, r, r + 12, r, r, r, r + 12, r]),
    drums: repeat(['kh', 'h', 'sh', 'h', 'kh', 'kh', 'sh', 'h'], 4),
  },
  // Japanese-sounding "in" scale for the Sushi Mountains
  sushi: {
    bpm: 126,
    lead: [
      76, null, 77, 76, 74, null, 70, 69,
      70, null, 74, null, 76, 77, 76, null,
      81, null, 77, 76, 74, null, 76, null,
      74, 70, 69, null, 69, null, null, null,
    ],
    bass: chords([45, 41, 38, 40], (r) => [r, null, r + 12, null, r + 7, null, r + 12, r]),
    drums: repeat(['kh', 'h', 'h', 'sh', 'kh', 'h', 'sh', 'h'], 4),
  },
  boss: {
    bpm: 150,
    lead: [
      76, 75, 76, null, 71, null, 67, null,
      72, 71, 72, null, 67, null, 64, null,
      74, 73, 74, null, 69, null, 66, null,
      71, null, 75, null, 78, null, 75, 71,
    ],
    bass: chords([40, 36, 38, 35], (r) => [r, r + 12, r, r + 12, r, r + 12, r, r + 12]),
    drums: repeat(['kh', 'h', 'ksh', 'h', 'kh', 'kh', 'ksh', 'h'], 4),
  },
};

function chords(roots, pattern) {
  return roots.flatMap(pattern);
}
function repeat(list, times) {
  return Array.from({ length: times }, () => list).flat();
}

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.song = null;
  }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.gain(this.ctx.destination, 0.6);
      this.music = this.gain(this.master, 0.35);
      this.sfx = this.gain(this.master, 0.8);
      // White noise buffer, reused for hits, fire, drums...
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      setInterval(() => this.schedule(), 25);
      this.restartSong();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.6;
    return this.muted;
  }

  // --- Building blocks -----------------------------------------------------
  gain(dest, value) {
    const g = this.ctx.createGain();
    g.gain.value = value;
    g.connect(dest);
    return g;
  }

  // A beep: oscillator with a pitch slide and a fade-out.
  tone({ freq, to = freq, dur = 0.1, type = 'square', vol = 0.2, at = this.ctx.currentTime, out = this.sfx }) {
    const o = this.ctx.createOscillator();
    const g = this.gain(out, vol);
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, to), at + dur);
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(g);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  // A burst of filtered noise: hits, whooshes, fire, explosions.
  noise({ dur = 0.1, vol = 0.3, filter = 'lowpass', freq = 1000, to = freq, at = this.ctx.currentTime, out = this.sfx }) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, at);
    f.frequency.exponentialRampToValueAtTime(Math.max(1, to), at + dur);
    const g = this.gain(out, vol);
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    src.connect(f).connect(g);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.02);
  }

  // --- Sound effects -------------------------------------------------------
  play(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'swing': this.noise({ dur: 0.09, vol: 0.15, filter: 'highpass', freq: 2500, to: 5000 }); break;
      case 'charge': this.noise({ dur: 0.3, vol: 0.25, filter: 'lowpass', freq: 300, to: 1200 }); break;
      case 'spin':
        for (let i = 0; i < 3; i++) this.noise({ dur: 0.08, vol: 0.15, filter: 'highpass', freq: 2500, to: 5000, at: t + i * 0.1 });
        break;
      case 'fire':
        this.noise({ dur: 0.35, vol: 0.3, filter: 'bandpass', freq: 400, to: 1800 });
        this.tone({ freq: 150, to: 300, dur: 0.25, type: 'sawtooth', vol: 0.06 });
        break;
      case 'arrow':
        this.tone({ freq: 700, to: 1500, dur: 0.12, type: 'triangle', vol: 0.12 });
        this.noise({ dur: 0.1, vol: 0.1, filter: 'highpass', freq: 4000 });
        break;
      case 'missile':
        this.tone({ freq: 200, to: 700, dur: 0.4, type: 'sawtooth', vol: 0.08 });
        this.noise({ dur: 0.5, vol: 0.2, filter: 'bandpass', freq: 600, to: 300 });
        break;
      case 'ghost':
        this.tone({ freq: 700, to: 350, dur: 0.35, type: 'sine', vol: 0.12 });
        this.tone({ freq: 710, to: 355, dur: 0.35, type: 'sine', vol: 0.12 });
        this.noise({ dur: 0.3, vol: 0.12, filter: 'highpass', freq: 3000, to: 1500 });
        break;
      case 'secret':
        [62, 65, 69, 73, 74].forEach((n, i) => this.tone({ freq: midiToHz(n + 12), dur: 0.25, type: 'sine', vol: 0.15, at: t + i * 0.09 }));
        this.tone({ freq: 400, to: 1600, dur: 0.6, type: 'triangle', vol: 0.05 });
        break;
      case 'bow':
        [72, 67, 64].forEach((n, i) => this.tone({ freq: midiToHz(n), dur: 0.4, type: 'sine', vol: 0.15, at: t + i * 0.18 }));
        break;
      case 'gulp':
        this.tone({ freq: 500, to: 150, dur: 0.15, type: 'sine', vol: 0.3 });
        this.tone({ freq: 300, to: 700, dur: 0.1, type: 'sine', vol: 0.15, at: t + 0.12 });
        break;
      case 'clang':
        this.tone({ freq: 2200, to: 1800, dur: 0.12, type: 'triangle', vol: 0.12 });
        this.noise({ dur: 0.08, vol: 0.12, filter: 'highpass', freq: 3000 });
        break;
      case 'energy':
        this.tone({ freq: 300, to: 1200, dur: 0.4, type: 'sawtooth', vol: 0.07 });
        this.tone({ freq: 600, to: 2400, dur: 0.4, type: 'sine', vol: 0.08 });
        break;
      case 'crash':
        this.noise({ dur: 0.3, vol: 0.5, filter: 'lowpass', freq: 1800, to: 200 });
        this.tone({ freq: 140, to: 60, dur: 0.2, type: 'square', vol: 0.12 });
        this.noise({ dur: 0.4, vol: 0.15, filter: 'bandpass', freq: 500, at: t + 0.1 });
        break;
      case 'slip':
        this.tone({ freq: 900, to: 200, dur: 0.35, type: 'sine', vol: 0.15 });
        this.noise({ dur: 0.2, vol: 0.3, filter: 'lowpass', freq: 500, to: 100, at: t + 0.3 });
        break;
      case 'heal':
        [64, 67, 71, 76].forEach((n, i) => this.tone({ freq: midiToHz(n + 12), dur: 0.15, type: 'triangle', vol: 0.12, at: t + i * 0.06 }));
        break;
      case 'heavy': this.noise({ dur: 0.25, vol: 0.3, filter: 'lowpass', freq: 600, to: 150 }); break;
      case 'ice':
        [1800, 2400, 3000].forEach((f, i) => this.tone({ freq: f, to: f * 0.7, dur: 0.12, type: 'sine', vol: 0.08, at: t + i * 0.04 }));
        this.noise({ dur: 0.2, vol: 0.15, filter: 'highpass', freq: 5000 });
        break;
      case 'hit':
        this.noise({ dur: 0.12, vol: 0.45, filter: 'lowpass', freq: 2500, to: 300 });
        this.tone({ freq: 160, to: 50, dur: 0.12, type: 'square', vol: 0.15 });
        break;
      case 'hurt':
        this.noise({ dur: 0.15, vol: 0.4, filter: 'lowpass', freq: 1500, to: 200 });
        this.tone({ freq: 300, to: 90, dur: 0.2, type: 'square', vol: 0.15 });
        break;
      case 'block':
        this.tone({ freq: 1400, dur: 0.15, type: 'triangle', vol: 0.2 });
        this.tone({ freq: 2100, dur: 0.1, type: 'sine', vol: 0.12 });
        break;
      case 'ko':
        this.tone({ freq: 500, to: 60, dur: 0.5, type: 'sawtooth', vol: 0.15 });
        this.noise({ dur: 0.4, vol: 0.3, filter: 'lowpass', freq: 800, to: 100 });
        break;
      case 'jump': this.tone({ freq: 250, to: 600, dur: 0.12, type: 'square', vol: 0.08 }); break;
      case 'rumble':
        this.noise({ dur: 1.0, vol: 0.6, filter: 'lowpass', freq: 250, to: 60 });
        this.tone({ freq: 55, to: 35, dur: 0.9, type: 'sawtooth', vol: 0.15 });
        break;
      case 'select': this.tone({ freq: 660, dur: 0.06, type: 'square', vol: 0.08 }); break;
      case 'start':
        [60, 64, 67, 72].forEach((n, i) => this.tone({ freq: midiToHz(n + 12), dur: 0.12, vol: 0.1, at: t + i * 0.07 }));
        break;
      case 'win':
        [72, 76, 79, 84, 79, 84].forEach((n, i) => this.tone({ freq: midiToHz(n), dur: 0.2, vol: 0.12, at: t + i * 0.13 }));
        break;
      case 'lose':
        [67, 63, 60, 55].forEach((n, i) => this.tone({ freq: midiToHz(n), dur: 0.35, type: 'triangle', vol: 0.18, at: t + i * 0.3 }));
        break;
    }
  }

  // --- Music ---------------------------------------------------------------
  playMusic(name) {
    if (this.song === name) return;
    this.song = name;
    this.restartSong();
  }

  restartSong() {
    this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.1;
  }

  // Schedules notes slightly ahead of time so the music never stutters.
  schedule() {
    const song = SONGS[this.song];
    if (!this.ctx || !song) return;
    const stepDur = 60 / song.bpm / 2;
    if (this.nextTime < this.ctx.currentTime) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const i = this.step % song.lead.length;
      const at = this.nextTime;
      const out = this.music;
      if (song.lead[i] != null) this.tone({ freq: midiToHz(song.lead[i]), dur: stepDur * 0.9, vol: 0.09, at, out });
      if (song.bass[i] != null) this.tone({ freq: midiToHz(song.bass[i]), dur: stepDur * 0.8, type: 'triangle', vol: 0.3, at, out });
      const d = song.drums[i] ?? '';
      if (d.includes('k')) this.tone({ freq: 150, to: 40, dur: 0.15, type: 'sine', vol: 0.5, at, out });
      if (d.includes('s')) this.noise({ dur: 0.12, vol: 0.25, filter: 'highpass', freq: 1200, at, out });
      if (d.includes('h')) this.noise({ dur: 0.03, vol: 0.08, filter: 'highpass', freq: 7000, at, out });
      this.nextTime += stepDur;
      this.step++;
    }
  }
}
