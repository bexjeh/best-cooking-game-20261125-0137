// audio.js — tiny WebAudio bleeps, synthesized live, no sound files.
// Everything is a short oscillator blip so the game stays fully offline.

export class SoundBank {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  ensure() {
    if (!this.context) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
    }
    if (this.context && this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }
  }

  blip(freq, duration, type = 'sine', volume = 0.08) {
    if (this.muted || !this.context) return;
    try {
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (err) {
      // Sound is garnish; a blocked AudioContext must never break play.
    }
  }

  click() { this.blip(520, 0.07, 'triangle', 0.06); }
  stack() { this.blip(340, 0.09, 'triangle', 0.07); this.blip(510, 0.08, 'sine', 0.05); }
  sizzle() { this.blip(180, 0.18, 'sawtooth', 0.03); }
  serve() {
    this.blip(523, 0.1, 'sine', 0.08);
    setTimeout(() => this.blip(659, 0.1, 'sine', 0.08), 90);
    setTimeout(() => this.blip(784, 0.16, 'sine', 0.09), 180);
  }
  error() { this.blip(160, 0.16, 'square', 0.05); }
  walkout() { this.blip(220, 0.25, 'sawtooth', 0.05); }
  bell() { this.blip(880, 0.3, 'sine', 0.07); }
}
