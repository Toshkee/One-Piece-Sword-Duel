/**
 * Procedural sound — every effect is synthesised at runtime with the Web Audio
 * API instead of shipping audio files. That sidesteps all sample-licensing
 * questions, keeps the bundle tiny, and lets the "feel" of a hit be tuned in
 * code. The ambient music bed is a slow, randomised minor-key arpeggio.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private _muted = false;
  private _musicOn = false;
  private musicTimer: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  /** Must be called from a user gesture (browsers block audio otherwise). */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this._muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.0;
    this.musicGain.connect(this.master);
    this.noiseBuffer = this.makeNoiseBuffer();
  }

  get muted(): boolean {
    return this._muted;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this.master) this.master.gain.value = this._muted ? 0 : 0.9;
    return this._muted;
  }

  // ---- One-shot SFX ----------------------------------------------------

  /** Whoosh of a swing that hits nothing. */
  swing(): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.18);
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    src.stop(ctx.currentTime + 0.22);
  }

  /** Meaty impact on a connecting hit; `power` 0..1 scales the bass thump. */
  hit(power = 1): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    // Bass thump
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180 + 60 * power, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.18);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.6 * power + 0.25, t + 0.01);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(og).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.27);
    // Noise "crack"
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1200;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.4, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      src.connect(hp).connect(ng).connect(this.master);
      src.start(t);
      src.stop(t + 0.1);
    }
  }

  /** Metallic ring when an attack is blocked. */
  block(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    [2400, 3200, 4100].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18 - i * 0.03);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  jump(): void {
    this.blip(420, 760, 0.12, 'triangle', 0.18);
  }

  land(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  uiClick(): void {
    this.blip(660, 880, 0.06, 'square', 0.12);
  }

  roundStart(): void {
    this.blip(523, 784, 0.25, 'sawtooth', 0.18);
  }

  /** Descending KO stinger. */
  ko(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1600;
    osc.connect(lp).connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.85);
    this.hit(1);
  }

  // ---- Ambient music bed ----------------------------------------------

  get musicOn(): boolean {
    return this._musicOn;
  }

  toggleMusic(): boolean {
    if (!this.ctx) return false;
    this._musicOn = !this._musicOn;
    if (this._musicOn) this.startMusic();
    else this.stopMusic();
    return this._musicOn;
  }

  private startMusic(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.musicGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.5);
    // A wandering minor pentatonic so it never resolves into something annoying.
    const scale = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
    let step = 0;
    const playNote = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Deterministic-ish wander (no Math.random dependency for the melody shape).
      step = (step * 3 + 2) % scale.length;
      const freq = scale[step] / (step % 2 === 0 ? 2 : 1);
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.5, now + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      osc.connect(g).connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 1.9);
    };
    playNote();
    this.musicTimer = window.setInterval(playNote, 900);
  }

  private stopMusic(): void {
    if (this.ctx) this.musicGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // ---- helpers ---------------------------------------------------------

  private blip(from: number, to: number, dur: number, type: OscillatorType, vol: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private makeNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < len; i++) {
      // Deterministic LCG noise (avoids Math.random, reproducible).
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x3fffffff - 1) * 0.8;
    }
    return buffer;
  }
}

/** Single shared instance — the game only ever needs one audio graph. */
export const sound = new SoundManager();
